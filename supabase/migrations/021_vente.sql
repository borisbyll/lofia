-- ── Module 3 — Vente immobilière ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.demandes_visite_vente (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id                     UUID NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  acheteur_id                 UUID NOT NULL REFERENCES public.profiles(id),
  vendeur_id                  UUID NOT NULL REFERENCES public.profiles(id),

  code_visite                 TEXT UNIQUE NOT NULL,
  token_confirmation          TEXT UNIQUE NOT NULL,
  message                     TEXT,

  visite_confirmee_acheteur   BOOLEAN NOT NULL DEFAULT false,
  visite_confirmee_vendeur    BOOLEAN NOT NULL DEFAULT false,

  statut                      TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','visite_confirmee','offre_faite','promesse_signee','vendu','annule')),

  expire_at                   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.offres_achat (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  demande_visite_id   UUID NOT NULL REFERENCES public.demandes_visite_vente(id) ON DELETE CASCADE,
  bien_id             UUID NOT NULL REFERENCES public.biens(id),
  acheteur_id         UUID NOT NULL REFERENCES public.profiles(id),
  vendeur_id          UUID NOT NULL REFERENCES public.profiles(id),

  prix_propose        INTEGER NOT NULL,
  prix_accepte        INTEGER,
  message_acheteur    TEXT,
  message_vendeur     TEXT,

  statut              TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','acceptee','refusee','contre_offre')),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.promesses_vente (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offre_id                    UUID NOT NULL REFERENCES public.offres_achat(id),
  bien_id                     UUID NOT NULL REFERENCES public.biens(id),
  acheteur_id                 UUID NOT NULL REFERENCES public.profiles(id),
  vendeur_id                  UUID NOT NULL REFERENCES public.profiles(id),

  numero_promesse             TEXT UNIQUE NOT NULL,
  prix_vente                  INTEGER NOT NULL,

  commission_lofia            INTEGER NOT NULL DEFAULT 0,
  commission_payee            BOOLEAN NOT NULL DEFAULT false,
  fedapay_commission_id       TEXT,

  token_signature_acheteur    TEXT UNIQUE,
  token_signature_vendeur     TEXT UNIQUE,
  signe_par_acheteur          BOOLEAN NOT NULL DEFAULT false,
  signe_par_vendeur           BOOLEAN NOT NULL DEFAULT false,
  date_signature_acheteur     TIMESTAMPTZ,
  date_signature_vendeur      TIMESTAMPTZ,

  conditions                  TEXT,
  date_limite_signature       DATE,

  pdf_url                     TEXT,
  statut                      TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','en_attente_signatures','signe','vendu','annule')),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_dvv_acheteur  ON public.demandes_visite_vente(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_dvv_vendeur   ON public.demandes_visite_vente(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_dvv_bien      ON public.demandes_visite_vente(bien_id);
CREATE INDEX IF NOT EXISTS idx_oa_acheteur   ON public.offres_achat(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_pv_acheteur   ON public.promesses_vente(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_pv_vendeur    ON public.promesses_vente(vendeur_id);

-- RLS
ALTER TABLE public.demandes_visite_vente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dvv_parties_access" ON public.demandes_visite_vente
  FOR ALL USING (
    (select auth.uid()) = acheteur_id
    OR (select auth.uid()) = vendeur_id
  );

ALTER TABLE public.offres_achat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oa_parties_access" ON public.offres_achat
  FOR ALL USING (
    (select auth.uid()) = acheteur_id
    OR (select auth.uid()) = vendeur_id
  );

ALTER TABLE public.promesses_vente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv_parties_access" ON public.promesses_vente
  FOR ALL USING (
    (select auth.uid()) = acheteur_id
    OR (select auth.uid()) = vendeur_id
  );
