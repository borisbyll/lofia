// SOURCE DE VÉRITÉ UNIQUE — tous les taux et prix viennent de ce fichier.
// Ne jamais hard-coder un taux ailleurs dans le code.

export const monetisation = {

  courte_duree: {
    get taux() { return Number(process.env.COMMISSION_COURTE_DUREE_TAUX ?? 9) / 100 },
    calculer: (montant: number) => {
      const taux = Number(process.env.COMMISSION_COURTE_DUREE_TAUX ?? 9) / 100
      return {
        commission_lofia:       Math.round(montant * taux),
        montant_proprietaire:   Math.round(montant * (1 - taux)),
      }
    },
  },

  longue_duree: {
    get frais_visite()    { return Number(process.env.FRAIS_VISITE_LONGUE_DUREE   ?? 5000) },
    get loyer_minimum()   { return Number(process.env.LOYER_MINIMUM_LONGUE_DUREE  ?? 25000) },
    get taux_commission() { return Number(process.env.COMMISSION_LONGUE_DUREE_TAUX ?? 30) / 100 },
    calculer_premier_paiement: (loyer_mensuel: number, depot_garantie_mois: number) => {
      const taux      = Number(process.env.COMMISSION_LONGUE_DUREE_TAUX ?? 30) / 100
      const commission = Math.round(loyer_mensuel * taux)
      const depot      = loyer_mensuel * depot_garantie_mois
      return {
        commission_lofia:     commission,
        depot_garantie:       depot,
        premier_loyer:        loyer_mensuel,
        total_locataire:      commission + depot + loyer_mensuel,
        montant_proprietaire: depot + loyer_mensuel,
      }
    },
  },

  vente: {
    frais_visite: 0, // GRATUIT pour l'acheteur
    get taux_commission() { return Number(process.env.COMMISSION_VENTE_TAUX ?? 5) / 100 },
    calculer_commission: (prix_vente: number) => {
      const taux = Number(process.env.COMMISSION_VENTE_TAUX ?? 5) / 100
      return {
        commission_lofia: Math.round(prix_vente * taux),
        taux_affiche:     `${process.env.COMMISSION_VENTE_TAUX ?? 5}%`,
      }
    },
  },

  sponsoring: {
    get actif()        { return process.env.SPONSORING_ACTIF !== 'false' },
    get prix_boost()   { return Number(process.env.PRIX_BOOST   ?? 5000) },
    get prix_premium() { return Number(process.env.PRIX_PREMIUM ?? 15000) },
  },
}
