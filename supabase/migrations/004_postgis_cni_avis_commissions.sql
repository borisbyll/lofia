-- ============================================================
-- Migration 004 — PostGIS + CNI + Documents + Avis + Commissions
-- Boris-Immo · Avril 2026
-- ============================================================

-- 1. Activer PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Ajouter colonne PostGIS sur biens (GEOGRAPHY POINT)
ALTER TABLE biens ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Créer index spatial
CREATE INDEX IF NOT EXISTS biens_location_idx ON biens USING GIST(location);

-- Synchroniser location depuis latitude/longitude existants
UPDATE biens
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;

-- Trigger pour synchroniser automatiquement location ↔ lat/lng
CREATE OR REPLACE FUNCTION sync_bien_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_location ON biens;
CREATE TRIGGER trg_sync_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON biens
  FOR EACH ROW EXECUTE FUNCTION sync_bien_location();

-- 3. Colonnes CNI sur profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cni_recto_url TEXT,
  ADD COLUMN IF NOT EXISTS cni_verso_url TEXT,
  ADD COLUMN IF NOT EXISTS identite_verifiee BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS identite_verifiee_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identite_verifiee_par UUID REFERENCES profiles(id);

-- 4. Table documents (titre foncier, attestations)
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id       UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('titre_foncier', 'attestation', 'autre')),
  url           TEXT NOT NULL,
  nom           TEXT,
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proprio voit ses docs" ON documents
  FOR SELECT USING (
    bien_id IN (SELECT id FROM biens WHERE user_id = auth.uid())
  );

CREATE POLICY "Modérateur voit tous les docs" ON documents
  FOR SELECT USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('moderateur', 'admin')
  );

CREATE POLICY "Proprio insère ses docs" ON documents
  FOR INSERT WITH CHECK (
    bien_id IN (SELECT id FROM biens WHERE user_id = auth.uid())
  );

-- 5. Table avis
CREATE TABLE IF NOT EXISTS avis (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bien_id         UUID NOT NULL REFERENCES biens(id) ON DELETE CASCADE,
  reservation_id  UUID REFERENCES reservations(id) ON DELETE SET NULL,
  auteur_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note            SMALLINT NOT NULL CHECK (note BETWEEN 1 AND 5),
  commentaire     TEXT,
  type            TEXT NOT NULL CHECK (type IN ('locataire_vers_bien', 'proprietaire_vers_locataire')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE avis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avis visibles par tous" ON avis
  FOR SELECT USING (true);

CREATE POLICY "Auteur insère son avis" ON avis
  FOR INSERT WITH CHECK (auteur_id = auth.uid());

CREATE POLICY "Auteur modifie son avis" ON avis
  FOR UPDATE USING (auteur_id = auth.uid());

-- Index performance
CREATE INDEX IF NOT EXISTS avis_bien_idx ON avis(bien_id);
CREATE INDEX IF NOT EXISTS avis_auteur_idx ON avis(auteur_id);

-- 6. Mettre à jour la structure reservations pour nouvelles commissions (8% + 3%)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS prix_nuit           INTEGER,
  ADD COLUMN IF NOT EXISTS commission_voyageur INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_hote     INTEGER DEFAULT 0;

-- Recalculer commissions existantes (migration des données)
-- Ancienne commission = 15% flat → on approxime :
-- commission_voyageur = 8% du prix_total original
-- commission_hote     = 3% du prix_total original
UPDATE reservations
SET
  commission_voyageur = ROUND(prix_total * 0.08),
  commission_hote     = ROUND(prix_total * 0.03),
  montant_proprio     = prix_total - ROUND(prix_total * 0.03)
WHERE commission_voyageur IS NULL OR commission_voyageur = 0;

-- 7. RPC PostGIS — Recherche par distance (autour de moi)
CREATE OR REPLACE FUNCTION recherche_biens_autour(
  lat       FLOAT,
  lng       FLOAT,
  rayon_m   INTEGER DEFAULT 2000,
  categorie TEXT DEFAULT NULL,
  type_loc  TEXT DEFAULT NULL
)
RETURNS TABLE (
  id          UUID,
  slug        TEXT,
  titre       TEXT,
  categorie   TEXT,
  type_bien   TEXT,
  type_location TEXT,
  prix        INTEGER,
  ville       TEXT,
  quartier    TEXT,
  photo_principale TEXT,
  photos      TEXT[],
  is_featured BOOLEAN,
  vues        INTEGER,
  publie_at   TIMESTAMPTZ,
  latitude    FLOAT,
  longitude   FLOAT,
  distance_m  FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.slug, b.titre,
    b.categorie::TEXT, b.type_bien, b.type_location,
    b.prix, b.ville, b.quartier,
    b.photo_principale, b.photos,
    b.is_featured, b.vues, b.publie_at,
    b.latitude, b.longitude,
    ST_Distance(
      b.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_m
  FROM biens b
  WHERE
    b.statut = 'publie'
    AND b.location IS NOT NULL
    AND ST_DWithin(
      b.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      rayon_m
    )
    AND (recherche_biens_autour.categorie IS NULL OR b.categorie::TEXT = recherche_biens_autour.categorie)
    AND (recherche_biens_autour.type_loc IS NULL OR b.type_location = recherche_biens_autour.type_loc)
  ORDER BY distance_m ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Fonction stats plateforme (admin)
CREATE OR REPLACE FUNCTION stats_plateforme()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_biens',       (SELECT COUNT(*) FROM biens WHERE statut = 'publie'),
    'total_users',       (SELECT COUNT(*) FROM profiles),
    'total_reservations',(SELECT COUNT(*) FROM reservations),
    'en_attente',        (SELECT COUNT(*) FROM biens WHERE statut = 'en_attente'),
    'revenus_plateforme',(SELECT COALESCE(SUM(commission_voyageur + commission_hote), 0) FROM reservations WHERE paiement_effectue = TRUE),
    'signalements_ouverts', (SELECT COUNT(*) FROM signalements WHERE statut = 'en_attente')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Trigger 3 signalements → suspension automatique
CREATE OR REPLACE FUNCTION check_signalements_auto_suspend()
RETURNS TRIGGER AS $$
DECLARE
  nb_sigs INTEGER;
BEGIN
  SELECT COUNT(*) INTO nb_sigs
  FROM signalements
  WHERE bien_id = NEW.bien_id AND statut = 'en_attente';

  IF nb_sigs >= 3 THEN
    UPDATE biens SET statut = 'rejete' WHERE id = NEW.bien_id AND statut = 'publie';
    -- Notifier les modérateurs
    INSERT INTO notifications (user_id, type, titre, corps, lien)
    SELECT id, 'signalement', '🚨 Bien suspendu automatiquement',
      'Un bien a été suspendu après 3 signalements indépendants.',
      '/moderateur/signalements'
    FROM profiles WHERE role IN ('moderateur', 'admin');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_suspend ON signalements;
CREATE TRIGGER trg_auto_suspend
  AFTER INSERT ON signalements
  FOR EACH ROW EXECUTE FUNCTION check_signalements_auto_suspend();

-- 10. Bucket Supabase Storage — documents CNI (privé)
-- À exécuter manuellement dans le dashboard Supabase :
-- INSERT INTO storage.buckets (id, name, public) VALUES ('cni-docs', 'cni-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents-biens', 'documents-biens', false);
