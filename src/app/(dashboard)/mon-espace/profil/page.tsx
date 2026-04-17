'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Phone, Mail, Globe, Camera, Shield, CheckCircle, Loader2, Upload, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

export default function ProfilPage() {
  const { user, profile, loadProfile, logout } = useAuthStore()
  const router = useRouter()
  const [nom,       setNom]       = useState('')
  const [phone,     setPhone]     = useState('')
  const [bio,       setBio]       = useState('')
  const [diaspora,  setDiaspora]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [cniUploading, setCniUploading] = useState(false)
  const [cniRectoUrl, setCniRectoUrl] = useState<string | null>(null)
  const [cniVersoUrl, setCniVersoUrl] = useState<string | null>(null)

  const avatarRef = useRef<HTMLInputElement>(null)
  const cniRectoRef = useRef<HTMLInputElement>(null)
  const cniVersoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) {
      setNom(profile.nom ?? '')
      setPhone(profile.phone ?? '')
      setBio((profile as any).bio ?? '')
      setDiaspora((profile as any).is_diaspora ?? false)
      setCniRectoUrl((profile as any).cni_recto_url ?? null)
      setCniVersoUrl((profile as any).cni_verso_url ?? null)
    }
  }, [profile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nom.trim()) { toast.error('Le nom est requis'); return }
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ nom, phone: phone || null, bio: bio || null, is_diaspora: diaspora })
      .eq('id', user!.id)
    if (error) toast.error('Erreur lors de la mise à jour')
    else {
      await loadProfile(user!.id)
      toast.success('Profil mis à jour !')
    }
    setLoading(false)
  }

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `avatars/${user!.id}.${ext}`
      const { error: upErr } = await supabase.storage.from('biens-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('biens-photos').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user!.id)
      await loadProfile(user!.id)
      toast.success('Photo de profil mise à jour !')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur upload')
    } finally {
      setUploading(false)
    }
  }

  const handleCni = async (face: 'recto' | 'verso', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCniUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `cni/${user!.id}/${face}.${ext}`
      const { error: upErr } = await supabase.storage.from('biens-photos').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('biens-photos').getPublicUrl(path)
      const col = face === 'recto' ? 'cni_recto_url' : 'cni_verso_url'
      await supabase.from('profiles').update({ [col]: publicUrl }).eq('id', user!.id)
      if (face === 'recto') setCniRectoUrl(publicUrl)
      else setCniVersoUrl(publicUrl)
      toast.success(`CNI ${face} uploadé !`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur upload')
    } finally {
      setCniUploading(false)
    }
  }

  const identiteVerifiee = (profile as any)?.identite_verifiee ?? false

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Mon profil</h1>
        <p className="text-sm text-gray-500 mt-0.5">Informations personnelles et vérification d'identité</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-100 overflow-hidden flex items-center justify-center">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User size={32} className="text-primary-400" />
              }
            </div>
            <button onClick={() => avatarRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 disabled:opacity-50 shadow-md">
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">{profile?.nom ?? 'Utilisateur'}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={cn('badge text-xs flex items-center gap-1',
                identiteVerifiee ? 'badge-success' : 'badge-warning')}>
                {identiteVerifiee
                  ? <><CheckCircle size={10} /> Identité vérifiée</>
                  : <><Shield size={10} /> Non vérifié</>
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulaire infos */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4 space-y-4">
        <h2 className="font-bold text-gray-900">Informations personnelles</h2>
        <div>
          <label className="label-field">Nom complet *</label>
          <div className="relative">
            <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={nom} onChange={e => setNom(e.target.value)}
              className="input-field pl-9" required />
          </div>
        </div>
        <div>
          <label className="label-field">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="email" value={user?.email ?? ''} disabled
              className="input-field pl-9 opacity-50 cursor-not-allowed" />
          </div>
          <p className="text-xs text-gray-400 mt-1">L'email ne peut pas être modifié ici</p>
        </div>
        <div>
          <label className="label-field">Téléphone</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+228 90 00 00 00" className="input-field pl-9" />
          </div>
        </div>
        <div>
          <label className="label-field">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            rows={3} placeholder="Parlez de vous, de votre activité immobilière…"
            className="input-field resize-none" maxLength={500} />
        </div>
        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
          <input type="checkbox" checked={diaspora} onChange={e => setDiaspora(e.target.checked)}
            className="accent-primary-500" />
          <div className="flex items-center gap-2">
            <Globe size={15} className="text-primary-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Je suis de la diaspora</p>
              <p className="text-xs text-gray-400">Vous résidez hors du Togo</p>
            </div>
          </div>
        </label>
        <button type="submit" disabled={loading}
          className="btn btn-primary w-full justify-center gap-2 disabled:opacity-50">
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? 'Enregistrement…' : 'Sauvegarder'}
        </button>
      </form>

      {/* Vérification CNI */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield size={20} className={identiteVerifiee ? 'text-green-500' : 'text-amber-500'} />
          <div>
            <h2 className="font-bold text-gray-900">Vérification d'identité</h2>
            <p className="text-xs text-gray-400">
              {identiteVerifiee
                ? 'Votre identité a été vérifiée par notre équipe.'
                : 'Soumettez votre CNI pour publier des annonces vérifiées.'}
            </p>
          </div>
        </div>

        {identiteVerifiee ? (
          <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Identité vérifiée</p>
              <p className="text-xs text-green-600">
                Vérifié le {(profile as any)?.identite_verifiee_at
                  ? new Date((profile as any).identite_verifiee_at).toLocaleDateString('fr-FR')
                  : '—'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              Uploadez le recto et le verso de votre CNI. Un administrateur validera votre identité.
            </p>

            {/* Recto */}
            <div>
              <label className="label-field text-xs">CNI — Recto</label>
              <div
                onClick={() => cniRectoRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                  cniRectoUrl
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
                )}>
                {cniRectoUrl ? (
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm text-green-700 font-medium">Recto uploadé</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center text-gray-400">
                    <Upload size={16} />
                    <span className="text-sm">Cliquez pour uploader le recto</span>
                  </div>
                )}
              </div>
              <input ref={cniRectoRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => handleCni('recto', e)} />
            </div>

            {/* Verso */}
            <div>
              <label className="label-field text-xs">CNI — Verso</label>
              <div
                onClick={() => cniVersoRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                  cniVersoUrl
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
                )}>
                {cniVersoUrl ? (
                  <div className="flex items-center gap-2 justify-center">
                    <CheckCircle size={16} className="text-green-500" />
                    <span className="text-sm text-green-700 font-medium">Verso uploadé</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center text-gray-400">
                    <Upload size={16} />
                    <span className="text-sm">Cliquez pour uploader le verso</span>
                  </div>
                )}
              </div>
              <input ref={cniVersoRef} type="file" accept="image/*,application/pdf" className="hidden"
                onChange={e => handleCni('verso', e)} />
            </div>

            {cniUploading && (
              <div className="flex items-center gap-2 text-sm text-primary-600">
                <Loader2 size={14} className="animate-spin" />
                Upload en cours…
              </div>
            )}

            {cniRectoUrl && cniVersoUrl && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ✅ Documents soumis. En attente de validation par notre équipe (48-72h).
              </div>
            )}
          </div>
        )}
      </div>

      {/* Déconnexion — visible uniquement sur mobile (lg: bouton dans la sidebar) */}
      <div className="lg:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <button
          onClick={async () => { await logout(); router.push('/') }}
          className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors border border-red-100">
          <LogOut size={16} />
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
