'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { LogoLofia } from '@/components/lofia/LogoLofia'
import Link from 'next/link'

export default function ReinitialiserMotDePassePage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPwd,  setShowPwd]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [checking, setChecking] = useState(true)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    // Supabase envoie ?code=... (PKCE) dans l'URL après vérification du lien email
    // On l'échange côté client pour que le browser client établisse lui-même la session
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ data, error }) => {
          if (error || !data.session) {
            setValidSession(false)
          } else {
            setValidSession(true)
          }
          setChecking(false)
          // Retirer le code de l'URL sans recharger la page
          window.history.replaceState({}, '', '/reinitialiser-mot-de-passe')
        })
    } else {
      // Pas de code → vérifier si une session est déjà active
      supabase.auth.getSession().then(({ data: { session } }) => {
        setValidSession(!!session)
        setChecking(false)
      })
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Minimum 8 caractères'); return }
    if (password !== confirm) { toast.error('Les mots de passe ne correspondent pas'); return }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setDone(true)
      // Déconnexion propre après le changement (la session recovery est invalide)
      await supabase.auth.signOut()
      setTimeout(() => router.push('/connexion'), 3000)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <LogoLofia variant="dark" className="text-3xl" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          {!validSession ? (
            <div className="text-center py-4">
              <AlertTriangle size={44} className="text-amber-400 mx-auto mb-3" />
              <h1 className="text-lg font-black text-gray-900 mb-2">Lien invalide ou expiré</h1>
              <p className="text-sm text-brun-doux mb-6">
                Ce lien de réinitialisation n&apos;est plus valide. Faites une nouvelle demande.
              </p>
              <Link href="/mot-de-passe-oublie" className="btn btn-primary w-full justify-center">
                Redemander un lien
              </Link>
            </div>
          ) : done ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-black text-gray-900 mb-2">Mot de passe mis à jour !</h1>
              <p className="text-sm text-brun-doux mb-6">
                Redirection vers la connexion dans 3 secondes…
              </p>
              <Link href="/connexion" className="btn btn-primary w-full justify-center">
                Se connecter maintenant
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-black text-gray-900 mb-1">Nouveau mot de passe</h1>
              <p className="text-sm text-brun-doux mb-6">
                Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-field">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field pl-10 pr-10"
                      autoComplete="new-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="label-field">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="input-field pl-10"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
                >
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Mise à jour…</>
                    : <><Lock size={16} /> Mettre à jour le mot de passe</>
                  }
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
