-- Migration 038 — Activer Realtime sur toutes les tables nécessaires

ALTER TABLE public.biens              REPLICA IDENTITY FULL;
ALTER TABLE public.dossiers_vente     REPLICA IDENTITY FULL;
ALTER TABLE public.mises_en_relation  REPLICA IDENTITY FULL;
ALTER TABLE public.contrats_location  REPLICA IDENTITY FULL;
ALTER TABLE public.disponibilites     REPLICA IDENTITY FULL;

DO $$ BEGIN
  -- biens
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'biens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.biens;
  END IF;
  -- dossiers_vente
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'dossiers_vente') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dossiers_vente;
  END IF;
  -- mises_en_relation
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'mises_en_relation') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.mises_en_relation;
  END IF;
  -- contrats_location
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'contrats_location') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contrats_location;
  END IF;
  -- disponibilites
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'disponibilites') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.disponibilites;
  END IF;
END $$;
