'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrencyStore, CURRENCIES, type Currency } from '@/store/currencyStore'
import { cn } from '@/lib/utils'

export default function CurrencySelector() {
  const { selected, setSelected, fetchRates } = useCurrencyStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchRates() }, [fetchRates])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = CURRENCIES.find(c => c.code === selected)!

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-colors',
          'bg-white/10 hover:bg-white/20 text-white border border-white/20'
        )}
        title="Changer de devise"
      >
        <span>{current.flag}</span>
        <span className="hidden sm:inline">{current.symbol}</span>
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[160px]">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => { setSelected(c.code); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-gray-50',
                selected === c.code ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700'
              )}
            >
              <span className="text-base">{c.flag}</span>
              <span className="flex-1">{c.label}</span>
              <span className="text-xs text-gray-400 font-medium">{c.symbol}</span>
            </button>
          ))}
          <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400">
            Taux BCE — mis à jour toutes les heures
          </div>
        </div>
      )}
    </div>
  )
}
