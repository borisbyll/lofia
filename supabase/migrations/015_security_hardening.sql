-- ============================================================
-- LOFIA. — Migration 015 : Security Hardening
-- Corrections des alertes de sécurité Supabase + audit interne
-- À exécuter dans l'éditeur SQL Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RLS POLICIES — remplacer auth.uid() par (select auth.uid())
--    Raison : auth.uid() direct peut être évalué une fois par ligne
--    au lieu d'une fois par requête → problème de performance et de
--    planification. Supabase recommande le wrapper select.
-- ────────────────────────────────────────────────────────────

-- PROFILES
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id);

-- BIENS
drop policy if exists "biens_select"              on public.biens;
drop policy if exists "biens_insert_own"          on public.biens;
drop policy if exists "biens_update_own_or_mod"   on public.biens;
drop policy if exists "biens_delete_own_or_admin" on public.biens;

create policy "biens_select" on public.biens
  for select using (
    statut = 'publie'
    or (select auth.uid()) = owner_id
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );
create policy "biens_insert_own" on public.biens
  for insert with check ((select auth.uid()) = owner_id);
create policy "biens_update_own_or_mod" on public.biens
  for update using (
    (select auth.uid()) = owner_id
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );
create policy "biens_delete_own_or_admin" on public.biens
  for delete using (
    (select auth.uid()) = owner_id
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- FAVORIS
drop policy if exists "favoris_select_own" on public.favoris;
drop policy if exists "favoris_insert_own" on public.favoris;
drop policy if exists "favoris_delete_own" on public.favoris;
create policy "favoris_select_own" on public.favoris
  for select using ((select auth.uid()) = user_id);
create policy "favoris_insert_own" on public.favoris
  for insert with check ((select auth.uid()) = user_id);
create policy "favoris_delete_own" on public.favoris
  for delete using ((select auth.uid()) = user_id);

-- MESSAGES_CONTACT
drop policy if exists "messages_select"       on public.messages_contact;
drop policy if exists "messages_insert"       on public.messages_contact;
drop policy if exists "messages_update_owner" on public.messages_contact;
create policy "messages_select" on public.messages_contact
  for select using (
    (select auth.uid()) = owner_id
    or (select auth.uid()) = sender_id
  );
-- Insertion : requirert authentification (plus d'accès anonyme)
create policy "messages_insert" on public.messages_contact
  for insert with check (
    (select auth.role()) = 'authenticated'
  );
create policy "messages_update_owner" on public.messages_contact
  for update using ((select auth.uid()) = owner_id);

-- MODERATION LOG
drop policy if exists "modlog_select_mod" on public.moderation_log;
drop policy if exists "modlog_insert_mod" on public.moderation_log;
create policy "modlog_select_mod" on public.moderation_log
  for select using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );
create policy "modlog_insert_mod" on public.moderation_log
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );

-- SIGNALEMENTS
drop policy if exists "signalements_select_admin" on public.signalements;
drop policy if exists "signalements_insert_any"   on public.signalements;
drop policy if exists "signalements_select_mod"   on public.signalements;
drop policy if exists "signalements_update_admin" on public.signalements;

-- Lecture : modérateurs + admins
create policy "signalements_select_mod" on public.signalements
  for select using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );
-- Insertion : authentifiés seulement (plus d'accès anon)
create policy "signalements_insert_auth" on public.signalements
  for insert with check (
    (select auth.role()) = 'authenticated'
  );
create policy "signalements_update_admin" on public.signalements
  for update using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- CONVERSATIONS
drop policy if exists "conv_select" on public.conversations;
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_select" on public.conversations
  for select using (
    (select auth.uid()) = proprietaire_id
    or (select auth.uid()) = locataire_id
  );
create policy "conv_insert" on public.conversations
  for insert with check ((select auth.uid()) = locataire_id);

-- CONVERSATION_MESSAGES
drop policy if exists "conv_msg_select" on public.conversation_messages;
drop policy if exists "conv_msg_insert" on public.conversation_messages;
create policy "conv_msg_select" on public.conversation_messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.proprietaire_id = (select auth.uid()) or c.locataire_id = (select auth.uid()))
    )
  );
