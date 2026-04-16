-- ============================================================
-- BORIS IMMO — Migration 002
-- Messagerie privée, réservations, notifications, vidéos
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- CONVERSATIONS (messagerie privée)
-- ────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id           uuid primary key default gen_random_uuid(),
  bien_id      uuid references public.biens(id) on delete cascade not null,
  proprietaire_id uuid references public.profiles(id) on delete cascade not null,
  locataire_id    uuid references public.profiles(id) on delete cascade not null,
  created_at   timestamptz not null default now(),
  unique (bien_id, locataire_id)
);

create table if not exists public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references public.profiles(id) on delete set null,
  contenu         text not null,
  lu              boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- RÉSERVATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.reservations (
  id              uuid primary key default gen_random_uuid(),
  bien_id         uuid references public.biens(id) on delete cascade not null,
  locataire_id    uuid references public.profiles(id) on delete cascade not null,
  proprietaire_id uuid references public.profiles(id) on delete cascade not null,
  date_debut      date not null,
  date_fin        date not null,
  nb_nuits        int generated always as (date_fin - date_debut) stored,
  prix_total      numeric not null,
  commission      numeric not null,  -- 15% prélevé par la plateforme
  montant_proprio numeric not null,  -- prix_total - commission
  statut          text not null default 'en_attente'
                    check (statut in ('en_attente','confirme','annule','termine')),
  fedapay_transaction_id text,
  fedapay_status         text,
  paiement_effectue      boolean not null default false,
  paiement_at            timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists on_reservation_updated on public.reservations;
create trigger on_reservation_updated
  before update on public.reservations
  for each row execute procedure public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  type       text not null,  -- 'message','reservation','moderation','signalement'
  titre      text not null,
  corps      text,
  lien       text,           -- route interne ex: /mon-espace/messages
  lu         boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifs_user    on public.notifications(user_id);
create index if not exists idx_notifs_non_lus on public.notifications(user_id, lu) where lu = false;

-- ────────────────────────────────────────────────────────────
-- RLS nouvelles tables
-- ────────────────────────────────────────────────────────────
alter table public.conversations         enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.reservations          enable row level security;
alter table public.notifications         enable row level security;

-- Conversations : visible par les deux partis
drop policy if exists "conv_select" on public.conversations;
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_select" on public.conversations
  for select using (auth.uid() = proprietaire_id or auth.uid() = locataire_id);
create policy "conv_insert" on public.conversations
  for insert with check (auth.uid() = locataire_id);

-- Messages de conversation
drop policy if exists "conv_msg_select" on public.conversation_messages;
drop policy if exists "conv_msg_insert" on public.conversation_messages;
create policy "conv_msg_select" on public.conversation_messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.proprietaire_id = auth.uid() or c.locataire_id = auth.uid())
    )
  );
create policy "conv_msg_insert" on public.conversation_messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.proprietaire_id = auth.uid() or c.locataire_id = auth.uid())
    )
  );

-- Réservations
drop policy if exists "resa_select" on public.reservations;
drop policy if exists "resa_insert" on public.reservations;
drop policy if exists "resa_update" on public.reservations;
create policy "resa_select" on public.reservations
  for select using (
    auth.uid() = locataire_id
    or auth.uid() = proprietaire_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "resa_insert" on public.reservations
  for insert with check (auth.uid() = locataire_id);
create policy "resa_update" on public.reservations
  for update using (
    auth.uid() = locataire_id
    or auth.uid() = proprietaire_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Notifications
drop policy if exists "notifs_select" on public.notifications;
drop policy if exists "notifs_update" on public.notifications;
create policy "notifs_select" on public.notifications
  for select using (auth.uid() = user_id);
create policy "notifs_update" on public.notifications
  for update using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- Index supplémentaires
-- ────────────────────────────────────────────────────────────
create index if not exists idx_conv_bien        on public.conversations(bien_id);
create index if not exists idx_conv_proprio     on public.conversations(proprietaire_id);
create index if not exists idx_conv_locataire   on public.conversations(locataire_id);
create index if not exists idx_conv_msg_conv    on public.conversation_messages(conversation_id);
create index if not exists idx_resa_bien        on public.reservations(bien_id);
create index if not exists idx_resa_locataire   on public.reservations(locataire_id);
create index if not exists idx_resa_proprio     on public.reservations(proprietaire_id);
create index if not exists idx_resa_statut      on public.reservations(statut);
