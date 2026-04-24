-- ============================================================
-- MIGRATION 024 — CDC v5 DÉFINITIF
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ============================================================

-- ── AGENTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  nom                 TEXT NOT NULL,
  prenom              TEXT NOT NULL,
  telephone           TEXT NOT NULL,
  email               TEXT,
  zones_intervention  TEXT[],
  actif               BOOLEAN DEFAULT true,
  visites_effectuees  INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents visibles par staff" ON agents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderateur','admin'))
  );
CREATE POLICY "Admin gère agents" ON agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ── BIENS — nouvelles colonnes ────────────────────────────────
ALTER TABLE biens ADD COLUMN IF NOT EXISTS statut_moderation   TEXT DEFAULT 'approuve';
-- Vente uniquement : en_attente_validation | approuve | rejete
ALTER TABLE biens ADD COLUMN IF NOT EXISTS motif_rejet          TEXT;
ALTER TABLE biens ADD COLUMN IF NOT EXISTS moderateur_validation_id UUID REFERENCES profiles(id);
ALTER TABLE biens ADD COLUMN IF NOT EXISTS date_validation       TIMESTAMPTZ;

-- ── DOSSIERS LONGUE DURÉE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossiers_longue_duree (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                   TEXT UNIQUE NOT NULL,
  bien_id                     UUID REFERENCES biens(id) ON DELETE CASCADE,
  locataire_id                UUID REFERENCES profiles(id),
  proprietaire_id             UUID REFERENCES profiles(id),
  moderateur_id               UUID REFERENCES profiles(id),
  agent_id                    UUID REFERENCES agents(id),

  locataire_nom               TEXT,
  locataire_telephone         TEXT,
  locataire_email             TEXT,
  locataire_message           TEXT,

  date_visite                 TIMESTAMPTZ,
  proprietaire_present        BOOLEAN,

  locataire_interesse         BOOLEAN,
  date_decision_locataire     TIMESTAMPTZ,
  token_decision_locataire    TEXT UNIQUE,
  token_decision_expire_at    TIMESTAMPTZ,

  proprietaire_accepte        BOOLEAN,
  date_decision_proprietaire  TIMESTAMPTZ,

  frais_visite_paye           BOOLEAN DEFAULT false,
  fedapay_frais_visite_id     TEXT,

  commentaire_agent           TEXT,

  statut                      TEXT DEFAULT 'demande_recue',
  -- demande_recue | visite_planifiee | visite_effectuee
  -- locataire_interesse | locataire_non_interesse
  -- proprietaire_accepte | proprietaire_refuse
  -- contrat_genere | en_attente_signatures | signatures_completes
  -- en_attente_paiement | paiement_recu | finalise

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dossiers_longue_duree ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Locataire voit son dossier LD" ON dossiers_longue_duree
  FOR SELECT USING ((SELECT auth.uid()) = locataire_id);
CREATE POLICY "Proprio voit ses dossiers LD" ON dossiers_longue_duree
  FOR SELECT USING ((SELECT auth.uid()) = proprietaire_id);
CREATE POLICY "Staff gère dossiers LD" ON dossiers_longue_duree
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderateur','admin'))
  );

-- ── CONTRATS LOCATION (nouveau schéma lié à dossiers_longue_duree) ─
-- La table contrats_location existante est conservée ; on ajoute la FK dossier si elle manque
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS dossier_id UUID REFERENCES dossiers_longue_duree(id);
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS taux_commission          INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS commission_lofia         INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS total_premier_paiement   INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS montant_proprietaire_final INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS depot_garantie_mois      INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS depot_garantie_montant   INTEGER;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS fedapay_paiement_id      TEXT;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS paiement_effectue        BOOLEAN DEFAULT false;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS date_paiement            TIMESTAMPTZ;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS virement_effectue        BOOLEAN DEFAULT false;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS date_virement            TIMESTAMPTZ;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS ip_signature_locataire   TEXT;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS ip_signature_proprietaire TEXT;
ALTER TABLE contrats_location ADD COLUMN IF NOT EXISTS conditions_particulieres  TEXT;

-- ── DOSSIERS VENTE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dossiers_vente (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                   TEXT UNIQUE NOT NULL,
  bien_id                     UUID REFERENCES biens(id) ON DELETE CASCADE,
  acheteur_id                 UUID REFERENCES profiles(id),
  vendeur_id                  UUID REFERENCES profiles(id),
  moderateur_id               UUID REFERENCES profiles(id),
  agent_id                    UUID REFERENCES agents(id),

  acheteur_nom                TEXT,
  acheteur_telephone          TEXT,
  acheteur_email              TEXT,
  acheteur_message            TEXT,

  date_visite                 TIMESTAMPTZ,
  vendeur_present             BOOLEAN,

  acheteur_interesse          BOOLEAN,
  date_decision_acheteur      TIMESTAMPTZ,
  token_decision_acheteur     TEXT UNIQUE,
  token_decision_expire_at    TIMESTAMPTZ,

  vendeur_accepte             BOOLEAN,
  date_decision_vendeur       TIMESTAMPTZ,

  commentaire_agent           TEXT,

  acheteur_declare_virement   BOOLEAN DEFAULT false,
  date_declaration_virement   TIMESTAMPTZ,
  vendeur_confirme_reception  BOOLEAN DEFAULT false,
  date_confirmation_reception TIMESTAMPTZ,

  marque_vendu_par            UUID REFERENCES profiles(id),
  date_marquage_vendu         TIMESTAMPTZ,

  statut                      TEXT DEFAULT 'demande_recue',
  -- demande_recue | visite_planifiee | visite_effectuee
  -- acheteur_interesse | acheteur_non_interesse
  -- vendeur_accepte | vendeur_refuse
  -- promesse_generee | en_attente_signatures | signatures_completes
  -- en_attente_virement | virement_confirme | vendu

  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dossiers_vente ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acheteur voit son dossier VT" ON dossiers_vente
  FOR SELECT USING ((SELECT auth.uid()) = acheteur_id);
CREATE POLICY "Vendeur voit ses dossiers VT" ON dossiers_vente
  FOR SELECT USING ((SELECT auth.uid()) = vendeur_id);
CREATE POLICY "Staff gère dossiers VT" ON dossiers_vente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role IN ('moderateur','admin'))
  );

-- ── PROMESSES VENTE (nouveau schéma lié à dossiers_vente) ────
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS dossier_id        UUID REFERENCES dossiers_vente(id);
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS taux_commission    INTEGER;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS commission_lofia   INTEGER;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS commission_payee   BOOLEAN DEFAULT false;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS date_limite_realisation DATE;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS banque_vendeur     TEXT;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS numero_compte_vendeur TEXT;
ALTER TABLE promesses_vente ADD COLUMN IF NOT EXISTS nom_compte_vendeur TEXT;

-- ── NOTIFICATIONS — colonnes supplémentaires ─────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS module     TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dossier_id TEXT;

-- ── INDEX ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dossiers_ld_locataire    ON dossiers_longue_duree(locataire_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_ld_proprietaire ON dossiers_longue_duree(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_ld_statut       ON dossiers_longue_duree(statut);
CREATE INDEX IF NOT EXISTS idx_dossiers_vt_acheteur     ON dossiers_vente(acheteur_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_vt_vendeur      ON dossiers_vente(vendeur_id);
CREATE INDEX IF NOT EXISTS idx_dossiers_vt_statut       ON dossiers_vente(statut);
CREATE INDEX IF NOT EXISTS idx_biens_statut_mod         ON biens(statut_moderation);
