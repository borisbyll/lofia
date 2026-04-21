-- Ajout colonnes manquantes sur la table biens
-- meuble  : bien meublé ou non (utile pour résidentiel)
-- video_url : URL de la vidéo uploadée dans Supabase Storage

alter table public.biens
  add column if not exists meuble    boolean not null default false,
  add column if not exists video_url text;
