'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Subscription {
  table: string
  filter?: string
}

/**
 * Souscrit à des changements Realtime Supabase et appelle `onRefresh` à chaque événement.
 * Nettoie automatiquement le channel au démontage ou au changement de dépendances.
 */
export function useRealtimeRefresh(
  channelName: string,
  subscriptions: Subscription[],
  onRefresh: () => void,
) {
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  useEffect(() => {
    if (!subscriptions.length) return

    let ch = supabase.channel(channelName)

    for (const sub of subscriptions) {
      ch = ch.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        } as any,
        () => callbackRef.current(),
      )
    }

    ch.subscribe()
    return () => { supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName])
}
