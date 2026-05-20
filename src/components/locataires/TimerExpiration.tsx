'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  expire_at: string | null | undefined
  label?: string
  className?: string
  onExpire?: () => void
}

function formatDuree(ms: number): string {
  if (ms <= 0) return 'Expiré'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}min`
  if (m > 0) return `${m}min ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

// CDC v2 : vert > 4h | orange 1-4h | rouge < 1h
function getCouleur(ms: number): string {
  if (ms <= 0) return 'text-gray-400'
  if (ms < 3600000) return 'text-red-600'
  if (ms < 4 * 3600000) return 'text-amber-600'
  return 'text-green-600'
}

export default function TimerExpiration({ expire_at, label, className, onExpire }: Props) {
  // Initialisé à null côté serveur pour éviter le mismatch d'hydratation
  const [ms, setMs] = useState<number | null>(null)

  useEffect(() => {
    if (!expire_at) return
    const calc = () => new Date(expire_at).getTime() - Date.now()
    setMs(calc())
    const interval = setInterval(() => {
      const remaining = calc()
      setMs(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [expire_at, onExpire])

  if (ms === null) return <div className="h-5 w-24 skeleton rounded" />

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Clock size={14} className={getCouleur(ms)} />
      <span className={cn('text-sm font-semibold tabular-nums', getCouleur(ms))}>
        {label ? `${label} : ` : ''}{formatDuree(ms)}
      </span>
    </div>
  )
}
