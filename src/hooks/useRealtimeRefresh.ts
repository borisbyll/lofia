'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

interface Subscription {
  table: string
  filter?: string
}

export function useRealtimeRefresh(
  channelName: string,
  subscriptions: Subscription[],
  onRefresh: () => void,
  enabled = true,
) {
  const callbackRef = useRef(onRefresh)
  callbackRef.current = onRefresh

  useEffect(() => {
    if (!enabled || !subscriptions.length) return

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
  }, [channelName, enabled])
}
