'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, MapPin, Image, FileText, CheckCircle,
  ChevronRight, ChevronLeft, Loader2, Upload, X,
  DollarSign, Bed, Bath, Car, Wifi, Zap, Droplets,
  Shield, Wind, Flame, Package, Globe
} from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import { VILLES_TOGO, TYPES_PAR_CATEGORIE, TYPES_BIEN, EQUIPEMENTS } from '@/lib/constants'
import { cn, slugify } from '@/lib/utils'

/* ── Types ─────────────────────────────────────────────────────── */
interface FormData {
  // Étape 1 — Type
  categorie:    'vente' | 'location' | ''
  type_bien:    string
  type_location: 'courte_duree' | 'longue_duree' | ''
  titre:        string
  // Étape 2 — Détails
  description:  string
  prix:         string
  prix_type:    'total' | 'par_mois' | 'par_nuit'
  prix_negociable: boolean
  superficie:   string
  nb_pieces:    string
  nb_chambres:  string
  nb_salles_bain: string
  nb_etages:    string
  meuble:       boolean
  equipements:  string[]
  // Étape 3 — Localisation
  ville:        string
  commune:      string
  adresse:      string
  quartier:     string
  lat:          string
  lng:          string
  // Étape 4 — Médias
  photos:       File[]
  photoUrls:    string[]  // après upload
  videoFile:    File | null
}

const initForm: FormData = {
  categorie: '', type_bien: '', type_location: '', titre: '',
  description: '', prix: '', prix_type: 'total', prix_negociable: false,
  superficie: '', nb_pieces: '', nb_chambres: '', nb_salles_bain: '', nb_etages: '', meuble: false, equipements: [],
  ville: '', commune: '', adresse: '', quartier: '', lat: '', lng: '',
  photos: [], photoUrls: [], videoFile: null,
}

const ETAPES = [
  { id: 1, label: 'Type',         icon: Home },
  { id: 2, label: 'Détails',      icon: FileText },
  { id: 3, label: 'Localisation', icon: MapPin },
  { id: 4, label: 'Photos',       icon: Image },
]

/* ── Règles métier du formulaire ───────────────────────────────── */
const RESIDENTIELS = ['Maison', 'Villa', 'Appartement', 'Studio']

// prix_type est toujours déduit — jamais saisi manuellement
function derivePrixType(cat: string, typeLoc: string): 'total' | 'par_mois' | 'par_nuit' {
  if (cat === 'vente') return 'total'
  if (typeLoc === 'courte_duree') return 'par_nuit'
  return 'par_mois'
}

function getPrixLabel(cat: string, typeLoc: string) {
  if (cat === 'vente') return 'Prix de vente (FCFA)'
  if (typeLoc === 'courte_duree') return 'Prix par nuit (FCFA)'
  return 'Loyer mensuel (FCFA)'
}

function getPrixBadge(cat: string, typeLoc: string) {
  if (cat === 'vente') return 'Prix total'
  if (typeLoc === 'courte_duree') return '/ nuit'
  return '/ mois'
}

// Champs conditionnels selon le type de bien
// Convertit le label affiché ("Appartement") en value DB ("appartement")
const labelToValue = (label: string) =>
  (TYPES_BIEN as readonly { value: string; label: string }[]).find(t => t.label === label)?.value ?? label.toLowerCase()

const showMeuble     = (t: string) => RESIDENTIELS.includes(t)
const showPieces     = (t: string) => RESIDENTIELS.includes(t)
const showEtages     = (t: string) => ['Maison', 'Villa', 'Immeuble'].includes(t)
const showNegociable = (cat: string) => cat === 'vente'

