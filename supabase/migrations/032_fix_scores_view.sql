-- Migration 032 — Fix scores_locataires : renommage champ + nouvelles colonnes
-- + renommage VIEW + colonnes supplémentaires sur reservations
-- CDC v2 corrections

-- 1. Renommer reservations_honorees → sejours_honores
ALTER TABLE scores_locataires
  RENAME COLUMN reservations_honorees TO sejours_honores;

-- 2. Ajouter email_blackliste si absent
ALTER TABLE scores_locataires
  ADD COLUMN IF NOT EXISTS email_blackliste TEXT;

-- 3. Ajouter colonnes manquantes sur reservations (v2 CDC)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS rappel_avis_envoye BOOLEAN DEFAULT false;
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS signalement_probleme BOOLEAN DEFAULT false;
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS rappel_j1_envoye BOOLEAN DEFAULT false;

-- 4. Remplacer VIEW mon_niveau_locataire → mon_profil_locataire (CDC v2 §6.2)
DROP VIEW IF EXISTS mon_niveau_locataire;

CREATE OR REPLACE VIEW mon_profil_locataire AS
  SELECT
    locataire_id,
    niveau,
    sejours_honores,
    suspendu,
    suspendu_jusqu,
    banni
  FROM scores_locataires
  WHERE locataire_id = (select auth.uid());

GRANT SELECT ON mon_profil_locataire TO authenticated;

-- 5. Garder une vue compatibilité ancien nom pendant la transition
CREATE OR REPLACE VIEW mon_niveau_locataire AS
  SELECT
    locataire_id,
    niveau,
    sejours_honores AS reservations_honorees,
    suspendu,
    banni
  FROM scores_locataires
  WHERE locataire_id = (select auth.uid());

GRANT SELECT ON mon_niveau_locataire TO authenticated;
