-- Migration 026 — Table historique_score_locataire
-- Traçabilité de chaque variation du score de fiabilité

CREATE TABLE IF NOT EXISTS historique_score_locataire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locataire_id UUID REFERENCES profiles(id),
  evenement TEXT NOT NULL,
  -- 'reservation_honoree' | 'annulation_retractation' | 'annulation_72h' |
  -- 'annulation_24_72h' | 'annulation_moins_24h' | 'no_show' |
  -- 'force_majeure_validee' | 'force_majeure_refusee' | 'avis_positif' |
  -- 'avis_negatif' | 'degradation' | 'recuperation_naturelle' | 'bonus_consecutif'
  variation INTEGER NOT NULL,
  score_avant INTEGER NOT NULL,
  score_apres INTEGER NOT NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historique_score_locataire ON historique_score_locataire(locataire_id);
CREATE INDEX IF NOT EXISTS idx_historique_score_reservation ON historique_score_locataire(reservation_id);
CREATE INDEX IF NOT EXISTS idx_historique_score_created ON historique_score_locataire(created_at DESC);
