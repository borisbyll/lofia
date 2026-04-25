-- Migration 028 — Table annulations
-- Enregistrement de chaque annulation avec calcul financier

CREATE TABLE IF NOT EXISTS annulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id) NOT NULL,
  initiateur TEXT NOT NULL CHECK (initiateur IN ('locataire', 'proprietaire', 'systeme')),
  type TEXT NOT NULL CHECK (
    type IN (
      'retractation', 'standard_72h', 'standard_24_72h',
      'standard_moins_24h', 'no_show', 'force_majeure', 'proprietaire'
    )
  ),
  force_majeure_id UUID REFERENCES demandes_force_majeure(id) ON DELETE SET NULL,

  montant_total_paye INTEGER NOT NULL,
  commission_lofia_initiale INTEGER NOT NULL,
  montant_rembourse INTEGER NOT NULL,
  pourcentage_rembourse INTEGER NOT NULL,
  retenu_par_lofia INTEGER NOT NULL,

  remboursement_effectue BOOLEAN DEFAULT false,
  fedapay_refund_id TEXT,
  date_remboursement TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_annulations_reservation ON annulations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_annulations_remboursement ON annulations(remboursement_effectue) WHERE remboursement_effectue = false;
