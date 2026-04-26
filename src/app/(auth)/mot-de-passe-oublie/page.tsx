'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { LogoLofia } from '@/components/lofia/LogoLofia'

export default function MotDePasseOubliePage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) { toast.error('Entrez votre adresse e-mail'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/mon-espace/profil?reset=1`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur lors de l\'envoi')
    } finally {
      setLoading(false)
    }
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
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-black text-gray-900 mb-2">E-mail envoyé !</h1>
              <p className="text-sm text-brun-doux mb-6">
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien
                de réinitialisation dans quelques minutes. Vérifiez vos spams.
              </p>
              <Link href="/connexion" className="btn btn-primary w-full justify-center">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-black text-gray-900 mb-1">Mot de passe oublié</h1>
              <p className="text-sm text-brun-doux mb-6">
                Entrez votre e-mail pour recevoir un lien de réinitialisation.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label-field">Adresse e-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="input-field pl-10"
                      autoComplete="email"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {loading ? 'Envoi…' : 'Envoyer le lien'}
                </button>
              </form>

              <Link
                href="/connexion"
                className="flex items-center justify-center gap-1.5 mt-5 text-sm text-brun-doux hover:text-primary-500 transition-colors"
              >
                <ArrowLeft size={14} />
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