create policy "conv_msg_insert" on public.conversation_messages
  for insert with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.proprietaire_id = (select auth.uid()) or c.locataire_id = (select auth.uid()))
    )
  );

-- RESERVATIONS
drop policy if exists "resa_select" on public.reservations;
drop policy if exists "resa_insert" on public.reservations;
drop policy if exists "resa_update" on public.reservations;
create policy "resa_select" on public.reservations
  for select using (
    (select auth.uid()) = locataire_id
    or (select auth.uid()) = proprietaire_id
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );
create policy "resa_insert" on public.reservations
  for insert with check ((select auth.uid()) = locataire_id);
create policy "resa_update" on public.reservations
  for update using (
    (select auth.uid()) = locataire_id
    or (select auth.uid()) = proprietaire_id
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    )
  );

-- NOTIFICATIONS
drop policy if exists "notifs_select" on public.notifications;
drop policy if exists "notifs_update" on public.notifications;
create policy "notifs_select" on public.notifications
  for select using ((select auth.uid()) = user_id);
create policy "notifs_update" on public.notifications
  for update using ((select auth.uid()) = user_id);

-- AVIS
drop policy if exists "avis_select_public"    on public.avis;
drop policy if exists "avis_insert_locataire" on public.avis;
drop policy if exists "avis_insert_proprio"   on public.avis;
drop policy if exists "avis_update_auteur"    on public.avis;
drop policy if exists "avis_delete_auteur"    on public.avis;

create policy "avis_select_public" on public.avis
  for select using (true);
create policy "avis_insert_locataire" on public.avis
  for insert with check (
    (select auth.uid()) = auteur_id
    and type = 'locataire_note_proprio'
    and exists (
      select 1 from public.reservations r
      where r.id                = reservation_id
        and r.locataire_id      = (select auth.uid())
        and r.statut            = 'termine'
        and r.paiement_effectue = true
    )
  );
create policy "avis_insert_proprio" on public.avis
  for insert with check (
    (select auth.uid()) = auteur_id
    and type = 'proprio_note_locataire'
    and exists (
      select 1 from public.reservations r
      where r.id                = reservation_id
        and r.proprietaire_id   = (select auth.uid())
        and r.statut            = 'termine'
        and r.paiement_effectue = true
    )
  );
create policy "avis_update_auteur" on public.avis
  for update using ((select auth.uid()) = auteur_id);
create policy "avis_delete_auteur" on public.avis
  for delete using ((select auth.uid()) = auteur_id);

-- DOCUMENTS
drop policy if exists "Proprio voit ses docs"       on public.documents;
drop policy if exists "Modérateur voit tous les docs" on public.documents;
drop policy if exists "Proprio insère ses docs"     on public.documents;

-- CORRECTION BUG CRITIQUE : user_id → owner_id (la colonne s'appelle owner_id sur biens)
create policy "docs_select_proprio" on public.documents
  for select using (
    bien_id in (
      select id from public.biens where owner_id = (select auth.uid())
    )
  );
create policy "docs_select_mod" on public.documents
  for select using (
    exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role in ('moderateur','admin')
    )
  );
create policy "docs_insert_proprio" on public.documents
  for insert with check (
    bien_id in (
      select id from public.biens where owner_id = (select auth.uid())
    )
  );
create policy "docs_delete_proprio" on public.documents
  for delete using (
    bien_id in (
      select id from public.biens where owner_id = (select auth.uid())
    )
  );


-- ────────────────────────────────────────────────────────────
-- 2. FONCTIONS SECURITY DEFINER — ajouter SET search_path
--    Sans search_path fixe, une fonction SECURITY DEFINER peut
--    être exploitée par search_path injection (schéma malveillant).
-- ────────────────────────────────────────────────────────────

-- handle_new_user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- handle_bien_insert
create or replace function public.handle_bien_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
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

