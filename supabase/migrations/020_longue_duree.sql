-- ── Module 2 — Location longue durée ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.mises_en_relation (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id                         UUID NOT NULL REFERENCES public.biens(id) ON DELETE CASCADE,
  locataire_id                    UUID NOT NULL REFERENCES public.profiles(id),
  proprietaire_id                 UUID NOT NULL REFERENCES public.profiles(id),

  code_visite                     TEXT UNIQUE NOT NULL,
  token_confirmation              TEXT UNIQUE NOT NULL,

  visite_confirmee_locataire      BOOLEAN NOT NULL DEFAULT false,
  visite_confirmee_proprietaire   BOOLEAN NOT NULL DEFAULT false,
  date_visite_confirmee           TIMESTAMPTZ,

  statut                          TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente','visite_planifiee','visite_confirmee','contrat_en_cours','contrat_signe','annule','expire')),

  expire_at                       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contrats_location (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mise_en_relation_id             UUID REFERENCES public.mises_en_relation(id),
  bien_id                         UUID NOT NULL REFERENCES public.biens(id),
  locataire_id                    UUID NOT NULL REFERENCES public.profiles(id),
  proprietaire_id                 UUID NOT NULL REFERENCES public.profiles(id),

  numero_contrat                  TEXT UNIQUE NOT NULL,

  loyer_mensuel                   INTEGER NOT NULL,
  charges_mensuelles              INTEGER NOT NULL DEFAULT 0,
  depot_garantie                  INTEGER,
  duree_mois                      INTEGER NOT NULL,
  date_debut                      DATE NOT NULL,
  date_fin                        DATE,
  conditions_particulieres        TEXT,

  frais_dossier                   INTEGER NOT NULL,
  frais_dossier_paye              BOOLEAN NOT NULL DEFAULT false,
  fedapay_frais_dossier_id        TEXT,
  date_paiement_frais             TIMESTAMPTZ,

  token_signature_locataire       TEXT UNIQUE,
  token_signature_proprietaire    TEXT UNIQUE,
  signe_par_locataire             BOOLEAN NOT NULL DEFAULT false,
  signe_par_proprietaire          BOOLEAN NOT NULL DEFAULT false,
  date_signature_locataire        TIMESTAMPTZ,
  date_signature_proprietaire     TIMESTAMPTZ,
  ip_signature_locataire          TEXT,
  ip_signature_proprietaire       TEXT,

  pdf_url                         TEXT,

  statut                          TEXT NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon','en_attente_signatures','en_attente_paiement','signe','archive','resilie')),

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_mer_locataire  ON public.mises_en_relation(locataire_id);
CREATE INDEX IF NOT EXISTS idx_mer_proprio    ON public.mises_en_relation(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_mer_bien       ON public.mises_en_relation(bien_id);
CREATE INDEX IF NOT EXISTS idx_cl_locataire   ON public.contrats_location(locataire_id);
CREATE INDEX IF NOT EXISTS idx_cl_proprio     ON public.contrats_location(proprietaire_id);

-- RLS
ALTER TABLE public.mises_en_relation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mer_parties_access" ON public.mises_en_relation
  FOR ALL USING (
    (select auth.uid()) = locataire_id
    OR (select auth.uid()) = proprietaire_id
  );

ALTER TABLE public.contrats_location ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cl_parties_access" ON public.contrats_location
  FOR ALL USING (
    (select auth.uid()) = locataire_id
    OR (select auth.uid()) = proprietaire_id
  );

-- Bucket contrats (privé, PDF uniquement)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contrats', 'contrats', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "contrats_owner_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contrats'
    AND (
      auth.uid()::text = (storage.foldername(name))[2]
      OR auth.uid()::text = (storage.foldername(name))[3]
    )
  );

CREATE POLICY "contrats_service_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contrats');
