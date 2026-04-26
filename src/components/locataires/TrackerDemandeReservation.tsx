'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, Clock, CreditCard, Home, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Demande {
  id: string
  statut: string
  expire_at: string
  lien_paiement_expire_at?: string | null
  montant_total: number
}

interface Props {
  demande: Demande
  onStatutChange?: (nouveau: string) => void
}

const ETAPES = [
  { key: 'envoyee',   label: 'Demande envoyée',      icon: CheckCircle },
  { key: 'attente',   label: 'Confirmation propriétaire', icon: Clock },
  { key: 'paiement',  label: 'Paiement',              icon: CreditCard },
  { key: 'confirme',  label: 'Réservation confirmée', icon: Home },
]

function etapeIndex(statut: string): number {
  if (['confirmee', 'payee'].includes(statut)) return statut === 'payee' ? 3 : 2
  if (statut === 'en_attente') return 1
  return 0
}

function formatTimer(ms: number): string {
  if (ms <= 0) return 'Expiré'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}min`
  if (m > 0) return `${m}min ${s}s`
  return `${s}s`
}

export default function TrackerDemandeReservation({ demande, onStatutChange }: Props) {
  const [statut, setStatut] = useState(demande.statut)
  const [now, setNow] = useState(Date.now())

  // Mise à jour toutes les secondes pour le timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Supabase Realtime — mise à jour statut sans rechargement
  useEffect(() => {
    const channel = supabase.channel(`demande-${demande.id}-${Date.now()}`)
    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'demandes_reservation', filter: `id=eq.${demande.id}` },
      payload => {
        const nouveau = payload.new?.statut
        if (nouveau && nouveau !== statut) {
          setStatut(nouveau)
          onStatutChange?.(nouveau)
        }
      }
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [demande.id, statut, onStatutChange])

  const expireMs = new Date(demande.expire_at).getTime() - now
  const paiementMs = demande.lien_paiement_expire_at
    ? new Date(demande.lien_paiement_expire_at).getTime() - now
    : null

  const etape = etapeIndex(statut)
  const estTerminee = ['payee', 'refusee', 'expiree', 'annulee_locataire', 'annulee_systeme'].includes(statut)

  return (
    <div className="space-y-4">
      {/* Tracker 4 étapes */}
      <div className="relative">
        <div className="flex items-start justify-between gap-1">
          {ETAPES.map((e, i) => {
            const Icon = e.icon
            const done = i < etape
            const active = i === etape && !estTerminee
            return (
              <div key={e.key} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                  done ? 'bg-green-500 border-green-500 text-white'
                    : active ? 'bg-primary-500 border-primary-500 text-white animate-pulse'
                    : 'bg-gray-100 border-gray-200 text-gray-400'
                )}>
                  {done ? <CheckCircle size={14} /> : active ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                </div>
                <span className={cn(
                  'text-xs text-center leading-tight',
                  done ? 'text-green-600 font-semibold'
                    : active ? 'text-primary-600 font-semibold'
                    : 'text-gray-400'
                )}>
                  {e.label}
                </span>
                {/* Connecteur */}
                {i < ETAPES.length - 1 && (
                  <div className={cn(
                    'absolute top-4 h-0.5 transition-all',
                    `left-[${12.5 + i * 25}%] w-1/4`,
                    done ? 'bg-green-400' : 'bg-gray-200'
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Statut actuel */}
      {statut === 'en_attente' && expireMs > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-amber-800">⏰ En attente de confirmation</p>
          <p className="text-xs text-amber-600 mt-0.5">
            Expire dans <span className={cn('font-bold', expireMs < 3600000 ? 'text-red-600' : 'text-amber-700')}>
              {formatTimer(expireMs)}
            </span>
          </p>
        </div>
      )}

      {statut === 'confirmee' && paiementMs !== null && (
        <div className={cn(
          'rounded-xl p-4 text-center border',
          paiementMs > 0
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        )}>
          <p className="text-sm font-semibold text-green-800">🎉 Confirmée ! Procédez au paiement</p>
          <p className="text-xs text-green-600 mt-0.5">
            {paiementMs > 0
              ? <>Lien expire dans <span className={cn('font-bold', paiementMs < 1800000 ? 'text-red-600' : '')}>{formatTimer(paiementMs)}</span></>
              : <span className="text-red-600 font-bold">Lien de paiement expiré</span>
            }
          </p>
        </div>
      )}

      {statut === 'payee' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-green-800">✅ Réservation confirmée et payée !</p>
        </div>
      )}

      {statut === 'refusee' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-red-800">Demande non retenue</p>
          <p className="text-xs text-red-600 mt-0.5">Le propriétaire n&apos;a pas pu confirmer votre demande.</p>
        </div>
      )}

      {statut === 'expiree' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-gray-600">Demande expirée</p>
          <p className="text-xs text-gray-400 mt-0.5">Le délai de réponse de 12h est dépassé.</p>
        </div>
      )}
    </div>
  )
}
