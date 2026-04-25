-- Migration 025 — Table scores_locataires
-- Système de score de fiabilité pour les locataires de courte durée

CREATE TABLE IF NOT EXISTS scores_locataires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locataire_id UUID REFERENCES profiles(id) UNIQUE NOT NULL,

  score INTEGER DEFAULT 100,
  niveau TEXT DEFAULT 'or',
  -- 'platine' | 'or' | 'standard' | 'vigilance' | 'alerte' | 'suspendu' | 'banni'

  reservations_honorees INTEGER DEFAULT 0,
  reservations_annulees_retractation INTEGER DEFAULT 0,
  reservations_annulees_72h INTEGER DEFAULT 0,
  reservations_annulees_24_72h INTEGER DEFAULT 0,
  reservations_annulees_moins_24h INTEGER DEFAULT 0,
  no_shows INTEGER DEFAULT 0,
  force_majeures_validees INTEGER DEFAULT 0,
  force_majeures_refusees INTEGER DEFAULT 0,

  suspendu BOOLEAN DEFAULT false,
  suspendu_jusqu TIMESTAMPTZ,
  nombre_suspensions INTEGER DEFAULT 0,
  banni BOOLEAN DEFAULT false,
  telephone_blackliste TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_scores_locataires_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_scores_locataires_updated_at
  BEFORE UPDATE ON scores_locataires
  FOR EACH ROW EXECUTE FUNCTION update_scores_locataires_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_scores_locataires_locataire ON scores_locataires(locataire_id);
CREATE INDEX IF NOT EXISTS idx_scores_locataires_niveau ON scores_locataires(niveau);
CREATE INDEX IF NOT EXISTS idx_scores_locataires_suspendu ON scores_locataires(suspendu) WHERE suspendu = true;
