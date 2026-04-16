-- ============================================================
-- BORIS IMMO — Migration 003
-- Séquestre : fonds retenus 24h après check-in du locataire
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Nouveaux champs sur reservations
-- (pas de colonne GENERATED pour éviter l'erreur d'immutabilité)
-- ────────────────────────────────────────────────────────────
alter table public.reservations
  add column if not exists check_in_at          timestamptz,
  add column if not exists liberation_fonds_at  timestamptz,
  add column if not exists proprio_paye         boolean not null default false,
  add column if not exists proprio_paye_at      timestamptz;

-- ────────────────────────────────────────────────────────────
-- Trigger : calcule liberation_fonds_at = check_in_at + 24h
-- ────────────────────────────────────────────────────────────
create or replace function public.set_liberation_fonds_at()
returns trigger
language plpgsql
as $$
begin
  if new.check_in_at is not null and old.check_in_at is null then
    new.liberation_fonds_at := new.check_in_at + interval '24 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_liberation_fonds on public.reservations;
create trigger trg_liberation_fonds
  before update on public.reservations
  for each row execute function public.set_liberation_fonds_at();

-- ────────────────────────────────────────────────────────────
-- Ajout du statut 'en_sejour'
-- ────────────────────────────────────────────────────────────
alter table public.reservations drop constraint if exists reservations_statut_check;
alter table public.reservations
  add constraint reservations_statut_check
    check (statut in ('en_attente','confirme','en_sejour','annule','termine'));

-- ────────────────────────────────────────────────────────────
-- Fonction : confirmer l'arrivée (appelée par le locataire)
-- ────────────────────────────────────────────────────────────
create or replace function public.confirmer_arrivee(resa_id uuid)
returns void
language plpgsql security definer
as $$
begin
  if not exists (
    select 1 from public.reservations
    where id             = resa_id
      and locataire_id   = auth.uid()
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

  -- Notifier le propriétaire
  insert into public.notifications (user_id, type, titre, corps, lien)
  select
    r.proprietaire_id,
    'reservation',
    '🏠 Locataire arrivé',
    'Le locataire a confirmé son arrivée. Les fonds seront libérés dans 24h.',
    '/mon-espace/reservations'
  from public.reservations r
  where r.id = resa_id;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Fonction : libérer les fonds (cron ou appel client)
-- ────────────────────────────────────────────────────────────
create or replace function public.liberer_fonds_sequestre()
returns int
language plpgsql security definer
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

  -- Notifier les propriétaires dont les fonds viennent d'être libérés
  insert into public.notifications (user_id, type, titre, corps, lien)
  select
    r.proprietaire_id,
    'paiement',
    '💰 Fonds libérés',
    'Le séjour est terminé. Votre paiement de ' || r.montant_proprio || ' FCFA a été libéré.',
    '/mon-espace/reservations'
  from public.reservations r
  where r.statut          = 'termine'
    and r.proprio_paye    = true
    and r.proprio_paye_at >= now() - interval '1 minute';

  return nb;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- RLS : politique update (remplace l'ancienne)
-- ────────────────────────────────────────────────────────────
drop policy if exists "resa_checkin" on public.reservations;
drop policy if exists "resa_update"  on public.reservations;
create policy "resa_update" on public.reservations
  for update using (
    auth.uid() = locataire_id
    or auth.uid() = proprietaire_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ────────────────────────────────────────────────────────────
-- Index
-- ────────────────────────────────────────────────────────────
create index if not exists idx_resa_sejour
  on public.reservations(statut, liberation_fonds_at)
  where statut = 'en_sejour' and proprio_paye = false;