-- handle_updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- update_favoris_count
create or replace function public.update_favoris_count()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if TG_OP = 'INSERT' then
    update public.biens set favoris_count = favoris_count + 1 where id = new.bien_id;
  elsif TG_OP = 'DELETE' then
    update public.biens set favoris_count = greatest(0, favoris_count - 1) where id = old.bien_id;
  end if;
  return null;
end;
$$;

-- sync_bien_location (PostGIS)
create or replace function public.sync_bien_location()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := st_setsrid(st_makepoint(new.longitude, new.latitude), 4326)::geography;
  end if;
  return new;
end;
$$;

-- set_liberation_fonds_at
create or replace function public.set_liberation_fonds_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.check_in_at is not null and old.check_in_at is null then
    new.liberation_fonds_at := new.check_in_at + interval '24 hours';
  end if;
  return new;
end;
$$;

-- confirmer_arrivee
drop function if exists public.confirmer_arrivee(uuid);
create or replace function public.confirmer_arrivee(resa_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.reservations
    where id             = resa_id
      and locataire_id   = (select auth.uid())
      and statut         = 'confirme'
      and paiement_effectue = true
      and check_in_at    is null
  ) then
    raise exception 'Réservation invalide ou arrivée déjà confirmée';
  end if;

  update public.reservations
  set
    check_in_at = now(),
    statut      = 'en_sejour',
    updated_at  = now()
  where id = resa_id;

  insert into public.notifications (user_id, type, titre, corps, lien)
  select
    r.proprietaire_id,
    'reservation',
    'Locataire arrivé',
    'Le locataire a confirmé son arrivée. Les fonds seront libérés dans 24h.',
    '/mon-espace/reservations'
  from public.reservations r
  where r.id = resa_id;
end;
$$;

-- liberer_fonds_sequestre
drop function if exists public.liberer_fonds_sequestre();
create or replace function public.liberer_fonds_sequestre()
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nb int := 0;
begin
  update public.reservations
  set
    proprio_paye    = true,
    proprio_paye_at = now(),
    statut          = 'termine',
    updated_at      = now()
  where statut              = 'en_sejour'
    and paiement_effectue   = true
    and proprio_paye        = false
    and liberation_fonds_at is not null
    and liberation_fonds_at <= now();

  get diagnostics nb = row_count;

  insert into public.notifications (user_id, type, titre, corps, lien)
  select
    r.proprietaire_id,
    'paiement',
    'Fonds libérés',
    'Le séjour est terminé. Votre paiement de ' || r.montant_proprio || ' FCFA a été libéré.',
    '/mon-espace/reservations'
  from public.reservations r
  where r.statut          = 'termine'
    and r.proprio_paye    = true
    and r.proprio_paye_at >= now() - interval '1 minute';

  return nb;
end;
$$;

-- terminer_sejours_expires
drop function if exists public.terminer_sejours_expires();
create or replace function public.terminer_sejours_expires()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nb integer;
begin
  update public.reservations
  set
    statut     = 'termine',
    updated_at = now()
  where
    statut in ('en_sejour', 'confirme')
    and date_fin < current_date;

  get diagnostics nb = row_count;
  return nb;
end;
$$;

-- increment_vues
drop function if exists public.increment_vues(uuid);
create or replace function public.increment_vues(p_bien_id uuid)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.biens set vues = vues + 1 where id = p_bien_id and statut = 'publie';
$$;

grant execute on function public.increment_vues(uuid) to anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. stats_plateforme — ajouter vérification rôle admin
-- ────────────────────────────────────────────────────────────
drop function if exists public.stats_plateforme();
create or replace function public.stats_plateforme()
returns json
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result json;
begin
  -- Seul un admin peut appeler cette fonction
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  ) then
    raise exception 'Accès non autorisé';
  end if;

  select json_build_object(
    'total_biens',          (select count(*) from public.biens where statut = 'publie'),
    'total_users',          (select count(*) from public.profiles),
    'total_reservations',   (select count(*) from public.reservations),
    'en_attente',           (select count(*) from public.biens where statut = 'en_attente'),
    'revenus_plateforme',   (
      select coalesce(sum(commission_voyageur + commission_hote), 0)
      from public.reservations where paiement_effectue = true
    ),
    'signalements_ouverts', (select count(*) from public.signalements where traite = false)
  ) into result;
  return result;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 4. recherche_biens_autour — ajouter SET search_path
