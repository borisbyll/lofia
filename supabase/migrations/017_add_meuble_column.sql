-- Ajout colonne meuble sur la table biens
-- Utile pour les locations courte/longue durée (le locataire sait si le bien est meublé)

alter table public.biens
  add column if not exists meuble boolean not null default false;
