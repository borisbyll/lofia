-- Migration 012 : Auto-terminer les réservations dont date_fin est dépassée
-- Corrige les réservations "en_sejour" ou "confirme" dont la date de fin est passée

-- Fonction : marque comme "termine" toutes les réservations expirées
CREATE OR REPLACE FUNCTION terminer_sejours_expires()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  nb integer;
BEGIN
  UPDATE reservations
  SET
    statut     = 'termine',
    updated_at = now()
  WHERE
    statut IN ('en_sejour', 'confirme')
    AND date_fin < CURRENT_DATE;

  GET DIAGNOSTICS nb = ROW_COUNT;
  RETURN nb;
END;
$$;

-- Appel immédiat pour corriger les données existantes
SELECT terminer_sejours_expires();
