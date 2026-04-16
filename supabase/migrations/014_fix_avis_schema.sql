-- Migration 014 : Correction schéma avis
-- 1. Mettre à jour le CHECK constraint du type (noms cohérents avec le code)
-- 2. Ajouter colonne sujet_id (personne notée)
-- 3. Ajouter contrainte unicité (une seule avis par réservation et auteur)

-- Renommer les valeurs existantes avant de changer la contrainte
UPDATE avis SET type = 'locataire_note_proprio'     WHERE type = 'locataire_vers_bien';
UPDATE avis SET type = 'proprio_note_locataire' WHERE type = 'proprietaire_vers_locataire';

-- Supprimer l'ancienne contrainte CHECK
ALTER TABLE avis DROP CONSTRAINT IF EXISTS avis_type_check;

-- Recréer avec les bons noms
ALTER TABLE avis ADD CONSTRAINT avis_type_check
  CHECK (type IN ('locataire_note_proprio', 'proprio_note_locataire'));

-- Ajouter sujet_id (propriétaire noté par le locataire, ou locataire noté par le proprio)
ALTER TABLE avis ADD COLUMN IF NOT EXISTS sujet_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Contrainte d'unicité : un seul avis par réservation + auteur
ALTER TABLE avis DROP CONSTRAINT IF EXISTS avis_reservation_auteur_unique;
ALTER TABLE avis ADD CONSTRAINT avis_reservation_auteur_unique
  UNIQUE (reservation_id, auteur_id);

-- Index pour sujet_id
CREATE INDEX IF NOT EXISTS avis_sujet_idx ON avis(sujet_id);
