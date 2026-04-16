-- ─── Table avis ──────────────────────────────────────────────────────────────
-- Avis bidirectionnels : locataire → propriétaire ET propriétaire → locataire
-- Déclenchement : quand la réservation est au statut "termine"
create table if not exists public.avis (
  id              uuid primary key default gen_random_uuid(),
  reservation_id  uuid not null references public.reservations(id) on delete cascade,
  bien_id         uuid not null references public.biens(id)        on delete cascade,
  auteur_id       uuid not null references public.profiles(id)     on delete cascade,
  sujet_id        uuid       references public.profiles(id)        on delete cascade,
  type            text       check (type in ('locataire_note_proprio', 'proprio_note_locataire')),
  note            smallint not null check (note between 1 and 5),
  commentaire     text,
  created_at      timestamptz default now(),
  unique(reservation_id, auteur_id)
);

-- Colonnes ajoutées après création initiale de la table (migration idempotente)
alter table public.avis
  add column if not exists sujet_id uuid references public.profiles(id) on delete cascade,
  add column if not exists type     text check (type in ('locataire_note_proprio', 'proprio_note_locataire'));

-- ─── RLS ──────────────────────────────────────────────────────────────────────
alter table public.avis enable row level security;

-- Supprime les policies si elles existent déjà (idempotent)
drop policy if exists "avis_select_public"    on public.avis;
drop policy if exists "avis_insert_locataire" on public.avis;
drop policy if exists "avis_insert_proprio"   on public.avis;
drop policy if exists "avis_update_auteur"    on public.avis;
drop policy if exists "avis_delete_auteur"    on public.avis;

-- Lecture publique
create policy "avis_select_public" on public.avis
  for select using (true);

-- Insertion locataire → propriétaire
create policy "avis_insert_locataire" on public.avis
  for insert with check (
    auth.uid() = auteur_id
    and type = 'locataire_note_proprio'
    and exists (
      select 1 from public.reservations r
      where r.id             = reservation_id
        and r.locataire_id   = auth.uid()
        and r.statut         = 'termine'
        and r.paiement_effectue = true
    )
  );

-- Insertion propriétaire → locataire
create policy "avis_insert_proprio" on public.avis
  for insert with check (
    auth.uid() = auteur_id
    and type = 'proprio_note_locataire'
    and exists (
      select 1 from public.reservations r
      where r.id                = reservation_id
        and r.proprietaire_id   = auth.uid()
        and r.statut            = 'termine'
        and r.paiement_effectue = true
    )
  );

-- Mise à jour : uniquement l'auteur
create policy "avis_update_auteur" on public.avis
  for update using (auth.uid() = auteur_id);

-- Suppression : uniquement l'auteur
create policy "avis_delete_auteur" on public.avis
  for delete using (auth.uid() = auteur_id);

-- ─── Index ────────────────────────────────────────────────────────────────────
create index if not exists avis_bien_id_idx      on public.avis(bien_id);
create index if not exists avis_sujet_id_idx     on public.avis(sujet_id);
create index if not exists avis_auteur_id_idx    on public.avis(auteur_id);
create index if not exists avis_type_idx         on public.avis(type);

-- ─── Vue notes moyennes (par sujet = personne notée) ─────────────────────────
create or replace view public.note_moyenne_utilisateur as
  select
    sujet_id,
    type,
    round(avg(note)::numeric, 1) as note_moyenne,
    count(*)::int                as nb_avis
  from public.avis
  group by sujet_id, type;
