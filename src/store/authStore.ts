'use client'

import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import type { Profile, Role } from '@/types/immobilier'
import { supabase } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  profile: Profile | null
  role: Role | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  loadProfile: (userId: string) => Promise<void>
  logout: () => Promise<void>
  init: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: null,
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({
    profile,
    role: (profile?.role as Role) ?? null,
  }),

  loadProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) get().setProfile(data as Profile)
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: null })
  },

  init: async () => {
    set({ loading: true })
    // getUser() valide le token côté serveur — plus sécurisé que getSession()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      set({ user })
      await get().loadProfile(user.id)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().loadProfile(session.user.id)
      } else {
        set({ user: null, profile: null, role: null })
      }
    })
  },
}))
