-- Migration 023 : ajout colonne date_visite_proposee sur mises_en_relation
ALTER TABLE public.mises_en_relation
  ADD COLUMN IF NOT EXISTS date_visite_proposee TIMESTAMPTZ;
