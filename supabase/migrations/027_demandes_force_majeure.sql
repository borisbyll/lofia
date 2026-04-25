-- Migration 027 — Table demandes_force_majeure
-- Gestion des annulations pour circonstances exceptionnelles

CREATE TABLE IF NOT EXISTS demandes_force_majeure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) NOT NULL,
  locataire_id UUID REFERENCES profiles(id) NOT NULL,

  type_evenement TEXT NOT NULL,
  -- 'deces_famille' | 'hospitalisation' | 'decision_administrative' |
  -- 'accident' | 'catastrophe_naturelle' | 'urgence_medicale'
  categorie TEXT NOT NULL CHECK (categorie IN ('A', 'B', 'C')),
  description TEXT,
  justificatif_url TEXT,

  statut TEXT DEFAULT 'en_attente' CHECK (
    statut IN ('en_attente', 'validee', 'refusee', 'en_recours')
  ),

  moderateur_id UUID REFERENCES profiles(id),
  motif_refus TEXT,
  date_traitement TIMESTAMPTZ,

  recours_possible BOOLEAN DEFAULT true,
  recours_soumis BOOLEAN DEFAULT false,
  recours_traite BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_demandes_fm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demandes_fm_updated_at
  BEFORE UPDATE ON demandes_force_majeure
  FOR EACH ROW EXECUTE FUNCTION update_demandes_fm_updated_at();

CREATE INDEX IF NOT EXISTS idx_demandes_fm_reservation ON demandes_force_majeure(reservation_id);
CREATE INDEX IF NOT EXISTS idx_demandes_fm_locataire ON demandes_force_majeure(locataire_id);
CREATE INDEX IF NOT EXISTS idx_demandes_fm_statut ON demandes_force_majeure(statut) WHERE statut = 'en_attente';
