-- ============================================================
-- BORIS IMMO — Migration initiale
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- ============================================================

-- Extension pour les slugs sans accents
create extension if not exists "unaccent";

-- ────────────────────────────────────────────────────────────
-- PROFILES (étend auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  nom         text not null default '',
  phone       text,
  avatar_url  text,
  role        text not null default 'utilisateur'
                check (role in ('visiteur','utilisateur','moderateur','admin')),
  bio         text,
  is_diaspora boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Trigger : créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, nom, phone, is_diaspora)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nom', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'is_diaspora')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- BIENS
-- ────────────────────────────────────────────────────────────
create table if not exists public.biens (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid references public.profiles(id) on delete cascade not null,
  categorie           text not null check (categorie in ('vente','location')),
  type_location       text check (type_location in ('courte_duree','longue_duree')),
  type_bien           text not null,
  titre               text not null,
  description         text,
  slug                text unique not null,
  ville               text not null,
  commune             text,
  quartier            text,
  adresse             text,
  latitude            double precision,
  longitude           double precision,
  prix                numeric not null check (prix >= 0),
  devise              text not null default 'FCFA',
  prix_type           text not null default 'total'
                        check (prix_type in ('total','par_mois','par_nuit')),
  prix_negociable     boolean not null default false,
  superficie          numeric,
  nb_pieces           int,
  nb_chambres         int,
  nb_salles_bain      int,
  nb_etages           int,
  annee_construction  int,
  equipements         text[] not null default '{}',
  photos              text[] not null default '{}',
  photo_principale    text,
  statut              text not null default 'brouillon'
                        check (statut in ('brouillon','en_attente','publie','rejete','archive')),
  moderateur_id       uuid references public.profiles(id),
  note_moderation     text,
  modere_at           timestamptz,
  publie_at           timestamptz,
  vues                int not null default 0,
  favoris_count       int not null default 0,
  is_featured         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Trigger CRITIQUE : forcer le statut selon la catégorie
create or replace function public.handle_bien_insert()
returns trigger language plpgsql as $$
begin
  if new.categorie = 'vente' then
    new.statut    := 'en_attente';
    new.publie_at := null;
  elsif new.categorie = 'location' then
    new.statut    := 'publie';
    new.publie_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists before_bien_insert on public.biens;
create trigger before_bien_insert
  before insert on public.biens
  for each row execute procedure public.handle_bien_insert();

-- Trigger : updated_at automatique
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_bien_updated on public.biens;
create trigger on_bien_updated
  before update on public.biens
  for each row execute procedure public.handle_updated_at();

-- ────────────────────────────────────────────────────────────
-- FAVORIS
-- ────────────────────────────────────────────────────────────
create table if not exists public.favoris (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  bien_id    uuid references public.biens(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  unique (user_id, bien_id)
);

-- Trigger : maintenir le compteur favoris_count
create or replace function public.update_favoris_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.biens set favoris_count = favoris_count + 1 where id = new.bien_id;
  elsif TG_OP = 'DELETE' then
    update public.biens set favoris_count = greatest(0, favoris_count - 1) where id = old.bien_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_favori_change on public.favoris;
create trigger on_favori_change
  after insert or delete on public.favoris
  for each row execute procedure public.update_favoris_count();

-- ────────────────────────────────────────────────────────────
-- MESSAGES_CONTACT
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages_contact (
  id         uuid primary key default gen_random_uuid(),
  bien_id    uuid references public.biens(id) on delete cascade not null,
  owner_id   uuid references public.profiles(id) on delete cascade not null,
  sender_id  uuid references public.profiles(id) on delete set null,
  nom        text not null,
  email      text not null,
  phone      text,
  message    text not null,
  lu         boolean not null default false,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- MODERATION_LOG
-- ────────────────────────────────────────────────────────────
create table if not exists public.moderation_log (
  id              uuid primary key default gen_random_uuid(),
  bien_id         uuid references public.biens(id) on delete cascade not null,
  moderateur_id   uuid references public.profiles(id) on delete set null,
  action          text not null check (action in ('approuve','rejete')),
  note            text,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- SIGNALEMENTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.signalements (
  id         uuid primary key default gen_random_uuid(),
  bien_id    uuid references public.biens(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete set null,
  raison     text not null,
  detail     text,
  traite     boolean not null default false,
  created_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- RLS (Row Level Security)
-- ────────────────────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.biens            enable row level security;
alter table public.favoris          enable row level security;
alter table public.messages_contact enable row level security;
alter table public.moderation_log   enable row level security;
alter table public.signalements     enable row level security;

-- PROFILES
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- BIENS
drop policy if exists "biens_select"            on public.biens;
drop policy if exists "biens_insert_own"        on public.biens;
drop policy if exists "biens_update_own_or_mod" on public.biens;
drop policy if exists "biens_delete_own_or_admin" on public.biens;
create policy "biens_select" on public.biens
  for select using (
    statut = 'publie'
    or auth.uid() = owner_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('moderateur','admin')
    )
  );
create policy "biens_insert_own" on public.biens
  for insert with check (auth.uid() = owner_id);
create policy "biens_update_own_or_mod" on public.biens
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('moderateur','admin')
    )
  );
create policy "biens_delete_own_or_admin" on public.biens
  for delete using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- FAVORIS
drop policy if exists "favoris_select_own" on public.favoris;
drop policy if exists "favoris_insert_own" on public.favoris;
drop policy if exists "favoris_delete_own" on public.favoris;
create policy "favoris_select_own" on public.favoris
  for select using (auth.uid() = user_id);
create policy "favoris_insert_own" on public.favoris
  for insert with check (auth.uid() = user_id);
create policy "favoris_delete_own" on public.favoris
  for delete using (auth.uid() = user_id);

-- MESSAGES
drop policy if exists "messages_select"       on public.messages_contact;
drop policy if exists "messages_insert"       on public.messages_contact;
drop policy if exists "messages_update_owner" on public.messages_contact;
create policy "messages_select" on public.messages_contact
  for select using (auth.uid() = owner_id or auth.uid() = sender_id);
create policy "messages_insert" on public.messages_contact
  for insert with check (true);
create policy "messages_update_owner" on public.messages_contact
  for update using (auth.uid() = owner_id);

-- MODERATION LOG
drop policy if exists "modlog_select_mod" on public.moderation_log;
drop policy if exists "modlog_insert_mod" on public.moderation_log;
create policy "modlog_select_mod" on public.moderation_log
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('moderateur','admin'))
  );
create policy "modlog_insert_mod" on public.moderation_log
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('moderateur','admin'))
  );

