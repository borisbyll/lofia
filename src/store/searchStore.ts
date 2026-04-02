import { create } from 'zustand'
import type { SearchFilters, Categorie, TypeLocation } from '@/types/immobilier'

interface SearchState extends SearchFilters {
  setFilter:    (key: keyof SearchFilters, value: SearchFilters[keyof SearchFilters]) => void
  resetFilters: () => void
}

const DEFAULTS: SearchFilters = {
  categorie:     null,
  type_location: null,
  type_bien:     null,
  ville:         null,
  quartier:      null,
  prix_min:      null,
  prix_max:      null,
  query:         '',
}

export const useSearchStore = create<SearchState>((set) => ({
  ...DEFAULTS,
  setFilter:    (key, value) => set((s) => ({ ...s, [key]: value })),
  resetFilters: () => set(DEFAULTS),
}))

// Helpers
export type { Categorie, TypeLocation }
