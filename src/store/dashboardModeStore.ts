'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DashboardMode = 'proprietaire' | 'locataire'

interface DashboardModeState {
  mode: DashboardMode
  setMode: (mode: DashboardMode) => void
  toggle: () => void
}

export const useDashboardMode = create<DashboardModeState>()(
  persist(
    (set, get) => ({
      mode: 'proprietaire',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'proprietaire' ? 'locataire' : 'proprietaire' }),
    }),
    { name: 'lofia-dashboard-mode' }
  )
)