-- SIGNALEMENTS
drop policy if exists "signalements_select_admin" on public.signalements;
drop policy if exists "signalements_insert_any"   on public.signalements;
drop policy if exists "signalements_update_admin" on public.signalements;
create policy "signalements_select_admin" on public.signalements
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
create policy "signalements_insert_any" on public.signalements
  for insert with check (true);
create policy "signalements_update_admin" on public.signalements
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ────────────────────────────────────────────────────────────
-- STORAGE : bucket biens-photos
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'biens-photos',
  'biens-photos',
  true,
  5242880,  -- 5 Mo
  array['image/jpeg','image/jpg','image/png','image/webp']
) on conflict (id) do nothing;

drop policy if exists "biens_photos_select" on storage.objects;
drop policy if exists "biens_photos_insert" on storage.objects;
drop policy if exists "biens_photos_delete" on storage.objects;
create policy "biens_photos_select" on storage.objects
  for select using (bucket_id = 'biens-photos');
create policy "biens_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'biens-photos'
    and auth.role() = 'authenticated'
  );
create policy "biens_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'biens-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ────────────────────────────────────────────────────────────
-- INDEX (performance)
-- ────────────────────────────────────────────────────────────
create index if not exists idx_biens_statut        on public.biens(statut);
create index if not exists idx_biens_categorie     on public.biens(categorie);
create index if not exists idx_biens_ville         on public.biens(ville);
create index if not exists idx_biens_owner         on public.biens(owner_id);
create index if not exists idx_biens_slug          on public.biens(slug);
create index if not exists idx_biens_featured      on public.biens(is_featured) where is_featured = true;
create index if not exists idx_biens_publie_at     on public.biens(publie_at desc);
create index if not exists idx_favoris_user        on public.favoris(user_id);
create index if not exists idx_favoris_bien        on public.favoris(bien_id);
create index if not exists idx_messages_owner      on public.messages_contact(owner_id);
create index if not exists idx_messages_bien       on public.messages_contact(bien_id);
create index if not exists idx_signalements_traite on public.signalements(traite);
