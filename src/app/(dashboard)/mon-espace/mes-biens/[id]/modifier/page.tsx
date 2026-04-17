'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loader2, Save, X, Upload, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { VILLES_TOGO, EQUIPEMENTS } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function EditBienPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuthStore()
  const bienId = params.id as string

  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({
    titre: '', description: '', prix: '', ville: '', commune: '',
    adresse: '', quartier: '', meuble: false, prix_negociable: false,
    surface: '', nb_pieces: '', nb_chambres: '', nb_sdb: '',
    equipements: [] as string[], video_url: '',
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [newPhotos, setNewPhotos] = useState<File[]>([])

  useEffect(() => {
    if (!user || !bienId) return
    loadBien()
  }, [user, bienId])

  const loadBien = async () => {
    const { data, error } = await supabase
      .from('biens')
      .select('id, titre, description, prix, ville, commune, adresse, quartier, prix_negociable, superficie, nb_pieces, nb_chambres, nb_salles_bain, equipements, photos, photo_principale')
      .eq('id', bienId)
      .eq('owner_id', user!.id)
      .single()

    if (error || !data) { toast.error('Annonce introuvable'); router.push('/mon-espace/mes-biens'); return }

    setForm({
      titre:         data.titre ?? '',
      description:   data.description ?? '',
      prix:          String(data.prix ?? ''),
      ville:         data.ville ?? '',
      commune:       data.commune ?? '',
      adresse:       data.adresse ?? '',
      quartier:      data.quartier ?? '',
      meuble:        false,
      prix_negociable: data.prix_negociable ?? false,
      surface:       String(data.superficie ?? ''),
      nb_pieces:     String(data.nb_pieces ?? ''),
      nb_chambres:   String(data.nb_chambres ?? ''),
      nb_sdb:        String(data.nb_salles_bain ?? ''),
      equipements:   data.equipements ?? [],
      video_url:     '',
    })
    setPhotos(data.photos ?? [])
    setLoading(false)
  }

  const set = (key: string, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const toggleEquip = (eq: string) =>
    set('equipements', form.equipements.includes(eq)
      ? form.equipements.filter((e: string) => e !== eq)
      : [...form.equipements, eq])

  const removePhoto = (url: string) => setPhotos(prev => prev.filter(p => p !== url))
  const removeNewPhoto = (i: number) => setNewPhotos(prev => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    if (!form.titre.trim()) { toast.error('Titre requis'); return }
    if (!form.prix || Number(form.prix) <= 0) { toast.error('Prix invalide'); return }
    setSaving(true)
    try {
      // Upload new photos
      const newUrls: string[] = []
      for (const file of newPhotos) {
        const ext = file.name.split('.').pop()
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('biens-photos').upload(path, file)
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from('biens-photos').getPublicUrl(path)
        newUrls.push(publicUrl)
      }

      const { error } = await supabase.from('biens').update({
        titre:       form.titre.trim(),
        description: form.description.trim(),
        prix:        Number(form.prix),
        ville:       form.ville,
        commune:     form.commune || null,
        adresse:     form.adresse.trim(),
        quartier:    form.quartier || null,
        meuble:      form.meuble,
        prix_negociable: form.prix_negociable,
        surface:     form.surface ? Number(form.surface) : null,
        nb_pieces:   form.nb_pieces ? Number(form.nb_pieces) : null,
        nb_chambres: form.nb_chambres ? Number(form.nb_chambres) : null,
        nb_sdb:      form.nb_sdb ? Number(form.nb_sdb) : null,
        equipements: form.equipements,
        video_url:   form.video_url || null,
        photos:      [...photos, ...newUrls],
      }).eq('id', bienId)

      if (error) throw error
      toast.success('Annonce mise à jour !')
      router.push('/mon-espace/mes-biens')
    } catch (err: any) {
      toast.error(err.message ?? 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="p-8 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full pb-24 lg:pb-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Modifier l'annonce</h1>
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600">
          <X size={22} />
        </button>
      </div>

      <div className="space-y-5">
        {/* Titre */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800">Informations générales</h2>
          <div>
            <label className="label-field">Titre *</label>
            <input type="text" value={form.titre} onChange={e => set('titre', e.target.value)}
              className="input-field" maxLength={100} />
          </div>
          <div>
            <label className="label-field">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={5} className="input-field resize-none" maxLength={2000} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Prix (FCFA) *</label>
              <input type="number" value={form.prix} onChange={e => set('prix', e.target.value)}
                className="input-field" min="0" />
            </div>
            <div>
              <label className="label-field">Surface (m²)</label>
              <input type="number" value={form.surface} onChange={e => set('surface', e.target.value)}
                className="input-field" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label-field">Pièces</label>
              <input type="number" value={form.nb_pieces} onChange={e => set('nb_pieces', e.target.value)}
                className="input-field" min="0" />
            </div>
            <div>
              <label className="label-field">Chambres</label>
              <input type="number" value={form.nb_chambres} onChange={e => set('nb_chambres', e.target.value)}
                className="input-field" min="0" />
            </div>
            <div>
              <label className="label-field">SDB</label>
              <input type="number" value={form.nb_sdb} onChange={e => set('nb_sdb', e.target.value)}
                className="input-field" min="0" />
            </div>
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.meuble} onChange={e => set('meuble', e.target.checked)}
                className="accent-primary-500" />
              Meublé
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.prix_negociable} onChange={e => set('prix_negociable', e.target.checked)}
                className="accent-primary-500" />
              Prix négociable
            </label>
          </div>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-gray-800">Localisation</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-field">Ville *</label>
              <select value={form.ville} onChange={e => set('ville', e.target.value)} className="input-field">
                <option value="">Sélectionnez</option>
                {VILLES_TOGO.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="label-field">Commune</label>
              <input type="text" value={form.commune} onChange={e => set('commune', e.target.value)}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="label-field">Adresse</label>
            <input type="text" value={form.adresse} onChange={e => set('adresse', e.target.value)}
              className="input-field" />
          </div>
          <div>
            <label className="label-field">Quartier / Repère</label>
            <input type="text" value={form.quartier} onChange={e => set('quartier', e.target.value)}
              className="input-field" />
          </div>
        </div>

        {/* Équipements */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3">Équipements</h2>
          <div className="grid grid-cols-2 gap-2">
            {EQUIPEMENTS.map(eq => (
              <button key={eq} type="button" onClick={() => toggleEquip(eq)}
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all',
                  form.equipements.includes(eq)
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}>
                <div className={cn('w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                  form.equipements.includes(eq) ? 'bg-primary-500 border-primary-500' : 'border-gray-300')}>
                  {form.equipements.includes(eq) && <CheckCircle size={10} className="text-white" />}
                </div>
                {eq}
              </button>
            ))}
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-bold text-gray-800 mb-3">Photos</h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((url, i) => (
              <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(url)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                  <X size={11} />
                </button>
                {i === 0 && (
                  <span className="absolute bottom-1.5 left-1.5 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                    Principale
                  </span>
                )}
              </div>
            ))}
            {newPhotos.map((f, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 ring-2 ring-accent-400">
                <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeNewPhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center">
                  <X size={11} />
                </button>
                <span className="absolute bottom-1.5 left-1.5 bg-accent-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  Nouveau
                </span>
              </div>
            ))}
            {(photos.length + newPhotos.length) < 10 && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 hover:border-primary-300 hover:text-primary-400 transition-colors cursor-pointer">
                <Upload size={20} />
                <span className="text-xs mt-1">Ajouter</span>
                <input type="file" multiple accept="image/*" className="hidden"
                  onChange={e => e.target.files && setNewPhotos(prev => [...prev, ...Array.from(e.target.files!)])} />
              </label>
            )}
          </div>
        </div>

        {/* Vidéo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <label className="label-field">Lien vidéo</label>
          <input type="url" value={form.video_url} onChange={e => set('video_url', e.target.value)}
            placeholder="https://youtube.com/…" className="input-field" />
        </div>
      </div>

      {/* CTA fixe */}
      <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-6 bg-white lg:bg-transparent border-t lg:border-0 border-gray-200 p-4 lg:p-0">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button onClick={() => router.back()} className="btn btn-outline flex-1 justify-center">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn btn-primary flex-1 justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Enregistrement…' : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}
