'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, Clock, Home, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, formatDate } from '@/lib/utils'
import { LogoLofia } from '@/components/lofia/LogoLofia'
import Link from 'next/link'

interface Props {
  demande: {
    id: string
    statut: string
    date_arrivee: string
    date_depart: string
    nb_nuits: number
    montant_total: number
    message_locataire: string | null
    expire_at: string
    token_confirmation: string
    token_refus: string
    bien: { id: string; titre: string; photos: string[]; photo_principale: string | null; ville: string; quartier: string | null }
    locataire: { nom: string; avatar_url: string | null }
  }
  token: string
  isConfirmToken: boolean
}

export default function DecisionClient({ demande, token, isConfirmToken }: Props) {
  const router = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [decision, setDecision] = useState<'confirmee' | 'refusee' | null>(null)
  const [motif,    setMotif]    = useState('')

  const expired  = new Date(demande.expire_at) < new Date()
  const isActive = demande.statut === 'en_attente'
  const photo    = demande.bien.photo_principale ?? demande.bien.photos?.[0]

  const handleDecision = async (action: 'confirmer' | 'refuser') => {
    setLoading(true)
    try {
      const endpoint = action === 'confirmer'
        ? `/api/reservations/confirmer-demande?token=${demande.token_confirmation}`
        : `/api/reservations/refuser-demande`

      const res = action === 'confirmer'
        ? await fetch(endpoint)
        : await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: demande.token_refus, motif: motif.trim() || null }),
          })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur')

      setDecision(action === 'confirmer' ? 'confirmee' : 'refusee')
      setDone(true)
      toast.success(action === 'confirmer' ? 'Demande confirmée !' : 'Demande refusée')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-start py-10 px-4">
      <Link href="/" className="mb-8">
        <LogoLofia variant="dark" className="text-2xl" />
      </Link>

      <div className="w-full max-w-md">
        {/* Bien */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          {photo && (
            <img src={photo} alt={demande.bien.titre} className="w-full h-40 object-cover" />
          )}
          <div className="p-4">
            <h1 className="font-black text-gray-900 text-lg">{demande.bien.titre}</h1>
            <p className="text-sm text-brun-doux">{demande.bien.ville}{demande.bien.quartier ? ` · ${demande.bien.quartier}` : ''}</p>
          </div>
        </div>

        {/* Détails demande */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 space-y-3">
          <h2 className="font-bold text-gray-800">Détails de la demande</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-primary-50 rounded-xl p-3">
              <p className="text-xs text-brun-doux mb-0.5">Arrivée</p>
              <p className="font-bold text-brun-nuit">{formatDate(demande.date_arrivee)}</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-3">
              <p className="text-xs text-brun-doux mb-0.5">Départ</p>
              <p className="font-bold text-brun-nuit">{formatDate(demande.date_depart)}</p>
            </div>
          </div>
          <div className="flex justify-between items-center text-sm border-t pt-3">
            <span className="text-brun-doux">{demande.nb_nuits} nuit{demande.nb_nuits > 1 ? 's' : ''} · {demande.locataire.nom}</span>
            <span className="font-black text-primary-500">{formatPrix(demande.montant_total)}</span>
          </div>
          {demande.message_locataire && (
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 italic border-l-2 border-primary-200">
              &ldquo;{demande.message_locataire}&rdquo;
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-amber-600">
            <Clock size={12} />
            Expire le {new Date(demande.expire_at).toLocaleString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* État / Actions */}
        {done ? (
          <div className={`rounded-2xl p-6 text-center ${decision === 'confirmee' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
            {decision === 'confirmee' ? (
              <>
                <CheckCircle size={44} className="text-green-500 mx-auto mb-3" />
                <h2 className="font-black text-green-800 text-lg mb-1">Demande confirmée !</h2>
                <p className="text-sm text-green-700">Le locataire va recevoir une notification pour procéder au paiement. Les dates seront bloquées à la confirmation du paiement.</p>
              </>
            ) : (
              <>
                <XCircle size={44} className="text-red-400 mx-auto mb-3" />
                <h2 className="font-black text-red-800 text-lg mb-1">Demande refusée</h2>
                <p className="text-sm text-red-700">Le locataire a été informé que sa demande a été refusée.</p>
              </>
            )}
            <Link href="/mon-espace/reservations" className="btn btn-primary mt-4 inline-flex justify-center">
              Voir mes réservations
            </Link>
          </div>
        ) : !isActive ? (
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 text-center">
            <AlertTriangle size={36} className="text-amber-400 mx-auto mb-3" />
            <h2 className="font-bold text-gray-800 mb-1">
              {demande.statut === 'confirmee' ? 'Demande déjà confirmée' :
               demande.statut === 'refusee'   ? 'Demande déjà refusée' :
               demande.statut === 'expiree'   ? 'Demande expirée' :
               'Demande non disponible'}
            </h2>
            <p className="text-sm text-brun-doux">Ce lien n&apos;est plus actif.</p>
          </div>
        ) : expired ? (
          <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6 text-center">
            <Clock size={36} className="text-amber-400 mx-auto mb-3" />
            <h2 className="font-bold text-amber-800 mb-1">Demande expirée</h2>
            <p className="text-sm text-amber-700">Le délai de réponse de 12h est dépassé. La demande a été annulée automatiquement.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Votre réponse</h2>

            <div className="space-y-3">
              <div>
                <label className="label-field">Motif de refus (optionnel)</label>
                <textarea
                  value={motif}
                  onChange={e => setMotif(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Ex: Bien non disponible pour ces dates, autre raison…"
                  className="input-field resize-none text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-1">Requis uniquement si vous refusez</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDecision('refuser')}
                  disabled={loading}
                  className="btn btn-outline flex-1 justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                  Refuser
                </button>
                <button
                  onClick={() => handleDecision('confirmer')}
                  disabled={loading}
                  className="btn btn-primary flex-1 justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                  Confirmer
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-brun-doux">
              En confirmant, vous vous engagez à accueillir le locataire aux dates indiquées.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
