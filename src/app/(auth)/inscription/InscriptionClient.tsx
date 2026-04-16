'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'

type Etape = 1 | 2

export default function InscriptionPage() {
  const router = useRouter()
  const [etape,     setEtape]     = useState<Etape>(1)
  const [nom,       setNom]       = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [password,  setPassword]  = useState('')
  const [password2, setPassword2] = useState('')
  const [diaspora,  setDiaspora]  = useState(false)
  const [showPwd,   setShowPwd]   = useState(false)
  const [loading,   setLoading]   = useState(false)

  const goEtape2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) { toast.error('Entrez votre nom'); return }
    if (!email.trim()) { toast.error('Entrez votre email'); return }
    setEtape(2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { toast.error('Mot de passe trop court (8 caractères min)'); return }
    if (password !== password2) { toast.error('Les mots de passe ne correspondent pas'); return }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nom, phone, is_diaspora: diaspora } },
      })
      if (error) {
        if (error.message.includes('already registered')) toast.error('Cet email est déjà utilisé')
        else toast.error(error.message)
        return
      }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nom,
          phone: phone || null,
          is_diaspora: diaspora,
          role: 'utilisateur',
        })
      }
      toast.success('Compte créé ! Vérifiez votre email.')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const progress = etape === 1 ? 50 : 100

  return (
    <div className="w-full max-w-sm mx-auto">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-primary-50"
        style={{ boxShadow: '0 24px 64px rgba(139,26,46,.12)' }}
      >
        {/* En-tête + progression */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-black" style={{ color: '#1a0a00' }}>Créer un compte</h1>
            <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: '#FAE8EC', color: '#8B1A2E' }}>
              {etape} / 2
            </span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: '#FAE8EC' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, background: '#D4A832' }}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl mb-6 p-1" style={{ background: '#FAE8EC' }}>
          <div
            className="flex-1 py-2 rounded-lg text-sm font-bold text-center text-white"
            style={{ background: '#8B1A2E' }}
          >
            Inscription
          </div>
          <Link
            href="/connexion"
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-center transition-colors"
            style={{ color: '#7a5c3a' }}
          >
            Connexion
          </Link>
        </div>

        {etape === 1 ? (
          <form onSubmit={goEtape2} className="space-y-4">
            <div>
              <label className="label-field">Nom complet *</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Kofi Amevor"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field">Email *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="kofi@example.com"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-field">Téléphone Togo (optionnel)</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+228 90 00 00 00"
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Diaspora */}
            <label
              className="flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors"
              style={{
                borderColor: diaspora ? '#8B1A2E' : '#FAE8EC',
                background: diaspora ? '#FAE8EC' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={diaspora}
                onChange={e => setDiaspora(e.target.checked)}
                className="mt-0.5"
                style={{ accentColor: '#8B1A2E' }}
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#1a0a00' }}>
                  <Globe size={14} style={{ color: '#8B1A2E' }} /> Je suis de la diaspora
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#7a5c3a' }}>Vous résidez hors du Togo</p>
              </div>
            </label>

            <button type="submit" className="btn btn-primary w-full justify-center">
              Continuer →
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-field">Mot de passe *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="input-field pl-10 pr-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
                  style={{ color: '#7a5c3a' }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs mt-1" style={{ color: '#7a5c3a' }}>
                8 caractères minimum
              </p>
            </div>

            <div>
              <label className="label-field">Confirmer le mot de passe *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#8B1A2E' }} />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                  placeholder="••••••••"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <p className="text-xs" style={{ color: '#7a5c3a' }}>
              En créant un compte vous acceptez nos{' '}
              <Link href="/conditions" className="font-semibold hover:underline" style={{ color: '#8B1A2E' }}>
                conditions d&apos;utilisation
              </Link>.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEtape(1)}
                className="btn btn-ghost flex-1 justify-center"
                style={{ color: '#7a5c3a' }}
              >
                ← Retour
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1 justify-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Création…' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm" style={{ color: '#7a5c3a' }}>
            Déjà un compte ?{' '}
            <Link href="/connexion" className="font-bold hover:underline" style={{ color: '#8B1A2E' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
