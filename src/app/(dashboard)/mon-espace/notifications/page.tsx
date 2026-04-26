'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { cn, formatRelative } from '@/lib/utils'
import type { Notification } from '@/types/immobilier'

const ICON_BY_TYPE: Record<string, string> = {
  // Réservations
  reservation_nouvelle:      '🏠',
  reservation_confirmee:     '✅',
  reservation_annulee:       '❌',
  reservation:               '🏠',   // type DB (confirmer_arrivee trigger)
  // Paiements
  paiement_recu:             '💰',
  liberation_fonds:          '💸',
  paiement:                  '💰',   // type DB legacy (liberer_fonds + confirm-fedapay)
  // Biens
  bien_approuve:             '✅',
  bien_rejete:               '❌',
  bien_signale:              '🚨',
  signalement:               '🚨',   // type DB (auto-suspend trigger)
  // Messages & avis
  message_nouveau:           '💬',
  avis_nouveau:              '⭐',
  // Identité
  identite_verifiee:         '🛡️',
}

function notifIcon(type: string) {
  return ICON_BY_TYPE[type] ?? '🔔'
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const [notifs,  setNotifs]  = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    loadNotifs()

    const channel = supabase
      .channel(`notifs-page-${user.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        setNotifs(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const loadNotifs = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifs(data ?? [])
    setLoading(false)
  }

  const markOne = async (id: string) => {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }

  const markAll = async () => {
    if (!user) return
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false)
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
  }

  const nonLues = notifs.filter(n => !n.lu).length

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full pb-24 lg:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Notifications</h1>
          {nonLues > 0 && (
            <p className="text-sm text-primary-600 font-semibold mt-0.5">
              {nonLues} non lue{nonLues > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {nonLues > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 border border-primary-200 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCheck size={13} /> Tout marquer lu
          </button>
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary-400" />
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-center">
          <Bell size={40} className="text-gray-200 mb-3" />
          <p className="text-sm font-semibold text-gray-400">Aucune notification</p>
          <p className="text-xs text-gray-300 mt-1">Vos alertes apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {notifs.map(n => (
            <Link
              key={n.id}
              href={`/mon-espace/notifications/${n.id}`}
              onClick={() => { if (!n.lu) markOne(n.id) }}
              className={cn(
                'flex items-start gap-3 px-4 py-4 hover:bg-gray-50 transition-colors',
                !n.lu && 'bg-primary-50/40'
              )}
            >
              {/* Icône emoji */}
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0',
                !n.lu ? 'bg-primary-100' : 'bg-gray-100'
              )}>
                {notifIcon((n as any).type ?? '')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn(
                    'text-sm leading-snug',
                    !n.lu ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                  )}>
                    {n.titre}
                  </p>
                  {!n.lu && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-1.5" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.corps}</p>
                <p className="text-[10px] text-gray-400 mt-1.5">{formatRelative(n.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {notifs.length > 0 && (
        <p className="text-center text-xs text-gray-400 mt-4">
          {notifs.length} notification{notifs.length > 1 ? 's' : ''} affichée{notifs.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