/* ── Composant ─────────────────────────────────────────────────── */
export default function PublierBienPage() {
  const router = useRouter()
  const { user, profile } = useAuthStore()
  const [etape,   setEtape]   = useState(1)
  const [form,    setForm]    = useState<FormData>(initForm)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const toggleEquip = (eq: string) =>
    set('equipements', form.equipements.includes(eq)
      ? form.equipements.filter(e => e !== eq)
      : [...form.equipements, eq])

  /* Validation par étape */
  const validateEtape = (n: number): string | null => {
    if (n === 1) {
      if (!form.categorie) return 'Choisissez une catégorie (Vente ou Location)'
      if (!form.type_bien) return 'Choisissez le type de bien'
      if (form.categorie === 'location' && !form.type_location) return 'Choisissez courte ou longue durée'
      if (!form.titre.trim()) return 'Donnez un titre à votre annonce'
    }
    if (n === 2) {
      if (!form.description.trim() || form.description.length < 30) return 'Description trop courte (30 caractères min)'
      if (!form.prix || isNaN(Number(form.prix)) || Number(form.prix) <= 0) return 'Prix invalide'
    }
    if (n === 3) {
      if (!form.ville) return 'Sélectionnez une ville'
      if (!form.adresse.trim()) return "Indiquez l'adresse"
    }
    return null
  }

  const goNext = () => {
    const err = validateEtape(etape)
    if (err) { toast.error(err); return }
    setEtape(e => Math.min(e + 1, 4))
    window.scrollTo(0, 0)
  }

  const goPrev = () => {
    setEtape(e => Math.max(e - 1, 1))
    window.scrollTo(0, 0)
  }

  /* Géolocalisation */
  const getGeo = () => {
    if (!navigator.geolocation) { toast.error('Géolocalisation non disponible'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('lat', pos.coords.latitude.toFixed(6))
        set('lng', pos.coords.longitude.toFixed(6))
        toast.success('Position détectée !')
        setGeoLoading(false)
      },
      () => { toast.error("Impossible d'obtenir votre position"); setGeoLoading(false) }
    )
  }

  /* Upload photos */
  const SAFE_EXTS = ['jpg', 'jpeg', 'png', 'webp']
  const MAX_SIZE  = 5 * 1024 * 1024 // 5 Mo

  const handlePhotos = useCallback(async (files: FileList) => {
    const validated: File[] = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!SAFE_EXTS.includes(ext)) {
        toast.error(`"${file.name}" : format non autorisé (jpg, png, webp uniquement)`)
        continue
      }
      if (file.size > MAX_SIZE) {
        toast.error(`"${file.name}" dépasse 5 Mo`)
        continue
      }
      validated.push(file)
    }
    const newFiles = validated.slice(0, 10 - form.photos.length)
    if (!newFiles.length) return
    set('photos', [...form.photos, ...newFiles])
  }, [form.photos])

  const removePhoto = (i: number) =>
    set('photos', form.photos.filter((_, idx) => idx !== i))

  /* Upload vidéo */
  const VIDEO_EXTS    = ['mp4', 'mov', 'webm', 'avi']
  const VIDEO_MAX     = 200 * 1024 * 1024 // 200 Mo

  const handleVideo = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!VIDEO_EXTS.includes(ext)) {
      toast.error('Format non autorisé (mp4, mov, webm, avi uniquement)')
      return
    }
    if (file.size > VIDEO_MAX) {
      toast.error(`La vidéo dépasse 200 Mo`)
      return
    }
    set('videoFile', file)
  }

  /* Soumission finale */
  const handleSubmit = async () => {
    const err = validateEtape(4)
    if (err) { toast.error(err); return }
    if (form.photos.length === 0) { toast.error('Ajoutez au moins une photo'); return }

    setLoading(true)
    let bienPayload: Record<string, any> = {}
    try {
      // 1. Upload des photos
      const uploadedUrls: string[] = []
      for (const file of form.photos) {
        const ext = file.name.split('.').pop()
        const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage.from('biens-photos').upload(path, file)
        if (upErr) throw upErr
        const { data: { publicUrl } } = supabase.storage.from('biens-photos').getPublicUrl(path)
        uploadedUrls.push(publicUrl)
      }

      // 2. Upload de la vidéo (si fournie)
      let videoUrl: string | null = null
      if (form.videoFile) {
        const ext = form.videoFile.name.split('.').pop()
        const path = `${user!.id}/videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: vidErr } = await supabase.storage.from('biens-photos').upload(path, form.videoFile, {
          contentType: form.videoFile.type || 'video/mp4',
        })
        if (vidErr) throw vidErr
        const { data: { publicUrl } } = supabase.storage.from('biens-photos').getPublicUrl(path)
        videoUrl = publicUrl
      }

      // 3. Créer le bien
      const slug = slugify(form.titre) + '-' + Date.now()
      bienPayload = {
        owner_id:     user!.id,
        titre:        form.titre.trim(),
        slug,
        description:  form.description.trim(),
        categorie:    form.categorie,
        type_bien:    labelToValue(form.type_bien),
        type_location: form.categorie === 'location' && form.type_location ? form.type_location : null,
        prix:         Number(form.prix),
        prix_type:    form.prix_type,
        prix_negociable: form.prix_negociable,
        ville:        form.ville,
        commune:      form.commune || null,
        adresse:      form.adresse.trim(),
        quartier:     form.quartier || null,
        photos:           uploadedUrls,
        photo_principale: uploadedUrls[0] || null,
        video_url:        videoUrl,
        meuble:           form.meuble,
        equipements:      form.equipements,
      }

      if (form.superficie)    bienPayload.superficie    = Number(form.superficie)
      if (form.nb_pieces)     bienPayload.nb_pieces     = Number(form.nb_pieces)
      if (form.nb_chambres)   bienPayload.nb_chambres   = Number(form.nb_chambres)
      if (form.nb_salles_bain) bienPayload.nb_salles_bain = Number(form.nb_salles_bain)
      if (form.nb_etages)     bienPayload.nb_etages     = Number(form.nb_etages)
      if (form.lat && form.lng) {
        bienPayload.latitude  = Number(form.lat)
        bienPayload.longitude = Number(form.lng)
      }

      const { error: insertErr } = await supabase.from('biens').insert(bienPayload)
      if (insertErr) throw insertErr

      if (form.categorie === 'vente') {
        toast.success('Annonce soumise pour modération !')
      } else {
        toast.success('Annonce publiée avec succès !')
      }
      router.push('/mon-espace/mes-biens')
    } catch (err: any) {
      console.error('[publier] code:', err?.code)
      console.error('[publier] message:', err?.message)
      console.error('[publier] details:', err?.details)
      console.error('[publier] hint:', err?.hint)
      console.error('[publier] payload envoyé:', JSON.stringify(bienPayload, null, 2))
      const msg = err?.message || err?.error_description || 'Erreur lors de la publication'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const progress = (etape / 4) * 100

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto w-full pb-32 lg:pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Publier une annonce</h1>
        <p className="text-sm text-gray-500 mt-1">
          Étape {etape} sur 4 — {ETAPES[etape - 1].label}
        </p>
      </div>

      {/* Barre de progression */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {ETAPES.map(e => {
            const Icon = e.icon
            const done = etape > e.id
            const active = etape === e.id
            return (
              <div key={e.id} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                  done   ? 'bg-primary-500 text-white'  :
                  active ? 'bg-primary-500 text-white ring-4 ring-primary-100' :
                           'bg-gray-100 text-gray-400'
                )}>
                  {done ? <CheckCircle size={17} /> : <Icon size={17} />}
                </div>
                <span className={cn('text-[10px] font-semibold hidden sm:block',
                  active ? 'text-primary-600' : done ? 'text-gray-500' : 'text-gray-300'
                )}>{e.label}</span>
              </div>
            )
          })}
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div className="h-full bg-primary-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Contenu par étape */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

        {/* ── ÉTAPE 1 — Type ─────────────────────────────────────── */}
        {etape === 1 && (
          <div className="space-y-5">
            {/* Catégorie */}
            <div>
              <label className="label-field mb-3">Type d'opération *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['vente', 'location'] as const).map(cat => (
                  <button key={cat} type="button"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      categorie: cat,
                      type_bien: '',
                      type_location: '',
                      prix_type: derivePrixType(cat, ''),
                      meuble: false, nb_pieces: '', nb_chambres: '', nb_salles_bain: '', nb_etages: '',
                    }))}
                    className={cn(
                      'p-4 rounded-xl border-2 text-sm font-bold transition-all',
                      form.categorie === cat
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}>
                    {cat === 'vente' ? '🏷️ Vente' : '🔑 Location'}
                    <p className="text-xs font-normal text-gray-400 mt-1">
                      {cat === 'vente' ? 'Terrains, maisons, villas…' : 'Courte ou longue durée'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Type location */}
            {form.categorie === 'location' && (
              <div>
                <label className="label-field mb-3">Durée de location *</label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { v: 'courte_duree', label: '🌙 Courte durée', sub: 'Nuit, semaine, mois' },
                    { v: 'longue_duree', label: '📅 Longue durée', sub: 'Bail mensuel' },
                  ] as const).map(({ v, label, sub }) => (
                    <button key={v} type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        type_location: v,
                        type_bien: '',
                        prix_type: derivePrixType(prev.categorie, v),
                        meuble: false, nb_pieces: '', nb_chambres: '', nb_salles_bain: '', nb_etages: '',
                      }))}
                      className={cn(
                        'p-4 rounded-xl border-2 text-sm font-bold transition-all',
                        form.type_location === v
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      )}>
                      {label}
                      <p className="text-xs font-normal text-gray-400 mt-1">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type de bien */}
            {form.categorie && (
              <div>
                <label className="label-field mb-3">Type de bien *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(TYPES_PAR_CATEGORIE[form.categorie] ?? []).map((t: string) => (
                    <button key={t} type="button"
                      onClick={() => setForm(prev => ({
                        ...prev,
                        type_bien: t,
                        meuble: false, nb_pieces: '', nb_chambres: '', nb_salles_bain: '', nb_etages: '',
                      }))}
                      className={cn(
                        'p-3 rounded-xl border text-sm font-medium text-left transition-all',
                        form.type_bien === t
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Titre */}
            <div>
              <label className="label-field">Titre de l'annonce *</label>
              <input type="text" value={form.titre}
                onChange={e => set('titre', e.target.value)}
                placeholder="ex. Superbe villa avec piscine à Lomé"
                className="input-field" maxLength={100} />
              <p className="text-xs text-gray-400 mt-1">{form.titre.length}/100 caractères</p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 — Détails ──────────────────────────────────── */}
        {etape === 2 && (
          <div className="space-y-5">
            {/* Description */}
            <div>
              <label className="label-field">Description *</label>
              <textarea value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5} placeholder="Décrivez votre bien : emplacement, état, points forts…"
                className="input-field resize-none" maxLength={2000} />
              <p className="text-xs text-gray-400 mt-1">{form.description.length}/2000 caractères</p>
            </div>

            {/* Prix — unité déduite automatiquement */}
            <div>
              <label className="label-field">{getPrixLabel(form.categorie, form.type_location)} *</label>
              <div className="relative flex gap-2">
                <div className="relative flex-1">
                  <DollarSign size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="number" value={form.prix}
                    onChange={e => set('prix', e.target.value)}
                    placeholder="0" className="input-field pl-9" min="0" />
                </div>
                <span className="flex items-center px-3.5 bg-primary-50 border border-primary-100 rounded-xl text-sm font-semibold text-primary-600 whitespace-nowrap">
                  {getPrixBadge(form.categorie, form.type_location)}
                </span>
              </div>
            </div>

            {/* Prix négociable — vente uniquement */}
            {showNegociable(form.categorie) && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={form.prix_negociable}
                  onChange={e => set('prix_negociable', e.target.checked)}
                  className="accent-primary-500" />
                <span className="text-sm text-gray-700 font-medium">Prix négociable</span>
              </label>
            )}

            {/* Superficie — toujours visible */}
            <div>
              <label className="label-field">Superficie (m²)</label>
              <input type="number" value={form.superficie}
                onChange={e => set('superficie', e.target.value)}
                placeholder="0" className="input-field" min="0" />
            </div>

            {/* Pièces/Chambres/SDB — résidentiel uniquement */}
            {showPieces(form.type_bien) && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label-field">Pièces</label>
                  <input type="number" value={form.nb_pieces}
                    onChange={e => set('nb_pieces', e.target.value)}
                    placeholder="0" className="input-field" min="0" />
                </div>
                <div>
                  <label className="label-field">Chambres</label>
                  <input type="number" value={form.nb_chambres}
                    onChange={e => set('nb_chambres', e.target.value)}
                    placeholder="0" className="input-field" min="0" />
                </div>
                <div>
                  <label className="label-field">Salles de bain</label>
                  <input type="number" value={form.nb_salles_bain}
                    onChange={e => set('nb_salles_bain', e.target.value)}
                    placeholder="0" className="input-field" min="0" />
                </div>
              </div>
            )}

            {/* Étages — maison, villa, immeuble uniquement */}
            {showEtages(form.type_bien) && (
              <div>
                <label className="label-field">Nombre d&apos;étages</label>
                <input type="number" value={form.nb_etages}
                  onChange={e => set('nb_etages', e.target.value)}
                  placeholder="0" className="input-field" min="0" />
              </div>
            )}

            {/* Meublé — résidentiel uniquement */}
            {showMeuble(form.type_bien) && (
              <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
                <input type="checkbox" checked={form.meuble}
                  onChange={e => set('meuble', e.target.checked)}
                  className="accent-primary-500" />
                <span className="text-sm font-medium text-gray-700">Bien meublé</span>
              </label>
            )}

            {/* Équipements */}
            <div>
              <label className="label-field mb-3">Équipements & services</label>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPEMENTS.map(eq => (
                  <button key={eq} type="button"
                    onClick={() => toggleEquip(eq)}
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
          </div>
        )}

        {/* ── ÉTAPE 3 — Localisation ─────────────────────────────── */}
        {etape === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-field">Ville *</label>
                <select value={form.ville} onChange={e => set('ville', e.target.value)}
                  className="input-field">
                  <option value="">Sélectionnez</option>
                  {VILLES_TOGO.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label-field">Commune / Quartier</label>
                <input type="text" value={form.commune}
                  onChange={e => set('commune', e.target.value)}
                  placeholder="ex. Bé, Tokoin…" className="input-field" />
              </div>
            </div>

            <div>
              <label className="label-field">Adresse *</label>
              <input type="text" value={form.adresse}
                onChange={e => set('adresse', e.target.value)}
                placeholder="Rue, avenue, carrefour…" className="input-field" />
            </div>

            <div>
              <label className="label-field">Quartier / Repère</label>
              <input type="text" value={form.quartier}
                onChange={e => set('quartier', e.target.value)}
                placeholder="ex. Près du marché central" className="input-field" />
            </div>

            {/* Géolocalisation */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Coordonnées GPS</p>
                  <p className="text-xs text-gray-400">Partagez votre position exacte (révélée après paiement)</p>
                </div>
                <button type="button" onClick={getGeo} disabled={geoLoading}
                  className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-colors',
                    'bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-50')}>
                  {geoLoading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                  {geoLoading ? 'Détection…' : 'Ma position'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-field text-xs">Latitude</label>
                  <input type="number" value={form.lat}
                    onChange={e => set('lat', e.target.value)}
                    placeholder="6.137428" className="input-field text-sm" step="any" />
                </div>
                <div>
                  <label className="label-field text-xs">Longitude</label>
                  <input type="number" value={form.lng}
                    onChange={e => set('lng', e.target.value)}
                    placeholder="1.212427" className="input-field text-sm" step="any" />
                </div>
              </div>
              {form.lat && form.lng && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Position enregistrée
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 — Photos ───────────────────────────────────── */}
        {etape === 4 && (
          <div className="space-y-5">
            <div>
              <label className="label-field">Photos du bien * <span className="text-gray-400 font-normal">(min 1, max 10)</span></label>

              {/* Zone de dépôt */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                <Upload size={32} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-semibold text-gray-600">Cliquez ou glissez vos photos</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP — max 5 Mo par photo</p>
              </div>
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                onChange={e => e.target.files && handlePhotos(e.target.files)} />

              {/* Aperçus */}
              {form.photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {form.photos.map((file, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img src={URL.createObjectURL(file)} alt=""
                        className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1.5 left-1.5 bg-primary-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          Photo principale
                        </span>
                      )}
                      <button type="button" onClick={() => removePhoto(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {form.photos.length < 10 && (
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-primary-300 hover:text-primary-400 transition-colors">
                      <Upload size={20} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Vidéo */}
            <div>
              <label className="label-field">
                Vidéo du bien <span className="text-gray-400 font-normal">(optionnel — mp4, mov, webm — max 200 Mo)</span>
              </label>

              {!form.videoFile ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                  <Upload size={28} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-600">Cliquez pour charger une vidéo</p>
                  <p className="text-xs text-gray-400 mt-1">mp4, mov, webm, avi — max 200 Mo</p>
                </div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black">
                  <video
                    src={URL.createObjectURL(form.videoFile)}
                    controls
                    className="w-full max-h-52 object-contain"
                  />
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-b-xl">
                    <span className="text-xs text-gray-600 truncate max-w-[70%]">{form.videoFile.name}</span>
                    <button type="button"
                      onClick={() => { set('videoFile', null); if (videoInputRef.current) videoInputRef.current.value = '' }}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium">
                      <X size={13} /> Supprimer
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/avi,.mp4,.mov,.webm,.avi"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleVideo(e.target.files[0])}
              />
            </div>

            {/* Récapitulatif */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-bold text-gray-900 mb-3">Récapitulatif</p>
              <div className="flex justify-between text-gray-600">
                <span>Type d&apos;opération</span>
                <span className="font-semibold capitalize">
                  {form.categorie === 'vente' ? 'Vente' : form.type_location === 'courte_duree' ? 'Location courte durée' : 'Location longue durée'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Type de bien</span>
                <span className="font-semibold">{form.type_bien}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Titre</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{form.titre}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Prix</span>
                <span className="font-semibold">
                  {Number(form.prix).toLocaleString()} FCFA {getPrixBadge(form.categorie, form.type_location)}
                  {form.prix_negociable && form.categorie === 'vente' ? ' (négociable)' : ''}
                </span>
              </div>
              {form.superficie && (
                <div className="flex justify-between text-gray-600">
                  <span>Superficie</span>
                  <span className="font-semibold">{form.superficie} m²</span>
                </div>
              )}
              {showPieces(form.type_bien) && (form.nb_chambres || form.nb_salles_bain) && (
                <div className="flex justify-between text-gray-600">
                  <span>Chambres / SDB</span>
                  <span className="font-semibold">{form.nb_chambres || '–'} ch. / {form.nb_salles_bain || '–'} sdb</span>
                </div>
              )}
              {showMeuble(form.type_bien) && (
                <div className="flex justify-between text-gray-600">
                  <span>Meublé</span>
                  <span className="font-semibold">{form.meuble ? 'Oui' : 'Non'}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Ville</span>
                <span className="font-semibold">{form.ville}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Photos</span>
                <span className="font-semibold">{form.photos.length} photo{form.photos.length > 1 ? 's' : ''}</span>
              </div>
              {form.categorie === 'vente' && (
                <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  ⚠️ Les biens en vente nécessitent une validation par un modérateur avant publication.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 lg:relative lg:mt-6 bg-white lg:bg-transparent border-t lg:border-0 border-gray-200 p-4 lg:p-0 safe-area-pb">
        <div className="max-w-2xl mx-auto flex gap-3">
          {etape > 1 && (
            <button type="button" onClick={goPrev}
              className="btn btn-outline flex-1 justify-center gap-2">
              <ChevronLeft size={18} />
              Retour
            </button>
          )}
          {etape < 4 ? (
            <button type="button" onClick={goNext}
              className="btn btn-primary flex-1 justify-center gap-2">
              Continuer
              <ChevronRight size={18} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading}
              className="btn btn-primary flex-1 justify-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {loading ? "Publication\u2026" : "Publier l'annonce"}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
