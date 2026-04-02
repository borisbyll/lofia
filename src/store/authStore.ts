import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile, Role } from '@/types/immobilier'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user:        User | null
  profile:     Profile | null
  role:        Role
  loading:     boolean
  loadProfile: (userId: string) => Promise<void>
  setUser:     (user: User | null) => void
  logout:      () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  profile: null,
  role:    'visiteur',
  loading: true,

  setUser: (user) => {
    if (!user) {
      set({ user: null, profile: null, role: 'visiteur', loading: false })
    } else {
      set({ user })
    }
  },

  loadProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      set({ profile: data, role: data.role as Role, loading: false })
    } else {
      set({ loading: false })
    }
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, role: 'visiteur' })
  },
}))
