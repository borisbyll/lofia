import { StrictMode } from 'react'
import { createRoot }  from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { Toaster }     from 'react-hot-toast'
import './index.css'
import App             from './App'
import { supabase }    from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

// Initialise l'auth Supabase avant le rendu
supabase.auth.onAuthStateChange((_event, session) => {
  const { setUser, loadProfile } = useAuthStore.getState()
  if (session?.user) {
    setUser(session.user)
    loadProfile(session.user.id)
  } else {
    setUser(null)
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '12px', fontSize: '14px', fontWeight: 600 },
          success: { iconTheme: { primary: '#059669', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </HelmetProvider>
  </StrictMode>,
)
