-- Migration 024 : Activer Supabase Realtime sur la table notifications
-- Requis pour que les notifications en temps réel fonctionnent dans l'appli

-- REPLICA IDENTITY FULL permet au système Realtime de transmettre
-- la ligne complète (old + new) pour tous les événements
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Ajouter la table à la publication Realtime de Supabase
-- (par défaut, seules les tables explicitement ajoutées reçoivent les événements)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
