-- Migration 030 — Table demandes_reservation (Parcours Niveau 1 "Sur demande")
-- CDC v2 Partie 1.2

CREATE TABLE IF NOT EXISTS demandes_reservation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Références
  bien_id        UUID REFERENCES biens(id) ON DELETE CASCADE NOT NULL,
  locataire_id   UUID REFERENCES profiles(id) NOT NULL,
  proprietaire_id UUID REFERENCES profiles(id) NOT NULL,

  -- Dates demandées
  date_arrivee   DATE NOT NULL,
  date_depart    DATE NOT NULL,
  nb_nuits       INTEGER NOT NULL,
  montant_total  INTEGER NOT NULL,   -- FCFA

  -- Tokens pour réponse proprio (accessibles sans connexion)
  token_confirmation TEXT UNIQUE,
  token_refus        TEXT UNIQUE,

  -- Statut
  statut TEXT NOT NULL DEFAULT 'en_attente',
  -- en_attente | confirmee | payee | refusee | annulee_locataire | annulee_systeme | expiree

  -- Expiration
  expire_at               TIMESTAMPTZ NOT NULL,  -- +12h depuis création
  lien_paiement_expire_at TIMESTAMPTZ,           -- +2h depuis confirmation

  -- Tentatives de paiement (max 3)
  tentatives_paiement INTEGER DEFAULT 0,

  -- FedaPay (après confirmation + paiement)
  fedapay_transaction_id TEXT,

  -- Contenu
  message_locataire TEXT,          -- message optionnel au proprio
  motif_refus       TEXT,          -- si refusée par le proprio

  -- Flags rappels
  rappel_3h_envoye  BOOLEAN DEFAULT false,  -- rappel proprio 3h avant expiration
  rappel_paiement_envoye BOOLEAN DEFAULT false,

  -- Référence finale
  reservation_id UUID REFERENCES reservations(id), -- créée après paiement

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_demandes_reservation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_demandes_reservation_updated_at
  BEFORE UPDATE ON demandes_reservation
  FOR EACH ROW EXECUTE FUNCTION update_demandes_reservation_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_demandes_reservation_bien ON demandes_reservation(bien_id);
CREATE INDEX IF NOT EXISTS idx_demandes_reservation_locataire ON demandes_reservation(locataire_id);
CREATE INDEX IF NOT EXISTS idx_demandes_reservation_proprietaire ON demandes_reservation(proprietaire_id);
CREATE INDEX IF NOT EXISTS idx_demandes_reservation_statut ON demandes_reservation(statut);
CREATE INDEX IF NOT EXISTS idx_demandes_reservation_expire ON demandes_reservation(expire_at) WHERE statut = 'en_attente';
CREATE UNIQUE INDEX IF NOT EXISTS idx_demandes_reservation_token_conf ON demandes_reservation(token_confirmation) WHERE token_confirmation IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_demandes_reservation_token_refus ON demandes_reservation(token_refus) WHERE token_refus IS NOT NULL;

-- ─── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE demandes_reservation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Locataire voit ses demandes" ON demandes_reservation
  FOR SELECT USING ((select auth.uid()) = locataire_id);

CREATE POLICY "Locataire crée ses demandes" ON demandes_reservation
  FOR INSERT WITH CHECK ((select auth.uid()) = locataire_id);

CREATE POLICY "Locataire annule ses demandes" ON demandes_reservation
  FOR UPDATE USING ((select auth.uid()) = locataire_id)
  WITH CHECK ((select auth.uid()) = locataire_id);

CREATE POLICY "Propriétaire voit ses demandes reçues" ON demandes_reservation
  FOR SELECT USING ((select auth.uid()) = proprietaire_id);

CREATE POLICY "Staff voit toutes les demandes" ON demandes_reservation
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (select auth.uid()) AND role IN ('moderateur', 'admin')
    )
  );
