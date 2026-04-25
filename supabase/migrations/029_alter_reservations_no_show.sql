-- Migration 029 — Ajout colonnes no-show sur reservations
-- + statut force_majeure_en_cours + RLS gestion locataires + VIEW niveau

-- Colonnes no-show
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_detecte BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS heure_arrivee_prevue TIME;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS arrivee_confirmee BOOLEAN DEFAULT false;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS heure_arrivee_reelle TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS no_show_rappel_envoye BOOLEAN DEFAULT false;

-- Statut supplémentaire pour la gestion annulation / force majeure
-- On étend la colonne statut existante (pas de contrainte CHECK stricte)

-- Index no-show
CREATE INDEX IF NOT EXISTS idx_reservations_no_show ON reservations(no_show_detecte)
  WHERE no_show_detecte = true;
CREATE INDEX IF NOT EXISTS idx_reservations_rappel ON reservations(no_show_rappel_envoye, date_debut)
  WHERE no_show_rappel_envoye = false;

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE scores_locataires ENABLE ROW LEVEL SECURITY;

-- Locataire voit uniquement son niveau (pas le chiffre) → via VIEW
CREATE POLICY "Locataire lit son score" ON scores_locataires
  FOR SELECT USING ((select auth.uid()) = locataire_id);

CREATE POLICY "Staff gère tous les scores" ON scores_locataires
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );

ALTER TABLE historique_score_locataire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locataire voit son historique" ON historique_score_locataire
  FOR SELECT USING ((select auth.uid()) = locataire_id);

CREATE POLICY "Staff voit tout historique" ON historique_score_locataire
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );

ALTER TABLE demandes_force_majeure ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locataire gère ses demandes FM" ON demandes_force_majeure
  FOR ALL USING ((select auth.uid()) = locataire_id);

CREATE POLICY "Staff traite les demandes FM" ON demandes_force_majeure
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );

ALTER TABLE annulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties voient leurs annulations" ON annulations
  FOR SELECT USING (
    (select auth.uid()) = (
      SELECT locataire_id FROM reservations WHERE id = reservation_id
    )
    OR (select auth.uid()) = (
      SELECT proprietaire_id FROM reservations WHERE id = reservation_id
    )
  );

CREATE POLICY "Staff voit toutes annulations" ON annulations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );

-- ─── VIEW pour le locataire (sans score chiffré) ─────────────────────

CREATE OR REPLACE VIEW mon_niveau_locataire AS
  SELECT
    locataire_id,
    niveau,
    reservations_honorees,
    suspendu,
    banni
  FROM scores_locataires
  WHERE locataire_id = (select auth.uid());

-- Accorder la lecture au rôle authenticated
GRANT SELECT ON mon_niveau_locataire TO authenticated;
