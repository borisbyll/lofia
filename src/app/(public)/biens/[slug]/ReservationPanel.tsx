'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatPrix, nbNuits } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { COMMISSION } from '@/lib/constants'
import type { Bien } from '@/types/immobilier'

interface Props { bien: Bien }

interface PeriodeBloquee {
  debut: string // YYYY-MM-DD
  fin:   string // YYYY-MM-DD
}

/** Vérifie si [a_debut, a_fin] chevauche [b_debut, b_fin] */
function chevauche(aDebut: string, aFin: string, bDebut: string, bFin: string) {
  return aDebut < bFin && aFin > bDebut
}

export default function ReservationPanel({ bien }: Props) {
  const { user }  = useAuthStore()
  const router    = useRouter()
  const [debut,   setDebut]   = useState('')
  const [fin,     setFin]     = useState('')
  const [loading, setLoading] = useState(false)
  const [periodes, setPeriodes] = useState<PeriodeBloquee[]>([])

  const today = new Date().toISOString().split('T')[0]

  // Charger les périodes déjà réservées (confirme + en_sejour + payées en_attente)
  useEffect(() => {
    supabase
      .from('periodes_reservees')
      .select('date_debut, date_fin')
      .eq('bien_id', bien.id)
      .gte('date_fin', today)
      .then(({ data }) => {
        if (data) setPeriodes(data.map(r => ({ debut: r.date_debut, fin: r.date_fin })))
      })
  }, [bien.id, today])

  const nuits    = debut && fin ? nbNuits(new Date(debut), new Date(fin)) : 0
  const prixBase = bien.prix * nuits
  const commission     = Math.round(prixBase * COMMISSION.VOYAGEUR_PCT / 100)
  const total          = prixBase + commission
  const commissionHote = Math.round(prixBase * COMMISSION.HOTE_PCT / 100)
  const montantProprio = prixBase - commissionHote

  // Vérifier si les dates sélectionnées chevauchent une période bloquée
  const datesIndisponibles = debut && fin
    ? periodes.some(p => chevauche(debut, fin, p.debut, p.fin))
    : false

  // Date de début min pour le champ "fin" : lendemain du début sélectionné
  const minFin = debut
    ? new Date(new Date(debut).getTime() + 86400000).toISOString().split('T')[0]
    : today

  const handleReserver = async () => {
    if (!user) { toast.error('Connectez-vous pour réserver'); router.push('/connexion'); return }
    if (!debut || !fin || nuits <= 0) { toast.error('Sélectionnez des dates valides'); return }
    if (datesIndisponibles) { toast.error('Ces dates sont déjà réservées'); return }

    setLoading(true)
    try {
      const { data, error } = await supabase.from('reservations').insert({
        bien_id:             bien.id,
        locataire_id:        user.id,
        proprietaire_id:     bien.owner_id,
        date_debut:          debut,
        date_fin:            fin,
        prix_nuit:           bien.prix,
        prix_total:          total,
        commission:          commission + commissionHote,
        commission_voyageur: commission,
        commission_hote:     commissionHote,
        montant_proprio:     montantProprio,
        statut:              'en_attente',
      }).select('id').single()

      if (error) throw error
      toast.success('Réservation créée ! Procédez au paiement.')
      router.push(`/mon-espace/paiement/${data.id}`)
    } catch {
      toast.error('Erreur lors de la réservation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border-2 border-primary-500 rounded-2xl p-5">
      <p className="font-black mb-4" style={{ color: '#1a0a00' }}>
        <span className="prix text-xl">{formatPrix(bien.prix)}</span>
        <span className="text-sm font-normal ml-1" style={{ color: '#7a5c3a' }}>/nuit</span>
      </p>

      {/* Sélection dates */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="label-field text-xs">Arrivée</label>
          <input
            type="date"
            value={debut}
            min={today}
            onChange={e => { setDebut(e.target.value); setFin('') }}
            className="input-field text-sm"
          />
        </div>
        <div>
          <label className="label-field text-xs">Départ</label>
          <input
            type="date"
            value={fin}
            min={minFin}
            onChange={e => setFin(e.target.value)}
            className="input-field text-sm"
            disabled={!debut}
          />
        </div>
      </div>

      {/* Alerte dates indisponibles */}
      {datesIndisponibles && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-xs text-red-700">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>Ces dates sont déjà réservées. Veuillez choisir d&apos;autres dates.</p>
        </div>
      )}

      {/* Périodes bloquées (info) */}
      {periodes.length > 0 && !datesIndisponibles && (
        <div className="mb-3">
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#7a5c3a' }}>Périodes non disponibles :</p>
          <div className="space-y-1">
            {periodes.slice(0, 3).map((p, i) => (
              <div key={i} className="text-xs flex items-center gap-1.5 text-red-600">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                {new Date(p.debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                {' → '}
                {new Date(p.fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
              </div>
            ))}
            {periodes.length > 3 && (
              <p className="text-xs" style={{ color: '#7a5c3a' }}>+{periodes.length - 3} autres périodes</p>
            )}
          </div>
        </div>
      )}

      {/* Récap prix */}
      {nuits > 0 && !datesIndisponibles && (
        <div className="rounded-xl p-3 mb-4 space-y-2 text-sm" style={{ background: '#FAE8EC' }}>
          <div className="flex justify-between" style={{ color: '#7a5c3a' }}>
            <span>{formatPrix(bien.prix)} × {nuits} nuit{nuits > 1 ? 's' : ''}</span>
            <span>{formatPrix(prixBase)}</span>
          </div>
          <div className="flex justify-between text-xs" style={{ color: '#7a5c3a', opacity: 0.7 }}>
            <span>Frais de service ({COMMISSION.VOYAGEUR_PCT}%)</span>
            <span>{formatPrix(commission)}</span>
          </div>
          <div
            className="flex justify-between font-black border-t pt-2"
            style={{ borderColor: '#E8909F', color: '#1a0a00' }}
          >
            <span>Total</span>
            <span className="prix">{formatPrix(total)}</span>
          </div>
        </div>
      )}

      <button
        onClick={handleReserver}
        disabled={loading || nuits <= 0 || datesIndisponibles}
        className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Calendar size={16} />}
        {loading
          ? 'Réservation…'
          : datesIndisponibles
          ? 'Dates indisponibles'
          : nuits > 0
          ? `Réserver · ${formatPrix(total)}`
          : 'Sélectionnez les dates'}
      </button>

      <p className="text-[10px] text-center mt-2" style={{ color: '#7a5c3a' }}>
        Aucun débit avant confirmation
      </p>
    </div>
  )
}
