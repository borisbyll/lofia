'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, X, Navigation, MapPin } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import BienCard from '@/components/biens/BienCard'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'
import GeoFilterBar, { type GeoState } from '@/components/biens/GeoFilterBar'
import { cn, haversine, formatDistance, formatPrix } from '@/lib/utils'
import { VILLES_TOGO, TYPES_BIEN, PRIX_RANGES_VENTE, PRIX_RANGES_LOCATION } from '@/lib/constants'
import type { Bien } from '@/types/immobilier'

type Categorie = 'tous' | 'vente' | 'location'
type BienWithDist = Bien & { _distKm?: number }

const PRIX_RANGES_TOUS = [
  { label: 'Moins de 30k/mois', min: 0, max: 30_000 },
  { label: '30k – 150k',        min: 30_000, max: 150_000 },
  { label: '150k – 1M',         min: 150_000, max: 1_000_000 },
  { label: '1M – 10M',          min: 1_000_000, max: 10_000_000 },
  { label: '10M – 50M',         min: 10_000_000, max: 50_000_000 },
  { label: 'Plus de 50M',        min: 50_000_000, max: null },
]

export default function RechercheClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [biens,       setBiens]       = useState<BienWithDist[]>([])
  const [loading,     setLoading]     = useState(true)
  const [total,       setTotal]       = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const [query,     setQuery]     = useState(searchParams.get('q') || '')
  const [inputVal,  setInputVal]  = useState(searchParams.get('q') || '')
  const [categorie, setCategorie] = useState<Categorie>((searchParams.get('categorie') as Categorie) || 'tous')
  const [ville,     setVille]     = useState(searchParams.get('ville') || '')
  const [typeBien,  setTypeBien]  = useState(searchParams.get('type') || '')
  const [prixRange, setPrixRange] = useState('')
  const [geo, setGeo] = useState<GeoState>({ active: false, userPos: null, rayon: 5, loading: false, error: '' })

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const typesDisponibles = TYPES_BIEN.filter(t => {
    if (categorie === 'vente')    return (t.categorie as readonly string[]).includes('vente')
    if (categorie === 'location') return (t.categorie as readonly string[]).includes('location')
    return true
  })

  const prixRanges = categorie === 'vente' ? PRIX_RANGES_VENTE : categorie === 'location' ? PRIX_RANGES_LOCATION : PRIX_RANGES_TOUS

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('biens')
      .select('id,slug,titre,categorie,type_bien,prix,prix_type,ville,commune,quartier,photos,photo_principale,superficie,nb_salons,nb_chambres,nb_salles_bain,vues,favoris_count,statut,is_featured,owner_id,latitude,longitude,proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)', { count: 'exact' })
      .eq('statut', 'publie')
      .order('score_tri', { ascending: false })
      .order('is_featured', { ascending: false })
      .order('publie_at', { ascending: false })

    if (categorie !== 'tous') q = q.eq('categorie', categorie)
    if (ville)    q = q.eq('ville', ville)
    if (typeBien) q = q.eq('type_bien', typeBien)
    if (query.trim()) {
      q = q.or(`titre.ilike.%${query.trim()}%,ville.ilike.%${query.trim()}%,quartier.ilike.%${query.trim()}%,commune.ilike.%${query.trim()}%`)
    }
    if (prixRange) {
      const range = prixRanges.find(r => r.label === prixRange)
      if (range) { q = q.gte('prix', range.min); if (range.max) q = q.lte('prix', range.max) }
    }

    const { data, count } = await q.limit(100)
    let results = (data as unknown as BienWithDist[]) || []

    if (geo.active && geo.userPos) {
      results = results
        .map(b => ({ ...b, _distKm: b.latitude && b.longitude ? haversine(geo.userPos!.lat, geo.userPos!.lng, b.latitude, b.longitude) : Infinity }))
        .filter(b => b._distKm! <= geo.rayon)
        .sort((a, b) => a._distKm! - b._distKm!)
    }

    setBiens(results)
    setTotal(count ?? 0)
    setLoading(false)
  }, [categorie, ville, typeBien, query, prixRange, geo.active, geo.userPos, geo.rayon])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(inputVal)
  }

  const handleInputChange = (val: string) => {
    setInputVal(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setQuery(val), 500)
  }

  const resetFiltres = () => {
    setCategorie('tous'); setVille(''); setTypeBien(''); setPrixRange('')
    setGeo(g => ({ ...g, active: false }))
  }

  const hasFiltres = categorie !== 'tous' || ville || typeBien || prixRange || geo.active

  const activerGeo = () => {
    if (!navigator.geolocation) return
    setGeo(g => ({ ...g, loading: true, error: '' }))
    navigator.geolocation.getCurrentPosition(
      pos => setGeo(g => ({ ...g, active: true, userPos: { lat: pos.coords.latitude, lng: pos.coords.longitude }, loading: false })),
      ()  => setGeo(g => ({ ...g, loading: false, error: 'Géolocalisation refusée' }))
    )
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header recherche */}
      <div className="bg-primary-500 pt-6 pb-8">
        <div className="wrap max-w-3xl mx-auto space-y-4">
          <h1 className="text-white font-black text-2xl">Rechercher un bien</h1>

          {/* Barre de recherche */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={inputVal}
                onChange={e => handleInputChange(e.target.value)}
                placeholder="Titre, ville, quartier…"
                className="w-full pl-9 pr-4 py-3 rounded-xl border-0 text-brun-nuit text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
              />
            </div>
            <button type="submit" className="bg-accent-500 text-white font-bold px-4 py-3 rounded-xl hover:bg-accent-600 transition-colors">
              Rechercher
            </button>
          </form>

          {/* Tabs catégorie */}
          <div className="flex gap-2">
            {(['tous', 'vente', 'location'] as const).map(c => (
              <button key={c} onClick={() => { setCategorie(c); setTypeBien(''); setPrixRange('') }}
                className={cn('px-4 py-1.5 rounded-full text-sm font-semibold transition-colors capitalize', c === categorie
                  ? 'bg-white text-primary-500'
                  : 'bg-white/20 text-white hover:bg-white/30')}>
                {c === 'tous' ? 'Tous' : c === 'vente' ? 'Vente' : 'Location'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap max-w-6xl mx-auto py-6 space-y-5">
        {/* Barre filtres + géo */}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setShowFilters(f => !f)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-colors', showFilters ? 'bg-primary-500 text-white border-primary-500' : 'bg-white border-gray-200 text-brun-doux hover:border-primary-300')}>
            <SlidersHorizontal className="w-4 h-4" />
            Filtres {hasFiltres && <span className="bg-accent-400 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">!</span>}
          </button>

          <GeoFilterBar
            geo={geo}
            onActivate={activerGeo}
            onDeactivate={() => setGeo(g => ({ ...g, active: false, userPos: null }))}
            onRayonChange={rayon => setGeo(g => ({ ...g, rayon }))}
          />

          {hasFiltres && (
            <button onClick={resetFiltres} className="flex items-center gap-1 text-xs text-brun-doux hover:text-primary-500">
              <X className="w-3 h-3" /> Effacer les filtres
            </button>
          )}

          <p className="ml-auto text-sm text-brun-doux">
            {loading ? '…' : `${biens.length} résultat${biens.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Panneau filtres */}
        {showFilters && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Ville', value: ville, onChange: setVille, options: VILLES_TOGO.map(v => ({ value: v, label: v })), placeholder: 'Toutes les villes' },
              { label: 'Type de bien', value: typeBien, onChange: setTypeBien, options: typesDisponibles.map(t => ({ value: t.value, label: t.label })), placeholder: 'Tous les types' },
              { label: 'Budget', value: prixRange, onChange: setPrixRange, options: prixRanges.map(r => ({ value: r.label, label: r.label })), placeholder: 'Tous les budgets' },
            ].map(f => (
              <div key={f.label}>
                <label className="label-field text-xs">{f.label}</label>
                <select value={f.value} onChange={e => f.onChange(e.target.value)} className="input-field text-sm">
                  <option value="">{f.placeholder}</option>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {/* Tags filtres actifs */}
        {hasFiltres && (
          <div className="flex flex-wrap gap-2">
            {categorie !== 'tous' && <span className="badge-primary capitalize">{categorie}</span>}
            {ville    && <span className="badge-primary flex items-center gap-1"><MapPin className="w-3 h-3" />{ville}</span>}
            {typeBien && <span className="badge-primary">{TYPES_BIEN.find(t => t.value === typeBien)?.label}</span>}
            {prixRange && <span className="badge-primary">{prixRange}</span>}
            {geo.active && geo.userPos && <span className="badge-geo flex items-center gap-1"><Navigation className="w-3 h-3" />Autour de moi</span>}
          </div>
        )}

        {/* Résultats */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => <BienCardSkeleton key={i} />)}
          </div>
        ) : biens.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="font-semibold text-brun-nuit text-lg">Aucun résultat</p>
            <p className="text-brun-doux text-sm mt-2">
              {query ? `Aucun bien ne correspond à "${query}"` : 'Aucun bien ne correspond à vos critères'}
            </p>
            {hasFiltres && (
              <button onClick={resetFiltres} className="mt-4 btn-outline text-sm px-4 py-2">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {biens.map(b => (
              <div key={b.id} className="relative">
                {geo.active && b._distKm !== undefined && b._distKm !== Infinity && (
                  <div className="absolute top-2 left-2 z-10 badge-geo text-xs flex items-center gap-1">
                    <Navigation className="w-3 h-3" /> {formatDistance(b._distKm)}
                  </div>
                )}
                <BienCard bien={b} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
