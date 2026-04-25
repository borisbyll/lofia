'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPrix } from '@/lib/utils'

interface Props {
  montant_total: number
  date_arrivee: string
  heure_arrivee?: string
  paiement_at?: string
}

function heuresAvantArrivee(dateArrivee: string, heure = '14:00'): number {
  const arrivee = new Date(`${dateArrivee}T${heure}:00`)
  return (arrivee.getTime() - Date.now()) / (1000 * 60 * 60)
}

function heuresDepuisPaiement(paiement_at?: string): number {
  if (!paiement_at) return Infinity
  return (Date.now() - new Date(paiement_at).getTime()) / (1000 * 60 * 60)
}

export default function CalculateurRemboursement({ montant_total, date_arrivee, heure_arrivee = '14:00', paiement_at }: Props) {
  const [heures, setHeures] = useState(() => heuresAvantArrivee(date_arrivee, heure_arrivee))
  const [depuisPaiement, setDepuisPaiement] = useState(() => heuresDepuisPaiement(paiement_at))

  // Recalcul toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setHeures(heuresAvantArrivee(date_arrivee, heure_arrivee))
      setDepuisPaiement(heuresDepuisPaiement(paiement_at))
    }, 60_000)
    return () => clearInterval(interval)
  }, [date_arrivee, heure_arrivee, paiement_at])

  const COMMISSION = 0.09
  const commission_lofia = Math.round(montant_total * COMMISSION)
  const montant_proprio = montant_total - commission_lofia

  // Palier 1 — rétractation (≤ 2h depuis paiement ET arrivée > 48h)
  const isRetractation = depuisPaiement <= 2 && heures > 48

  let palier: 0 | 1 | 2 | 3
  let rembourse: number
  let label: string
  let color: 'green' | 'amber' | 'red'

  if (isRetractation) {
    palier = 1
    rembourse = montant_total
    label = 'Remboursement intégral (rétractation)'
    color = 'green'
  } else if (heures > 72) {
    palier = 2
    rembourse = Math.round(montant_proprio * 0.70)
    label = 'Remboursement 70% de la part propriétaire'
    color = 'amber'
  } else if (heures >= 24) {
    palier = 2
    rembourse = Math.round(montant_proprio * 0.50)
    label = 'Remboursement 50% de la part propriétaire'
    color = 'amber'
  } else {
    palier = 2
    rembourse = 0
    label = 'Aucun remboursement (< 24h avant arrivée)'
    color = 'red'
  }

  const retenu = montant_total - rembourse

  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      color === 'green' ? 'bg-green-50 border-green-200'
        : color === 'amber' ? 'bg-amber-50 border-amber-200'
        : 'bg-red-50 border-red-200'
    )}>
      <div className="flex items-start gap-2">
        {color === 'green' && <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />}
        {color === 'amber' && <Info size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />}
        {color === 'red' && <AlertTriangle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />}
        <p className={cn(
          'text-sm font-semibold',
          color === 'green' ? 'text-green-800' : color === 'amber' ? 'text-amber-800' : 'text-red-800'
        )}>
          {label}
        </p>
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Montant payé</span>
          <span className="font-semibold">{formatPrix(montant_total)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Vous seriez remboursé</span>
          <span className={cn('font-bold', rembourse > 0 ? 'text-green-700' : 'text-red-600')}>
            {formatPrix(rembourse)}
          </span>
        </div>
        {retenu > 0 && (
          <div className="flex justify-between text-xs text-gray-400">
            <span>Retenu (LOFIA + propriétaire)</span>
            <span>{formatPrix(retenu)}</span>
          </div>
        )}
      </div>

      {palier === 1 && (
        <p className="text-xs text-green-700 bg-green-100 rounded-lg p-2">
          ✅ Vous êtes dans la fenêtre de rétractation de 2h. Remboursement intégral garanti.
        </p>
      )}
      {color === 'red' && heures <= 0 && (
        <p className="text-xs text-red-700 bg-red-100 rounded-lg p-2">
          ⚠️ Votre arrivée est passée. La politique de no-show s&apos;applique (aucun remboursement).
        </p>
      )}
    </div>
  )
}
