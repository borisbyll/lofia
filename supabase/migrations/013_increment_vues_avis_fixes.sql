-- Migration 013 : Fonction increment_vues + correction type avis

-- Incrément atomique des vues (SECURITY DEFINER pour bypass RLS)
CREATE OR REPLACE FUNCTION increment_vues(p_bien_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE biens SET vues = vues + 1 WHERE id = p_bien_id AND statut = 'publie';
$$;

-- Accès public (visiteurs non authentifiés)
GRANT EXECUTE ON FUNCTION increment_vues(uuid) TO anon, authenticated;
