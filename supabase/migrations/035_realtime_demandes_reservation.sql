-- Migration 035 : Activer Supabase Realtime sur demandes_reservation
-- Nécessaire pour TrackerDemandeReservation (CDC v2 §1.2)

ALTER TABLE public.demandes_reservation REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'demandes_reservation'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.demandes_reservation;
  END IF;
END $$;