-- ────────────────────────────────────────────────────────────
drop function if exists public.recherche_biens_autour(float, float, integer, text, text);
create or replace function public.recherche_biens_autour(
  p_lat      float,
  p_lng      float,
  p_rayon_m  integer default 2000,
  p_categorie text   default null,
  p_type_loc  text   default null
)
returns table (
  id               uuid,
  slug             text,
  titre            text,
  bien_categorie   text,
  type_bien        text,
  type_location    text,
  prix             integer,
  ville            text,
  quartier         text,
  photo_principale text,
  photos           text[],
  is_featured      boolean,
  vues             integer,
  publie_at        timestamptz,
  latitude         float,
  longitude        float,
  distance_m       float
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    b.id, b.slug, b.titre,
    b.categorie::text, b.type_bien, b.type_location,
    b.prix::integer, b.ville, b.quartier,
    b.photo_principale, b.photos,
    b.is_featured, b.vues, b.publie_at,
    b.latitude, b.longitude,
    st_distance(
      b.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography
    ) as distance_m
  from public.biens b
  where
    b.statut = 'publie'
    and b.location is not null
    and st_dwithin(
      b.location,
      st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography,
      p_rayon_m
    )
    and (p_categorie is null or b.categorie::text = p_categorie)
    and (p_type_loc  is null or b.type_location   = p_type_loc)
  order by distance_m asc;
end;
$$;

grant execute on function public.recherche_biens_autour(float, float, integer, text, text) to anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 5. check_signalements_auto_suspend — SECURITY DEFINER + search_path
-- ────────────────────────────────────────────────────────────
create or replace function public.check_signalements_auto_suspend()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nb_sigs integer;
begin
  select count(*) into nb_sigs
  from public.signalements
  where bien_id = new.bien_id and traite = false;

  if nb_sigs >= 3 then
    update public.biens set statut = 'rejete' where id = new.bien_id and statut = 'publie';

    insert into public.notifications (user_id, type, titre, corps, lien)
    select id, 'signalement', 'Bien suspendu automatiquement',
      'Un bien a été suspendu après 3 signalements indépendants.',
      '/moderateur/signalements'
    from public.profiles where role in ('moderateur', 'admin');
  end if;

  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 6. prevent_role_escalation — utiliser (select auth.uid())
-- ────────────────────────────────────────────────────────────
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role <> old.role then
    if not exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin'
    ) then
      raise exception 'Modification du rôle non autorisée';
    end if;
  end if;
  return new;
end;
$$;


-- ────────────────────────────────────────────────────────────
-- 7. note_moyenne_utilisateur — view avec security_invoker
--    (la vue doit respecter le RLS de l'utilisateur appelant)
-- ────────────────────────────────────────────────────────────
drop view if exists public.note_moyenne_utilisateur;
create view public.note_moyenne_utilisateur
  with (security_invoker = true)
as
  select
    sujet_id,
    type,
    round(avg(note)::numeric, 1) as note_moyenne,
    count(*)::int                as nb_avis
  from public.avis
  group by sujet_id, type;


-- ────────────────────────────────────────────────────────────
-- 8. Storage — restreindre l'upload au dossier de l'utilisateur
-- ────────────────────────────────────────────────────────────
drop policy if exists "biens_photos_insert" on storage.objects;
create policy "biens_photos_insert" on storage.objects
  for insert with check (
    bucket_id = 'biens-photos'
    and (select auth.role()) = 'authenticated'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "biens_photos_delete" on storage.objects;
create policy "biens_photos_delete" on storage.objects
  for delete using (
    bucket_id = 'biens-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

drop policy if exists "biens_photos_update" on storage.objects;
create policy "biens_photos_update" on storage.objects
  for update using (
    bucket_id = 'biens-photos'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
