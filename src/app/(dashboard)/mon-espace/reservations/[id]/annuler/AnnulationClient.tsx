'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Calendar, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPrix } from '@/lib/utils'
import PolitiqueAnnulation from '@/components/locataires/PolitiqueAnnulation'

interface Props {
  reservation: {
    id: string
    date_debut: string
    date_fin: string
    prix_total: number
    commission: number
    montant_proprio: number
    statut: string
    created_at: string
    biens: { titre: string; slug: string; photos: string[] | null; ville: string } | null
  }
}

export default function AnnulationClient({ reservation }: Props) {
  const router = useRouter()
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)

  const bien = reservation.biens

  const annuler = async () => {
    if (!confirme) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/annuler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'standard' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')
      toast.success(
        data.remboursement > 0
          ? `Annulation confirmée — Remboursement de ${formatPrix(data.remboursement)} sous 48h`
          : 'Annulation confirmée — Aucun remboursement selon notre politique'
      )
      router.push('/mon-espace/reservations')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'annulation')
    } finally {
      setLoading(false)
    }
  }

  const heuresAvant = (new Date(reservation.date_debut).getTime() - Date.now()) / (1000 * 60 * 60)
  const moinsDe24h = heuresAvant < 24 && heuresAvant > 0

  return (
    <div className="min-h-screen bg-cream pb-nav">
      <div className="wrap py-6 max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <Link href="/mon-espace/reservations" className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500 mb-3">
            <ArrowLeft size={14} /> Mes réservations
          </Link>
          <h1 className="page-title">Annuler ma réservation</h1>
          {bien && <p className="text-brun-doux text-sm mt-1">{bien.titre} · {bien.ville}</p>}
        </div>

        {/* Dates */}
        <div className="dashboard-card">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-primary-500" />
            <span className="font-semibold text-brun-nuit text-sm">Période réservée</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-brun-doux">
            <span>{new Date(reservation.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span className="text-primary-300">→</span>
            <span>{new Date(reservation.date_fin).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Politique applicable */}
        <div>
          <p className="text-xs font-semibold text-brun-doux uppercase tracking-wide mb-2">Politique applicable maintenant</p>
          <PolitiqueAnnulation
            dateArrivee={reservation.date_debut}
            dateReservation={reservation.created_at}
            montantTotal={reservation.prix_total}
            commissionLofia={reservation.commission ?? 0}
            montantProprietaire={reservation.montant_proprio ?? 0}
          />
        </div>

        {/* Lien force majeure */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-primary-50 border border-primary-100">
          <Zap size={16} className="text-primary-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-brun-nuit">Circonstance exceptionnelle ?</p>
            <p className="text-xs text-brun-doux mt-0.5">Décès, hospitalisation, convocation officielle — vous pouvez demander une annulation pour force majeure.</p>
            <Link
              href={`/mon-espace/reservations/${reservation.id}/force-majeure`}
              className="inline-block mt-2 text-xs text-primary-500 underline underline-offset-2 font-semibold hover:text-primary-600"
            >
              Demander une annulation exceptionnelle
            </Link>
          </div>
        </div>

        {/* Avertissement < 24h */}
        {moinsDe24h && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-semibold">Annulation de dernière minute — Aucun remboursement possible</p>
          </div>
        )}

        {/* Confirmation */}
        <div className="dashboard-card space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirme}
              onChange={e => setConfirme(e.target.checked)}
              className="mt-0.5 accent-primary-500"
            />
            <span className="text-sm text-brun-nuit">
              Je comprends et j&apos;accepte la politique d&apos;annulation applicable à ma réservation.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={annuler}
              disabled={!confirme || loading}
              className="btn btn-danger flex-1 justify-center disabled:opacity-50"
            >
              {loading ? 'Annulation…' : 'Confirmer l\'annulation'}
            </button>
            <Link
              href="/mon-espace/reservations"
              className="btn btn-outline flex-1 justify-center text-center"
            >
              Garder ma réservation
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
