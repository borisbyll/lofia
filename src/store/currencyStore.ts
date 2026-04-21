'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'XOF' | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'CHF'

export const CURRENCIES: { code: Currency; label: string; flag: string; symbol: string }[] = [
  { code: 'XOF', label: 'FCFA',    flag: '🇹🇬', symbol: 'FCFA' },
  { code: 'EUR', label: 'Euro',    flag: '🇪🇺', symbol: '€'    },
  { code: 'USD', label: 'Dollar',  flag: '🇺🇸', symbol: '$'    },
  { code: 'GBP', label: 'Livre',   flag: '🇬🇧', symbol: '£'    },
  { code: 'CAD', label: 'Dollar C.', flag: '🇨🇦', symbol: 'CA$' },
  { code: 'CHF', label: 'Franc CH', flag: '🇨🇭', symbol: 'CHF' },
]

// XOF est fixé à 655.957 / EUR (parité fixe CFA depuis 1999)
const XOF_PER_EUR = 655.957

interface CurrencyState {
  selected:    Currency
  // taux depuis EUR (ex: { USD: 1.08, GBP: 0.85, ... })
  rates:       Record<string, number>
  lastFetched: number | null
  setSelected: (c: Currency) => void
  fetchRates:  () => Promise<void>
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      selected:    'XOF',
      rates:       {},
      lastFetched: null,

      setSelected: (c) => set({ selected: c }),

      fetchRates: async () => {
        const now = Date.now()
        const { lastFetched } = get()
        // Rafraîchir seulement si le cache est expiré (1h)
        if (lastFetched && now - lastFetched < 60 * 60 * 1000) return
        try {
          const res = await fetch(
            'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CAD,CHF'
          )
          if (!res.ok) return
          const data = await res.json()
          set({ rates: data.rates ?? {}, lastFetched: now })
        } catch {
          // Silencieux — on garde les taux cachés
        }
      },
    }),
    {
      name: 'lofia-currency',
      partialState: (s: CurrencyState) => ({ selected: s.selected, rates: s.rates, lastFetched: s.lastFetched }),
    } as any,
  )
)

// ── Helpers de conversion ──────────────────────────────────────────

export function convertFromXOF(amount: number, to: Currency, rates: Record<string, number>): number {
  if (to === 'XOF') return amount
  const eur = amount / XOF_PER_EUR
  if (to === 'EUR') return eur
  return eur * (rates[to] ?? 1)
}

export function formatConverted(amount: number, to: Currency, rates: Record<string, number>): string {
  const converted = convertFromXOF(amount, to, rates)
  const currency  = CURRENCIES.find(c => c.code === to)!

  if (to === 'XOF') {
    return `${Math.round(converted).toLocaleString('fr-FR')} FCFA`
  }

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: to,
    maximumFractionDigits: 0,
  }).format(Math.round(converted))
}
