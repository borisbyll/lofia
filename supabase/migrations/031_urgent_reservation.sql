-- Migration 031 — Option urgence sur les demandes de réservation courte durée
ALTER TABLE demandes_reservation
  ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_demandes_reservation_urgent
  ON demandes_reservation(is_urgent) WHERE is_urgent = true;
