-- Migration 031 — Table signalements_sejour (problèmes pendant le séjour)
-- CDC v2 Partie 2.4

CREATE TABLE IF NOT EXISTS signalements_sejour (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE NOT NULL,
  locataire_id   UUID REFERENCES profiles(id) NOT NULL,

  type_probleme TEXT NOT NULL,
  -- 'non_conforme' | 'acces' | 'hygiene' | 'equipement' | 'securite' | 'comportement_proprio' | 'autre'

  description TEXT NOT NULL,
  photos_urls TEXT[] DEFAULT '{}',

  statut TEXT NOT NULL DEFAULT 'en_cours',
  -- en_cours | resolu_mediation | resolu_remboursement | classe

  moderateur_id  UUID REFERENCES profiles(id),
  resolution     TEXT,
  date_resolution TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_signalements_sejour_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_signalements_sejour_updated_at
  BEFORE UPDATE ON signalements_sejour
  FOR EACH ROW EXECUTE FUNCTION update_signalements_sejour_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_signalements_sejour_reservation ON signalements_sejour(reservation_id);
CREATE INDEX IF NOT EXISTS idx_signalements_sejour_locataire ON signalements_sejour(locataire_id);
CREATE INDEX IF NOT EXISTS idx_signalements_sejour_statut ON signalements_sejour(statut) WHERE statut = 'en_cours';

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE signalements_sejour ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locataire gère ses signalements" ON signalements_sejour
  FOR ALL USING ((select auth.uid()) = locataire_id);

CREATE POLICY "Proprio voit signalements sur ses biens" ON signalements_sejour
  FOR SELECT USING (
    (select auth.uid()) = (
      SELECT proprietaire_id FROM reservations WHERE id = reservation_id
    )
  );

CREATE POLICY "Staff traite tous signalements sejour" ON signalements_sejour
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );
