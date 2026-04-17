'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, SlidersHorizontal, X, ChevronDown, Navigation } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import BienCard from '@/components/biens/BienCard'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'
import GeoFilterBar, { type GeoState } from '@/components/biens/GeoFilterBar'
import { cn, haversine, formatDistance } from '@/lib/utils'
import { VILLES_TOGO, TYPES_BIEN, PRIX_RANGES_VENTE, RAYON_OPTIONS } from '@/lib/constants'
import type { Bien } from '@/types/immobilier'

const TYPES_VENTE = TYPES_BIEN.filter(t => (t.categorie as readonly string[]).includes('vente'))
type BienWithDist = Bien & { _distKm?: number }

export default function VentePage() {
  const searchParams = useSearchParams()
  const [biens,       setBiens]       = useState<Bien[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [query,       setQuery]       = useState(searchParams.get('q') || '')
  const [ville,       setVille]       = useState(searchParams.get('ville') || '')
  const [typeBien,    setTypeBien]    = useState('')
  const [prixRange,   setPrixRange]   = useState('')
  const [geo, setGeo] = useState<GeoState>({ active: false, userPos: null, rayon: 2, loading: false, error: '' })

  useEffect(() => {
    if (searchParams.get('geo') === '1') activerGeo()
  }, [])

  useEffect(() => { load() }, [ville, typeBien, prixRange])

  const load = async () => {
    setLoading(true)
    let q = supabase.from('biens')
      .select('id,slug,titre,categorie,type_bien,prix,prix_type,ville,commune,quartier,photos,photo_principale,superficie,nb_pieces,nb_chambres,nb_salles_bain,vues,favoris_count,statut,is_featured,owner_id,latitude,longitude, proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
      .eq('statut', 'publie').eq('categorie', 'vente')
      .order('is_featured', { ascending: false })
      .order('publie_at', { ascending: false })

    if (ville)    q = q.eq('ville', ville)
    if (typeBien) q = q.eq('type_bien', typeBien)
    if (prixRange) {
      const range = PRIX_RANGES_VENTE.find(r => r.label === prixRange)
      if (range) { q = q.gte('prix', range.min); if (range.max) q = q.lte('prix', range.max) }
    }
    const { data } = await q.limit(80)
    setBiens((data as unknown as Bien[]) || [])
    setLoading(false)
  }

  const activerGeo = () => {
    if (!navigator.geolocation) { setGeo(g => ({...g, error: "Géolocalisation non supportée."})); return }
    setGeo(g => ({...g, active: true, loading: true, error: ''}))
    navigator.geolocation.getCurrentPosition(
      pos => setGeo(g => ({...g, loading: false, userPos: {lat: pos.coords.latitude, lng: pos.coords.longitude}})),
      err => setGeo(g => ({...g, loading: false, active: false, error: err.code === 1 ? "Localisation refusée. Activez-la dans votre navigateur." : "Impossible de vous localiser."})),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const desactiverGeo = () => setGeo({ active: false, userPos: null, rayon: 2, loading: false, error: '' })

  const filtered: BienWithDist[] = (() => {
    let list: BienWithDist[] = query
      ? biens.filter(b => b.titre.toLowerCase().includes(query.toLowerCase()) || b.ville.toLowerCase().includes(query.toLowerCase()) || (b.quartier||'').toLowerCase().includes(query.toLowerCase()))
      : [...biens]

    if (geo.active && geo.userPos) {
      list = list
        .map(b => ({...b, _distKm: b.latitude != null && b.longitude != null ? haversine(geo.userPos!.lat, geo.userPos!.lng, b.latitude, b.longitude) : undefined}))
        .filter(b => b._distKm != null && b._distKm <= geo.rayon)
        .sort((a, b) => (a._distKm ?? Infinity) - (b._distKm ?? Infinity))
    }
    return list
  })()

  const hasFilters = !!(ville || typeBien || prixRange)
  const rayonLabel = RAYON_OPTIONS.find(o => o.value === geo.rayon)?.label ?? `${geo.rayon} km`

  return (
    <div className="section">
      <div className="wrap">
        <div className="page-header">
          <h1 className="page-title">Acheter un bien</h1>
          <p className="page-subtitle">Terrains, maisons, villas, appartements — annonces vérifiées au Togo</p>
        </div>

        <GeoFilterBar geo={geo} onActivate={activerGeo} onDeactivate={desactiverGeo} onRayonChange={km => setGeo(g => ({...g, rayon: km}))} />

        {/* Recherche + filtres */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Titre, ville, quartier…" className="input-field pl-10" />
          </div>
          <button onClick={() => setShowFilters(v => !v)}
            className={cn('btn flex-shrink-0 gap-2', showFilters ? 'btn-primary' : 'btn-outline')}>
            <SlidersHorizontal size={16} />Filtres
            {hasFilters && <span className="w-2 h-2 rounded-full bg-accent" />}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-sm">
            {[
              { label: 'Ville', value: ville, onChange: setVille, options: VILLES_TOGO.map(v => ({value:v,label:v})), placeholder: 'Toutes les villes' },
              { label: 'Type de bien', value: typeBien, onChange: setTypeBien, options: TYPES_VENTE.map(t => ({value:t.value,label:t.label})), placeholder: 'Tous les types' },
              { label: 'Budget', value: prixRange, onChange: setPrixRange, options: PRIX_RANGES_VENTE.map(r => ({value:r.label,label:r.label})), placeholder: 'Tous les budgets' },
            ].map(f => (
              <div key={f.label}>
                <label className="label-field">{f.label}</label>
                <div className="relative">
                  <select value={f.value} onChange={e => f.onChange(e.target.value)} className="input-field appearance-none pr-8">
                    <option value="">{f.placeholder}</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}
            {hasFilters && (
              <div className="sm:col-span-3 flex justify-end">
                <button onClick={() => { setVille(''); setTypeBien(''); setPrixRange('') }}
                  className="btn btn-ghost text-sm text-red-500 hover:bg-red-50 gap-1.5">
                  <X size={14} /> Effacer les filtres
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mb-6">
          <p className="text-sm text-gray-500">
            {loading ? 'Chargement…' : `${filtered.length} annonce${filtered.length > 1 ? 's' : ''}`}
            {!loading && geo.active && geo.userPos && ` dans un rayon de ${rayonLabel}`}
          </p>
          {!loading && geo.active && geo.userPos && filtered.length > 0 && (
            <span className="badge badge-primary gap-1"><Navigation size={10} /> Trié par distance</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({length: 8}).map((_,i) => <BienCardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Aucune annonce trouvée</h3>
            <p className="text-gray-500">{geo.active ? `Aucun bien dans un rayon de ${rayonLabel}. Essayez un rayon plus grand.` : 'Modifiez vos critères.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(b => <BienCard key={b.id} bien={b} />)}
          </div>
        )}
      </div>
    </div>
  )
}
