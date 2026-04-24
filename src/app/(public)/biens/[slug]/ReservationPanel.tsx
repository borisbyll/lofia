'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2, AlertCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { COMMISSION } from '@/lib/constants'
import type { Bien } from '@/types/immobilier'
import CalendrierDisponibilite from '@/components/reservations/CalendrierDisponibilite'

interface Props { bien: Bien }

interface Selection { dateArrivee: string; dateDepart: string; nbNuits: number; total: number }

export default function ReservationPanel({ bien }: Props) {
  const { user, loading: authLoading } = useAuthStore()
  const router    = useRouter()
  const [selection,    setSelection]    = useState<Selection | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [showCalModal, setShowCalModal] = useState(false)

  const prixBase       = selection ? bien.prix * selection.nbNuits : 0
  const commission     = Math.round(prixBase * COMMISSION.VOYAGEUR_PCT / 100)
  const total          = prixBase + commission
  const commissionHote = Math.round(prixBase * COMMISSION.HOTE_PCT / 100)
  const montantProprio = prixBase - commissionHote

  const handleReserver = async () => {
    if (!user) {
      toast.error('Connectez-vous pour réserver')
      router.push(`/connexion?next=/biens/${bien.slug}`)
      return
    }
    if (!selection) return
    setLoading(true)
    try {
      // Vérifier la disponibilité côté serveur avant d'insérer
      const checkRes = await fetch('/api/reservations/verifier-disponibilite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bien_id: bien.id, date_arrivee: selection.dateArrivee, date_depart: selection.dateDepart }),
      })
      const check = await checkRes.json()
      if (!check.disponible) {
        toast.error('Ces dates viennent d\'être réservées. Veuillez choisir d\'autres dates.')
        setSelection(null)
        return
      }

      const { data, error } = await supabase.from('reservations').insert({
        bien_id:             bien.id,
        locataire_id:        user.id,
        proprietaire_id:     bien.owner_id,
        date_debut:          selection.dateArrivee,
        date_fin:            selection.dateDepart,
        prix_nuit:           bien.prix,
        prix_total:          total,
        commission:          commission + commissionHote,
        commission_voyageur: commission,
        commission_hote:     commissionHote,
        montant_proprio:     montantProprio,
        statut:              'en_attente',
      }).select('id').single()

      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: bien.owner_id,
        type:    'reservation_nouvelle',
        titre:   'Nouvelle réservation',
        corps:   `Une réservation a été créée pour "${bien.titre}" du ${new Date(selection.dateArrivee).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au ${new Date(selection.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.`,
        lien:    '/mon-espace/reservations',
      })

      toast.success('Réservation créée ! Procédez au paiement.')
      router.push(`/mon-espace/paiement/${data.id}`)
    } catch {
      toast.error('Erreur lors de la réservation')
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
            <div className="flex justify-between text-xs" style={{ color: '#7a5c3a', opacity: 0.8 }}>
              <span>Frais de service ({COMMISSION.VOYAGEUR_PCT}%)</span>
              <span>{formatPrix(commission)}</span>
            </div>
            <div className="flex justify-between font-black border-t pt-2" style={{ borderColor: '#E8909F', color: '#1a0a00' }}>
              <span>Total</span>
              <span className="prix">{formatPrix(total)}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleReserver}
          disabled={loading || !selection}
          className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
          {loading ? 'Réservation…' : selection ? `Réserver · ${formatPrix(total)}` : 'Sélectionnez les dates'}
        </button>

        {/* Bouton voir disponibilité (utilisateur connecté uniquement) */}
        {!authLoading && user && (
          <button
            onClick={() => setShowCalModal(true)}
            className="w-full text-xs text-center text-brun-doux hover:text-primary-500 underline underline-offset-2 transition-colors"
          >
            Voir toutes les disponibilités
          </button>
        )}

        <p className="text-[10px] text-center text-brun-doux">
          Aucun débit avant confirmation · Paiement via FedaPay
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
              <p className="text-xs text-brun-doux mb-3">Consultez les dates disponibles avant de réserver.</p>
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
