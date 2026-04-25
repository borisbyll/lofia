'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate } from '@/lib/utils'
import TrackerDemandeReservation from '@/components/locataires/TrackerDemandeReservation'
import TimerExpiration from '@/components/locataires/TimerExpiration'

interface Props { demande: any }

export default function DemandeDetailClient({ demande: initial }: Props) {
  const router = useRouter()
  const [statut, setStatut] = useState(initial.statut)
  const [annulation, setAnnulation] = useState(false)
  const [loading, setLoading] = useState(false)

  const bien = Array.isArray(initial.biens) ? initial.biens[0] : initial.biens
  const photo = bien?.photo_principale ?? bien?.photos?.[0] ?? null

  const handleAnnuler = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/reservations/annuler-demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demande_id: initial.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Demande annulée')
      router.push('/mon-espace/reservations')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
      setAnnulation(false)
    }
  }

  const estActif = ['en_attente', 'confirmee'].includes(statut)

  return (
    <div className="min-h-screen bg-cream py-8 px-4">
      <div className="max-w-lg mx-auto space-y-4">

        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500 transition-colors">
          <ChevronLeft size={16} /> Retour
        </button>

        {/* Carte bien */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="relative h-36 bg-or-pale">
            {photo && <Image src={photo} alt={bien?.titre ?? ''} fill className="object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-white font-bold text-base leading-tight">{bien?.titre}</p>
              {bien?.ville && <p className="text-white/80 text-xs">{bien.ville}</p>}
            </div>
          </div>

          <div className="p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-400">Réf : LOFIA-DEM-{initial.id.slice(0, 8).toUpperCase()}</p>
                <p className="text-sm font-semibold text-brun-nuit mt-0.5">
                  {formatDate(initial.date_arrivee)} → {formatDate(initial.date_depart)}
                </p>
                <p className="text-xs text-brun-doux">{initial.nb_nuits} nuit{initial.nb_nuits > 1 ? 's' : ''}</p>
              </div>
              <p className="font-black text-primary-500 text-lg">{formatPrix(initial.montant_total)}</p>
            </div>

            {/* Tracker temps réel */}
            <TrackerDemandeReservation
              demande={initial}
              onStatutChange={setStatut}
            />
          </div>
        </div>

        {/* Timer en_attente */}
        {statut === 'en_attente' && (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
            <p className="text-sm font-semibold text-brun-nuit mb-2">Délai de réponse du propriétaire</p>
            <TimerExpiration expire_at={initial.expire_at} label="Expire dans" />
          </div>
        )}

        {/* Timer paiement si confirmée */}
        {statut === 'confirmee' && initial.lien_paiement_expire_at && (
          <div className="bg-white rounded-2xl border border-green-100 shadow-sm p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-green-800 mb-1">🎉 Confirmée — Payez maintenant !</p>
              <TimerExpiration expire_at={initial.lien_paiement_expire_at} label="Lien expire dans" />
            </div>
            <button
              onClick={() => router.push(`/reservations/payer/${initial.id}`)}
              className="btn btn-primary w-full justify-center"
            >
              💳 Payer {formatPrix(initial.montant_total)} maintenant
            </button>
          </div>
        )}

        {/* Annuler */}
        {estActif && !annulation && (
          <button
            onClick={() => setAnnulation(true)}
            className="w-full text-sm text-red-500 hover:text-red-700 py-2 transition-colors"
          >
            Annuler cette demande
          </button>
        )}

        {annulation && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">Confirmer l&apos;annulation ?</p>
            <p className="text-xs text-red-600">Aucun paiement n&apos;ayant été effectué, cette annulation est sans pénalité.</p>
            <div className="flex gap-2">
              <button onClick={() => setAnnulation(false)} className="btn btn-ghost flex-1 justify-center text-sm">
                <X size={14} /> Garder
              </button>
              <button onClick={handleAnnuler} disabled={loading} className="btn btn-danger flex-1 justify-center gap-2 text-sm">
                {loading && <Loader2 size={13} className="animate-spin" />}
                Oui, annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
