'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Currency = 'XOF' | 'EUR' | 'USD' | 'GBP' | 'CAD' | 'CHF'

export const CURRENCIES: { code: Currency; label: string; flag: string; symbol: string }[] = [
  { code: 'XOF', label: 'FCFA',     flag: '🇹🇬', symbol: 'FCFA' },
  { code: 'EUR', label: 'Euro',     flag: '🇪🇺', symbol: '€'    },
  { code: 'USD', label: 'Dollar',   flag: '🇺🇸', symbol: '$'    },
  { code: 'GBP', label: 'Livre',    flag: '🇬🇧', symbol: '£'    },
  { code: 'CAD', label: 'Dollar C.', flag: '🇨🇦', symbol: 'CA$' },
  { code: 'CHF', label: 'Franc CH', flag: '🇨🇭', symbol: 'CHF' },
]

// XOF est fixé à 655.957 / EUR (parité fixe CFA depuis 1999 — ne change jamais)
export const XOF_PER_EUR = 655.957

// Taux de secours depuis EUR — mis à jour par l'API, valables si hors ligne
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.08,
  GBP: 0.85,
  CAD: 1.47,
  CHF: 0.97,
}

interface CurrencyState {
  selected:    Currency
  rates:       Record<string, number>
  lastFetched: number | null
  setSelected: (c: Currency) => void
  fetchRates:  () => Promise<void>
}

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      selected:    'XOF',
      rates:       FALLBACK_RATES,  // taux de secours dès le départ
      lastFetched: null,

      setSelected: (c) => set({ selected: c }),

      fetchRates: async () => {
        const now = Date.now()
        const { lastFetched } = get()
        if (lastFetched && now - lastFetched < 60 * 60 * 1000) return
        try {
          const res = await fetch('/api/rates')
          if (!res.ok) return
          const data = await res.json()
          set({ rates: { ...FALLBACK_RATES, ...data.rates }, lastFetched: now })
        } catch {
          // On garde les taux en cache ou les fallback
        }
      },
    }),
    {
      name: 'lofia-currency',
      partialize: (s) => ({
        selected:    s.selected,
        rates:       s.rates,
        lastFetched: s.lastFetched,
      }),
    }
  )
)

// ── Conversion ──────────────────────────────────────────────────────

export function convertFromXOF(
  amount: number,
  to: Currency,
  rates: Record<string, number>
): number {
  if (to === 'XOF') return amount
  const eur = amount / XOF_PER_EUR
  if (to === 'EUR') return eur
  // Utilise le taux live si dispo, sinon le fallback — jamais 1
  const rate = rates[to] ?? FALLBACK_RATES[to] ?? 1
  return eur * rate
}

export function formatConverted(
  amount: number,
  to: Currency,
  rates: Record<string, number>
): string {
  const converted = convertFromXOF(amount, to, rates)

  if (to === 'XOF') {
    return `${Math.round(converted).toLocaleString('fr-FR')} FCFA`
  }

  return new Intl.NumberFormat('fr-FR', {
    style:              'currency',
    currency:           to,
    maximumFractionDigits: 0,
  }).format(Math.round(converted))
}
