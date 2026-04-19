-- Migration 016 : Restreindre l'accès aux documents CNI dans le storage
-- Les photos de biens restent publiques.
-- Les CNI (cni/) ne sont accessibles qu'à leur propriétaire.
-- Les avatars restent publics.

-- Supprimer la policy SELECT trop permissive (tout public)
DROP POLICY IF EXISTS "biens_photos_select" ON storage.objects;

-- Nouvelle policy : public pour photos/avatars, privé pour cni/
CREATE POLICY "storage_select_public_or_owner"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'biens-photos'
    AND (
      -- Documents CNI : uniquement le propriétaire du dossier
      (
        name LIKE 'cni/%'
        AND (storage.foldername(name))[2] = (select auth.uid())::text
      )
      -- Tout le reste (photos biens, avatars) : public
      OR name NOT LIKE 'cni/%'
    )
  );
