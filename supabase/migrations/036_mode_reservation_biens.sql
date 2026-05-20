-- Migration 036 : Mode de réservation sur les biens courte durée
-- 'sur_demande' (défaut) : locataire envoie demande → proprio confirme → paiement
-- 'instantanee'          : paiement immédiat → réservation créée directement (CDC v2 §1.3)

ALTER TABLE biens
  ADD COLUMN IF NOT EXISTS mode_reservation TEXT DEFAULT 'sur_demande'
  CHECK (mode_reservation IN ('sur_demande', 'instantanee'));

CREATE INDEX IF NOT EXISTS idx_biens_mode_reservation ON biens(mode_reservation)
  WHERE mode_reservation = 'instantanee';
