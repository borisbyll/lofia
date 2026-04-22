-- ── Module 4 — Sponsoring des publications ───────────────────────────

-- Colonnes sur biens
ALTER TABLE public.biens
  ADD COLUMN IF NOT EXISTS niveau_sponsoring      TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS sponsoring_actif_jusqu TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_tri              INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_biens_score_tri ON public.biens(score_tri DESC);

-- Table sponsorisations
CREATE TABLE IF NOT EXISTS public.sponsorisations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id                 UUID NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  proprietaire_id         UUID NOT NULL REFERENCES public.profiles(id),

  formule                 TEXT NOT NULL CHECK (formule IN ('boost', 'premium')),
  prix_mensuel            INTEGER NOT NULL,

  date_debut              TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin                TIMESTAMPTZ NOT NULL,
  auto_renouvellement     BOOLEAN NOT NULL DEFAULT false,

  fedapay_transaction_id  TEXT,
  statut_paiement         TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut_paiement IN ('en_attente','paye','echoue','rembourse')),

  statut                  TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','actif','expire','annule','suspendu')),

  nombre_vues_pendant     INTEGER NOT NULL DEFAULT 0,
  nombre_clics_pendant    INTEGER NOT NULL DEFAULT 0,
  nombre_contacts_pendant INTEGER NOT NULL DEFAULT 0,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table stats journalières
CREATE TABLE IF NOT EXISTS public.stats_biens (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id                 UUID NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  date                    DATE NOT NULL DEFAULT CURRENT_DATE,
  nombre_vues             INTEGER NOT NULL DEFAULT 0,
  nombre_clics_contact    INTEGER NOT NULL DEFAULT 0,
  nombre_reservations     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (bien_id, date)
);

CREATE INDEX IF NOT EXISTS idx_sponsos_bien    ON public.sponsorisations(bien_id);
CREATE INDEX IF NOT EXISTS idx_sponsos_proprio ON public.sponsorisations(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_sponsos_statut  ON public.sponsorisations(statut, date_fin);
CREATE INDEX IF NOT EXISTS idx_stats_bien_date ON public.stats_biens(bien_id, date DESC);

-- RLS
ALTER TABLE public.sponsorisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsos_proprio_manage" ON public.sponsorisations
  FOR ALL USING ((select auth.uid()) = proprietaire_id);

ALTER TABLE public.stats_biens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stats_select_all" ON public.stats_biens FOR SELECT USING (true);
CREATE POLICY "stats_service_upsert" ON public.stats_biens
  FOR INSERT WITH CHECK (true);
CREATE POLICY "stats_service_update" ON public.stats_biens
  FOR UPDATE USING (true);

-- Cron pg_cron — expirer les sponsorisations (si pg_cron activé)
-- À activer manuellement dans Supabase SQL Editor :
-- SELECT cron.schedule('expire-sponsorisations','0 * * * *',$$
--   UPDATE public.biens SET niveau_sponsoring='standard', score_tri=0, sponsoring_actif_jusqu=NULL
--   WHERE id IN (SELECT bien_id FROM public.sponsorisations WHERE statut='actif' AND date_fin < now());
--   UPDATE public.sponsorisations SET statut='expire', updated_at=now()
--   WHERE statut='actif' AND date_fin < now();
-- $$);
