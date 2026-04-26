'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ArrowLeft, Calendar, Zap, Clock } from 'lucide-react'
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

function TimerArrivee({ dateArrivee }: { dateArrivee: string }) {
  const calcDiff = () => {
    const ms = new Date(dateArrivee).getTime() - Date.now()
    if (ms <= 0) return null
    const totalSec = Math.floor(ms / 1000)
    const j = Math.floor(totalSec / 86400)
    const h = Math.floor((totalSec % 86400) / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return { j, h, m, s, totalHeures: ms / (1000 * 3600) }
  }

  const [diff, setDiff] = useState(calcDiff)

  useEffect(() => {
    const id = setInterval(() => setDiff(calcDiff()), 1000)
    return () => clearInterval(id)
  }, [dateArrivee])

  if (!diff) return <span className="text-red-600 font-semibold">Arrivée dépassée</span>

  const color = diff.totalHeures > 72
    ? 'text-green-700'
    : diff.totalHeures > 24
    ? 'text-amber-700'
    : 'text-red-700'

  return (
    <div className={`flex items-center gap-1.5 font-mono font-bold text-base ${color}`}>
      <Clock size={15} />
      {diff.j > 0 && <span>{diff.j}j </span>}
      <span>{String(diff.h).padStart(2, '0')}h </span>
      <span>{String(diff.m).padStart(2, '0')}min </span>
      <span>{String(diff.s).padStart(2, '0')}s</span>
    </div>
  )
}

export default function AnnulationClient({ reservation }: Props) {
  const router = useRouter()
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  const [etapeConfirm, setEtapeConfirm] = useState(false)

  const bien = reservation.biens

  const annuler = async () => {
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
  const moinsDe24h  = heuresAvant < 24 && heuresAvant > 0
  const depassee    = heuresAvant <= 0

  if (depassee) {
    return (
      <div className="min-h-screen bg-cream pb-nav">
        <div className="wrap py-6 max-w-xl mx-auto text-center space-y-4">
          <AlertCircle size={40} className="text-red-500 mx-auto" />
          <p className="font-bold text-brun-nuit">Cette réservation est déjà passée et ne peut plus être annulée.</p>
          <Link href="/mon-espace/reservations" className="btn btn-outline inline-flex">Mes réservations</Link>
        </div>
      </div>
    )
  }

  // Étape 2 — double confirmation
  if (etapeConfirm) {
    const heures = heuresAvant
    const remb = heures > 72
      ? Math.round((reservation.montant_proprio ?? 0) * 0.7)
      : heures >= 24
      ? Math.round((reservation.montant_proprio ?? 0) * 0.5)
      : 0

    return (
      <div className="min-h-screen bg-cream pb-nav">
        <div className="wrap py-6 max-w-xl mx-auto space-y-5">
          <button onClick={() => setEtapeConfirm(false)} className="inline-flex items-center gap-1.5 text-sm text-brun-doux hover:text-primary-500">
            <ArrowLeft size={14} /> Retour
          </button>

          <div className="dashboard-card bg-red-50 border-red-200 space-y-3 text-center">
            <AlertCircle size={36} className="text-red-500 mx-auto" />
            <h2 className="font-black text-brun-nuit text-lg">Êtes-vous sûr(e) ?</h2>
            {remb > 0 ? (
              <p className="text-sm text-brun-nuit">
                Vous serez remboursé de <strong className="text-green-700">{formatPrix(remb)}</strong> sous 48h.
              </p>
            ) : (
              <p className="text-sm text-red-700 font-semibold">
                ⚠️ Aucun remboursement selon notre politique d&apos;annulation.
              </p>
            )}
            <p className="text-xs text-brun-doux">Cette action est irréversible.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={annuler}
                disabled={loading}
                className="btn btn-danger flex-1 justify-center"
              >
                {loading ? 'Annulation…' : 'Oui, annuler définitivement'}
              </button>
              <button onClick={() => setEtapeConfirm(false)} className="btn btn-outline flex-1 justify-center">
                Non, revenir
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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

        {/* Timer temps avant arrivée — CDC §4.3 */}
        <div className="dashboard-card">
          <p className="text-xs text-brun-doux mb-1.5 font-semibold uppercase tracking-wide">⏱️ Temps avant votre arrivée</p>
          <TimerArrivee dateArrivee={reservation.date_debut} />
          <div className="flex items-center gap-3 mt-3 text-sm">
            <Calendar size={14} className="text-primary-500 shrink-0" />
            <span className="text-brun-doux">
              {new Date(reservation.date_debut).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Politique applicable */}
        <div>
          <p className="text-xs font-semibold text-brun-doux uppercase tracking-wide mb-2">Conditions d&apos;annulation applicables</p>
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
              Demander une annulation exceptionnelle →
            </Link>
          </div>
        </div>

        {/* Avertissement < 24h */}
        {moinsDe24h && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700 font-semibold">
              ⚠️ ANNULATION DE DERNIÈRE MINUTE — Votre paiement de {formatPrix(reservation.prix_total)} sera intégralement conservé. Aucun remboursement possible.
            </p>
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
              onClick={() => setEtapeConfirm(true)}
              disabled={!confirme}
              className="btn btn-danger flex-1 justify-center disabled:opacity-50"
            >
              Confirmer l&apos;annulation
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
