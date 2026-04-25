export type TypeAnnulation =
  | 'retractation'
  | 'force_majeure'
  | 'proprietaire'
  | 'standard'
  | 'no_show'

export type PalierAnnulation =
  | 'retractation'
  | 'standard_72h'
  | 'standard_24_72h'
  | 'standard_moins_24h'
  | 'no_show'
  | 'force_majeure'
  | 'proprietaire'

export interface ResultatRemboursement {
  remboursement_locataire: number
  retenu_par_lofia: number
  retenu_du_proprietaire: number
  pourcentage_rembourse: number
  palier: PalierAnnulation
  heures_avant_arrivee: number
}

function diffHeures(dateArrivee: Date, dateAnnulation: Date): number {
  return (dateArrivee.getTime() - dateAnnulation.getTime()) / (1000 * 60 * 60)
}

export function calculerRemboursement(params: {
  montant_total: number
  commission_lofia: number
  montant_proprietaire: number
  date_arrivee: Date
  date_reservation: Date
  date_annulation: Date
  type: TypeAnnulation
}): ResultatRemboursement {
  const {
    montant_total,
    commission_lofia,
    montant_proprietaire,
    date_arrivee,
    date_reservation,
    date_annulation,
    type,
  } = params

  const heures_avant_arrivee = diffHeures(date_arrivee, date_annulation)

  // Force majeure ou faute propriétaire → remboursement 100%
  if (type === 'force_majeure' || type === 'proprietaire') {
    return {
      remboursement_locataire: montant_total,
      retenu_par_lofia: 0,
      retenu_du_proprietaire: montant_proprietaire,
      pourcentage_rembourse: 100,
      palier: type,
      heures_avant_arrivee,
    }
  }

  // Fenêtre de rétractation : dans les 2h suivant la réservation
  // ET arrivée dans plus de 48h
  if (type === 'retractation') {
    const heures_depuis_reservation =
      (date_annulation.getTime() - date_reservation.getTime()) / (1000 * 60 * 60)
    const dans_fenetre =
      heures_depuis_reservation <= 2 && heures_avant_arrivee >= 48

    if (dans_fenetre) {
      return {
        remboursement_locataire: montant_total,
        retenu_par_lofia: 0,
        retenu_du_proprietaire: montant_proprietaire,
        pourcentage_rembourse: 100,
        palier: 'retractation',
        heures_avant_arrivee,
      }
    }
    // Hors fenêtre → traité comme standard
  }

  // No-show → 0% remboursement
  if (type === 'no_show' || heures_avant_arrivee < 0) {
    return {
      remboursement_locataire: 0,
      retenu_par_lofia: commission_lofia,
      retenu_du_proprietaire: 0,
      pourcentage_rembourse: 0,
      palier: 'no_show',
      heures_avant_arrivee,
    }
  }

  // Politique standard dégressivité
  let taux = 0
  let palier: PalierAnnulation

  if (heures_avant_arrivee > 72) {
    taux = 0.70
    palier = 'standard_72h'
  } else if (heures_avant_arrivee >= 24) {
    taux = 0.50
    palier = 'standard_24_72h'
  } else {
    taux = 0
    palier = 'standard_moins_24h'
  }

  const remboursement_part_proprietaire = Math.round(montant_proprietaire * taux)
  const retenu_par_lofia =
    commission_lofia + (montant_proprietaire - remboursement_part_proprietaire)

  return {
    remboursement_locataire: remboursement_part_proprietaire,
    retenu_par_lofia,
    retenu_du_proprietaire: remboursement_part_proprietaire,
    pourcentage_rembourse: montant_total > 0
      ? Math.round((remboursement_part_proprietaire / montant_total) * 100)
      : 0,
    palier,
    heures_avant_arrivee,
  }
}

export function getPalierLabel(palier: PalierAnnulation): string {
  switch (palier) {
    case 'retractation': return 'Fenêtre de rétractation (2h)'
    case 'standard_72h': return 'Annulation > 72h avant arrivée'
    case 'standard_24_72h': return 'Annulation 24h–72h avant arrivée'
    case 'standard_moins_24h': return 'Annulation < 24h avant arrivée'
    case 'no_show': return 'Non-présentation (no-show)'
    case 'force_majeure': return 'Force majeure validée'
    case 'proprietaire': return 'Annulation par le propriétaire'
  }
}
