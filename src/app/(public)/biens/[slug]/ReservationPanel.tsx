'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2, Send, X, MessageSquare, ChevronDown, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'
import CalendrierDisponibilite from '@/components/reservations/CalendrierDisponibilite'

interface Props { bien: Bien }
interface Selection { dateArrivee: string; dateDepart: string; nbNuits: number; total: number }

export default function ReservationPanel({ bien }: Props) {
  const { user } = useAuthStore()
  const router = useRouter()
  const [showCal,   setShowCal]   = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [message,   setMessage]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [showMsg,   setShowMsg]   = useState(false)
  const [isUrgent,  setIsUrgent]  = useState(false)

  const isInstantanee = bien.mode_reservation === 'instantanee'
  const prixBase = selection ? bien.prix * selection.nbNuits : 0

  const handleSimulerInstantanee = async () => {
    if (!user) { toast.error('Connectez-vous pour réserver'); router.push(`/connexion?next=/biens/${bien.slug}`); return }
    if (!selection) { setShowCal(true); return }
    setLoading(true)
    try {
      const res = await fetch('/api/simuler-paiement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'instantanee',
          bien_id: bien.id,
          date_arrivee: selection.dateArrivee,
          date_depart: selection.dateDepart,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur simulation'); return }
      router.push(`/reservations/succes/${data.reservation_id}`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  const handleReserver = async () => {
    if (!user) {
      toast.error('Connectez-vous pour réserver')
      router.push(`/connexion?next=/biens/${bien.slug}`)
      return
    }
    if (!selection) { setShowCal(true); return }
    setLoading(true)
    try {
      if (isInstantanee) {
        // §1.3 — Paiement immédiat sans validation proprio
        const res = await fetch('/api/reservations/creer-instantanee', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bien_id:      bien.id,
            date_arrivee: selection.dateArrivee,
            date_depart:  selection.dateDepart,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Erreur lors de la réservation')
        window.location.href = data.payment_url
      } else {
        // §1.2 — Sur demande (proprio confirme en premier)
        const res = await fetch('/api/reservations/creer-demande', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bien_id:      bien.id,
            date_arrivee: selection.dateArrivee,
            date_depart:  selection.dateDepart,
            message:      message.trim() || null,
            is_urgent:    isUrgent,
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (res.status === 409 && data.demande_id) {
            toast.error('Vous avez déjà une demande en cours pour ce bien')
            router.push(`/reservations/demandes/${data.demande_id}`)
            return
          }
          throw new Error(data.error ?? 'Erreur lors de la demande')
        }
        toast.success('Demande envoyée ! Le propriétaire va répondre dans les 48h.')
        router.push(`/reservations/demandes/${data.demande_id}`)
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la réservation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm">

      {/* Prix + badge mode */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-baseline gap-1.5 mb-0.5">
          <span className="text-2xl font-black prix">{formatPrix(bien.prix)}</span>
          <span className="text-sm text-brun-doux">/nuit</span>
        </div>
        {isInstantanee ? (
          <p className="text-[10px] flex items-center gap-1 font-semibold text-emerald-600">
            <Zap size={9} />
            Réservation instantanée — paiement direct
          </p>
        ) : (
          <p className="text-[10px] text-brun-doux flex items-center gap-1">
            <Send size={9} />
            Le proprio confirme avant tout paiement
          </p>
        )}
      </div>

      {/* Dates sélectionnées (résumé) */}
      {selection ? (
        <div className="mx-4 mb-3 flex items-center justify-between bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 text-xs">
          <div>
            <span className="font-semibold text-brun-nuit">
              {new Date(selection.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              {' → '}
              {new Date(selection.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
            </span>
            <span className="text-brun-doux ml-2">· {selection.nbNuits} nuit{selection.nbNuits > 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => { setSelection(null); setShowCal(false) }}
            className="text-brun-doux hover:text-primary-500 ml-2 shrink-0"
            aria-label="Effacer la sélection"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        /* Bouton ouvrir calendrier */
        <button
          onClick={() => setShowCal(v => !v)}
          className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center justify-between border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-brun-doux hover:border-primary-300 hover:bg-primary-50/40 transition-all"
        >
          <span className="flex items-center gap-2">
            <Calendar size={14} className="text-primary-400" />
            Choisir les dates
          </span>
          <ChevronDown size={14} className={showCal ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      )}

      {/* Modale calendrier — positionnée fixe au-dessus du footer */}
      {showCal && !selection && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowCal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <p className="font-bold text-sm text-brun-nuit">Choisir les dates</p>
                <p className="text-[10px] text-brun-doux">{bien.titre}</p>
              </div>
              <button
                onClick={() => setShowCal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Fermer"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <CalendrierDisponibilite
                bienId={bien.id}
                prixNuit={bien.prix}
                onSelect={(da, dd, nb) => {
                  setSelection({ dateArrivee: da, dateDepart: dd, nbNuits: nb, total: nb * bien.prix })
                  setShowCal(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Récap prix + message */}
      {selection && (
        <div className="px-4 pb-3 space-y-2.5">
          <div className="rounded-xl px-3 py-2.5 text-xs" style={{ background: '#FAE8EC' }}>
            <div className="flex justify-between" style={{ color: '#7a5c3a' }}>
              <span>{formatPrix(bien.prix)} × {selection.nbNuits} nuit{selection.nbNuits > 1 ? 's' : ''}</span>
              <span>{formatPrix(prixBase)}</span>
            </div>
            <div className="flex justify-between font-black border-t mt-2 pt-2" style={{ borderColor: '#E8909F', color: '#1a0a00' }}>
              <span>Total estimé</span>
              <span className="prix">{formatPrix(prixBase)}</span>
            </div>
          </div>

          <button
            onClick={() => setShowMsg(v => !v)}
            className="flex items-center gap-1.5 text-[10px] text-brun-doux hover:text-primary-500 transition-colors"
          >
            <MessageSquare size={10} />
            {showMsg ? 'Masquer le message' : 'Ajouter un message (optionnel)'}
          </button>
          {showMsg && (
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Présentez-vous, donnez des détails sur votre séjour…"
              className="input-field resize-none text-xs"
            />
          )}
        </div>
      )}

      {/* Option urgence — uniquement en mode Sur demande */}
      {!isInstantanee && (
        <div className="px-4 pb-3">
          <button
            type="button"
            onClick={() => setIsUrgent(v => !v)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 transition-all text-left ${
              isUrgent
                ? 'border-orange-400 bg-orange-50'
                : 'border-gray-100 bg-gray-50 hover:border-orange-200'
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isUrgent ? 'bg-orange-400' : 'bg-gray-200'}`}>
              <Zap size={15} className={isUrgent ? 'text-white' : 'text-gray-500'} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold ${isUrgent ? 'text-orange-700' : 'text-gray-600'}`}>
                Demande urgente
              </p>
              <p className={`text-[10px] ${isUrgent ? 'text-orange-500' : 'text-gray-400'}`}>
                {isUrgent ? '⚡ Réponse garantie en 8h max' : 'Le propriétaire répond en 48h'}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${isUrgent ? 'bg-orange-400 border-orange-400' : 'border-gray-300'}`} />
          </button>
        </div>
      )}

      {/* CTA principal */}
      <div className="px-4 pb-4 space-y-2">
        <button
          onClick={handleReserver}
          disabled={loading}
          className={`w-full justify-center gap-2 btn ${
            isInstantanee
              ? 'btn-primary'
              : isUrgent
              ? 'bg-orange-500 hover:bg-orange-600 text-white border-0'
              : 'btn-primary'
          }`}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> {isInstantanee ? 'Redirection…' : 'Envoi…'}</>
            : selection
            ? isInstantanee
              ? <><Zap size={15} /> Payer maintenant</>
              : isUrgent
              ? <><Zap size={15} /> Envoyer en urgence</>
              : <><Send size={15} /> Envoyer la demande</>
            : <><Calendar size={15} /> Réserver</>
          }
        </button>
        {isInstantanee && selection && (
          <button
            onClick={handleSimulerInstantanee}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-amber-300 text-amber-700 text-xs font-semibold hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : '🧪'}
            Simuler le paiement (sandbox)
          </button>
        )}
        <p className="text-[9px] text-center text-brun-doux">
          {isInstantanee
            ? '⚡ Paiement immédiat · Dates bloquées instantanément · FedaPay'
            : isUrgent
            ? '⚡ Urgence · Le proprio a 8h pour répondre'
            : 'Aucun débit avant confirmation · FedaPay'
          }
        </p>
      </div>
    </div>
  )
}
