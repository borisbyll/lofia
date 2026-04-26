'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2, Send, X, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { Bien } from '@/types/immobilier'
import CalendrierDisponibilite from '@/components/reservations/CalendrierDisponibilite'

interface Props { bien: Bien }
interface Selection { dateArrivee: string; dateDepart: string; nbNuits: number; total: number }

export default function ReservationPanel({ bien }: Props) {
  const { user, loading: authLoading } = useAuthStore()
  const router = useRouter()
  const [selection,    setSelection]    = useState<Selection | null>(null)
  const [message,      setMessage]      = useState('')
  const [loading,      setLoading]      = useState(false)
  const [showMsg,      setShowMsg]      = useState(false)
  const [showCalModal, setShowCalModal] = useState(false)

  const prixBase = selection ? bien.prix * selection.nbNuits : 0
  const total    = prixBase

  // CDC v2 §1.2 — Mode "Sur demande" : le proprio confirme avant tout paiement
  const handleDemandeReservation = async () => {
    if (!user) {
      toast.error('Connectez-vous pour réserver')
      router.push(`/connexion?next=/biens/${bien.slug}`)
      return
    }
    if (!selection) return
    setLoading(true)
    try {
      const res = await fetch('/api/reservations/creer-demande', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bien_id:     bien.id,
          date_arrivee: selection.dateArrivee,
          date_depart:  selection.dateDepart,
          message:      message.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Demande déjà en cours → rediriger vers la demande existante
        if (res.status === 409 && data.demande_id) {
          toast.error('Vous avez déjà une demande en cours pour ce bien')
          router.push(`/reservations/demandes/${data.demande_id}`)
          return
        }
        throw new Error(data.error ?? 'Erreur lors de la demande')
      }
      toast.success('Demande envoyée ! Le propriétaire va répondre dans les 12h.')
      router.push(`/reservations/demandes/${data.demande_id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la demande')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white border-2 border-primary-500 rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-black text-brun-nuit text-xl">
            <span className="prix">{formatPrix(bien.prix)}</span>
            <span className="text-sm font-normal text-brun-doux ml-1">/nuit</span>
          </p>
          <p className="text-[11px] text-brun-doux mt-0.5 flex items-center gap-1">
            <Send size={10} />
            Le propriétaire confirme votre demande avant le paiement
          </p>
        </div>

        {/* Calendrier interactif */}
        <CalendrierDisponibilite
          bienId={bien.id}
          prixNuit={bien.prix}
          onSelect={(da, dd, nb) => setSelection({ dateArrivee: da, dateDepart: dd, nbNuits: nb, total: nb * bien.prix })}
        />

        {/* Dates sélectionnées */}
        {selection && (
          <div className="flex items-center justify-between bg-primary-50 rounded-xl px-3 py-2 text-sm">
            <span className="font-semibold text-brun-nuit">
              {new Date(selection.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              {' → '}
              {new Date(selection.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              <span className="text-xs text-brun-doux ml-2">· {selection.nbNuits} nuit{selection.nbNuits > 1 ? 's' : ''}</span>
            </span>
            <button onClick={() => setSelection(null)} className="text-brun-doux hover:text-primary-500">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Récap prix */}
        {selection && (
          <div className="rounded-xl p-3 space-y-1.5 text-sm" style={{ background: '#FAE8EC' }}>
            <div className="flex justify-between" style={{ color: '#7a5c3a' }}>
              <span>{formatPrix(bien.prix)} × {selection.nbNuits} nuit{selection.nbNuits > 1 ? 's' : ''}</span>
              <span>{formatPrix(prixBase)}</span>
            </div>
            <div className="flex justify-between font-black border-t pt-2" style={{ borderColor: '#E8909F', color: '#1a0a00' }}>
              <span>Total estimé</span>
              <span className="prix">{formatPrix(total)}</span>
            </div>
          </div>
        )}

        {/* Message optionnel */}
        {selection && (
          <div>
            <button
              onClick={() => setShowMsg(v => !v)}
              className="flex items-center gap-1.5 text-xs text-brun-doux hover:text-primary-500 transition-colors"
            >
              <MessageSquare size={12} />
              {showMsg ? 'Masquer le message' : 'Ajouter un message au propriétaire (optionnel)'}
            </button>
            {showMsg && (
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Présentez-vous, donnez des détails sur votre séjour…"
                className="input-field resize-none mt-2 text-sm"
              />
            )}
          </div>
        )}

        <button
          onClick={handleDemandeReservation}
          disabled={loading || !selection}
          className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {loading ? 'Envoi…' : selection ? 'Envoyer la demande' : 'Sélectionnez les dates'}
        </button>

        {/* Voir disponibilités */}
        {!authLoading && user && (
          <button
            onClick={() => setShowCalModal(true)}
            className="w-full text-xs text-center text-brun-doux hover:text-primary-500 underline underline-offset-2 transition-colors"
          >
            Voir toutes les disponibilités
          </button>
        )}

        <p className="text-[10px] text-center text-brun-doux">
          Aucun débit avant confirmation du propriétaire · Paiement via FedaPay
        </p>
      </div>

      {/* Modal calendrier complet */}
      {showCalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-black text-brun-nuit">Disponibilités</h3>
              <button onClick={() => setShowCalModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-4">
              <CalendrierDisponibilite bienId={bien.id} readOnly />
            </div>
            <div className="p-4 pt-0">
              <button onClick={() => setShowCalModal(false)} className="btn btn-primary w-full justify-center">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
