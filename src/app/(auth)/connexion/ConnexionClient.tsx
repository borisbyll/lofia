'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

export default function ConnexionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loadProfile } = useAuthStore()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { toast.error('Remplissez tous les champs'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('Invalid login')) toast.error('Email ou mot de passe incorrect')
        else toast.error(error.message)
        return
      }
      if (data.user) await loadProfile(data.user.id)
      toast.success('Bienvenue !')
      const next = searchParams.get('next') || '/'
      router.push(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-primary-50"
        style={{ boxShadow: '0 24px 64px rgba(139,26,46,.12)' }}
      >
        {/* En-tête */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-black mb-1" style={{ color: '#1a0a00' }}>Connexion</h1>
          <p className="text-sm" style={{ color: '#7a5c3a' }}>Accédez à votre espace LOFIA.</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl mb-5 sm:mb-6 p-1" style={{ background: '#FAE8EC' }}>
          <Link
            href="/inscription"
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center transition-colors"
            style={{ color: '#7a5c3a' }}
          >
            Inscription
          </Link>
          <div
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-center text-white"
            style={{ background: '#8B1A2E' }}
          >
            Connexion
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="kofi@example.com"
                className="input-field pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-field mb-0">Mot de passe</label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs font-semibold hover:underline"
                style={{ color: '#8B1A2E' }}
              >
                Oublié ?
              </Link>
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10 pr-12"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors"
                style={{ color: '#7a5c3a' }}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary w-full justify-center gap-2 mt-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-sm" style={{ color: '#7a5c3a' }}>
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="font-bold hover:underline" style={{ color: '#8B1A2E' }}>
              S&apos;inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
