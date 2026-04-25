'use client'

import { useEffect, useState } from 'react'
import { Clock, AlertCircle } from 'lucide-react'

interface Props {
  heureArriveePrevue: string
  dateDebut: string
}

export default function TimerNoShow({ heureArriveePrevue, dateDebut }: Props) {
  const [maintenant, setMaintenant] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setMaintenant(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const dateArriveePrevue = heureArriveePrevue
    ? new Date(`${dateDebut}T${heureArriveePrevue}`)
    : new Date(`${dateDebut}T14:00:00`)

  const diff = maintenant.getTime() - dateArriveePrevue.getTime()
  const minutesEcoulees = Math.floor(diff / 60_000)

  if (minutesEcoulees < 0) return null // Pas encore l'heure d'arrivée

  const minutesAvantRappel = Math.max(0, 120 - minutesEcoulees)
  const minutesAvantConfirmation = Math.max(0, 180 - minutesEcoulees)

  if (minutesEcoulees >= 180) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
        <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-red-700">No-show en cours de traitement</p>
          <p className="text-xs text-red-500">Le locataire ne s&apos;est pas présenté depuis plus de 3h.</p>
        </div>
      </div>
    )
  }

  if (minutesEcoulees >= 120) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-bold text-amber-700">
            No-show dans {minutesAvantConfirmation} min
          </p>
          <p className="text-xs text-amber-600">
            Un rappel a été envoyé au locataire. Sans réponse, le no-show sera confirmé.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
      <Clock size={16} className="text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-medium text-brun-nuit">
          Locataire attendu depuis {minutesEcoulees} min
        </p>
        <p className="text-xs text-brun-doux">
          Rappel automatique dans {minutesAvantRappel} min si non arrivé.
        </p>
      </div>
    </div>
  )
}
