'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Info } from 'lucide-react'
import { formatPrix } from '@/lib/utils'
import {
  calculerRemboursement,
  getPalierLabel,
} from '@/lib/reservations/calcul-remboursement'

interface Props {
  dateArrivee: string
  dateReservation: string
  montantTotal: number
  commissionLofia: number
  montantProprietaire: number
}

export default function PolitiqueAnnulation({
  dateArrivee,
  dateReservation,
  montantTotal,
  commissionLofia,
  montantProprietaire,
}: Props) {
  const [maintenant, setMaintenant] = useState(new Date())

  // Mise à jour chaque minute
  useEffect(() => {
    const timer = setInterval(() => setMaintenant(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const dateArr = new Date(dateArrivee)
  const dateResa = new Date(dateReservation)

  const resultat = calculerRemboursement({
    montant_total: montantTotal,
    commission_lofia: commissionLofia,
    montant_proprietaire: montantProprietaire,
    date_arrivee: dateArr,
    date_reservation: dateResa,
    date_annulation: maintenant,
    type: 'standard',
  })

  const heuresRestantes = resultat.heures_avant_arrivee
  const joursRestants = Math.floor(heuresRestantes / 24)
  const heuresReste = Math.floor(heuresRestantes % 24)
  const estUrgent = heuresRestantes < 24
  const estNegatif = heuresRestantes < 0

  const tempsLabel = estNegatif
    ? 'Séjour en cours ou passé'
    : joursRestants > 0
    ? `${joursRestants}j ${heuresReste}h avant l'arrivée`
    : `${heuresReste}h avant l'arrivée`

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${estUrgent ? 'border-red-200 bg-red-50' : 'border-primary-100 bg-primary-50'}`}>
      <div className="flex items-start gap-2">
        {estUrgent
          ? <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          : <Info size={16} className="text-primary-500 mt-0.5 shrink-0" />
        }
        <div className="flex-1">
          <p className="text-xs font-semibold text-brun-nuit">{tempsLabel}</p>
          <p className="text-xs text-brun-doux mt-0.5">{getPalierLabel(resultat.palier)}</p>
        </div>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-brun-doux">
          <span>Montant payé</span>
          <span className="font-semibold text-brun-nuit">{formatPrix(montantTotal)}</span>
        </div>
        {resultat.remboursement_locataire > 0 ? (
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Remboursement ({resultat.pourcentage_rembourse}%)</span>
            <span>{formatPrix(resultat.remboursement_locataire)}</span>
          </div>
        ) : (
          <div className="flex justify-between font-bold text-red-600">
            <span>Remboursement</span>
            <span>Aucun remboursement</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-brun-doux pt-1 border-t border-primary-100">
          <span>Retenu par LOFIA</span>
          <span>{formatPrix(resultat.retenu_par_lofia)}</span>
        </div>
      </div>

      <p className="text-[10px] text-brun-doux">
        Remboursement effectué sous 48h sur votre mode de paiement initial.
      </p>
    </div>
  )
}
