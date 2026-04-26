'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { cn, formatRelative } from '@/lib/utils'
import type { Notification } from '@/types/immobilier'

export default function NotifBell() {
  const { user } = useAuthStore()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) return
    loadNotifs()

    const channel = supabase
      .channel('notifs-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        payload => setNotifs(prev => [payload.new as Notification, ...prev].slice(0, 20)))
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const loadNotifs = async () => {
    if (!user) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
    setNotifs(data || [])
  }

  const markAllRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ lu: true }).eq('user_id', user.id).eq('lu', false)
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
  }

  const nonLues = notifs.filter(n => !n.lu).length

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(v => !v); if (!open && nonLues > 0) markAllRead() }}
        className="relative w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors" aria-label="Notifications">
        <Bell size={19} className="text-gray-600" />
        {nonLues > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
            {nonLues > 9 ? '9+' : nonLues}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,36,64,.16)] border border-gray-100 z-50 animate-fade-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-black text-gray-900">Notifications</p>
            {nonLues > 0 && <button onClick={markAllRead} className="text-xs text-primary-500 hover:underline font-medium">Tout marquer lu</button>}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="py-10 text-center"><Bell size={28} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Aucune notification</p></div>
            ) : notifs.map(n => (
              <Link key={n.id} href={`/mon-espace/notifications/${n.id}`} onClick={() => setOpen(false)}
                className={cn('block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors', !n.lu && 'bg-primary-50/50')}>
                <div className="flex items-start gap-2.5">
                  {!n.lu && <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 shrink-0" />}
                  <div className={cn('flex-1 min-w-0', n.lu && 'ml-4')}>
                    <p className="text-xs font-bold text-gray-900 line-clamp-1">{n.titre}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.corps}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
