'use client'

import { useState, useEffect, useCallback } from 'react'
import { Navigation, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { formatPrix, haversine } from '@/lib/utils'
import { RAYON_OPTIONS } from '@/lib/constants'
import BienCard from '@/components/biens/BienCard'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'
import type { Bien } from '@/types/immobilier'

export default function AutourPage() {
  const [pos, setPos]       = useState<{ lat: number; lng: number } | null>(null)
  const [rayon, setRayon]   = useState(2)
  const [biens, setBiens]   = useState<Bien[]>([])
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError]   = useState('')
  const [asked, setAsked]   = useState(false)

  const fetchBiens = useCallback(async (lat: number, lng: number, r: number) => {
    setLoading(true)
    setError('')
    try {
      // Recherche via RPC PostGIS (rayon en mètres)
      const { data, error: rpcErr } = await supabase.rpc('recherche_biens_autour', {
        p_lat: lat,
        p_lng: lng,
        p_rayon_m: r * 1000,
      })

      if (rpcErr) throw rpcErr
      setBiens((data || []) as Bien[])
    } catch {
      // Fallback : filtre côté client si PostGIS pas dispo
      const { data } = await supabase
        .from('biens')
        .select('*, proprietaire:profiles!owner_id(id,nom,avatar_url,identite_verifiee)')
        .eq('statut', 'publie')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (data) {
        const filtered = (data as Bien[]).filter(b =>
          b.latitude && b.longitude &&
          haversine(lat, lng, b.latitude, b.longitude) <= r
        )
        setBiens(filtered)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.')
      return
    }
    setGeoLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const p = { lat: coords.latitude, lng: coords.longitude }
        setPos(p)
        setAsked(true)
        setGeoLoading(false)
        fetchBiens(p.lat, p.lng, rayon)
      },
      (err) => {
        setGeoLoading(false)
        setAsked(true)
        if (err.code === 1) {
          setError('Accès à la position refusé. Autorisez la géolocalisation dans votre navigateur.')
        } else {
          setError('Impossible de détecter votre position. Réessayez.')
        }
      },
      { timeout: 10000, maximumAge: 60000 }
    )
  }, [rayon, fetchBiens])

  // Relance la recherche quand le rayon change (si déjà localisé)
  useEffect(() => {
    if (pos) fetchBiens(pos.lat, pos.lng, rayon)
  }, [rayon]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen" style={{ background: '#FFFDF5' }}>

      {/* Header */}
      <div className="wrap pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
            <Navigation size={20} style={{ color: '#2D6A4F' }} />
          </div>
          <div>
            <h1 className="page-title mb-0">Autour de moi</h1>
            <p className="text-sm" style={{ color: '#7a5c3a' }}>Biens disponibles près de votre position</p>
          </div>
        </div>
      </div>

      {/* Bloc géolocalisation */}
      <div className="wrap pb-6">
        <div className="bg-white rounded-2xl border border-primary-50 shadow-sm p-5">

          {!pos ? (
            /* État initial — pas encore localisé */
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                <Navigation size={28} style={{ color: '#2D6A4F' }} />
              </div>
              <h2 className="font-black text-lg mb-1" style={{ color: '#1a0a00' }}>
                Trouvez des biens près de vous
              </h2>
              <p className="text-sm mb-5" style={{ color: '#7a5c3a' }}>
                Activez la géolocalisation pour découvrir les annonces dans votre quartier.
              </p>
              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3 mb-4 text-left">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <button
                onClick={locate}
                disabled={geoLoading}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all shadow-sm hover:opacity-90 disabled:opacity-60"
                style={{ background: '#2D6A4F' }}
              >
                {geoLoading
                  ? <><Loader2 size={16} className="animate-spin" /> Localisation…</>
                  : <><Navigation size={16} /> Activer la géolocalisation</>
                }
              </button>
            </div>
          ) : (
            /* Localisé — affiche contrôles rayon */
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                  <MapPin size={15} style={{ color: '#2D6A4F' }} />
                </div>
                <span className="text-sm font-semibold" style={{ color: '#2D6A4F' }}>Position détectée</span>
              </div>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-semibold shrink-0" style={{ color: '#7a5c3a' }}>Rayon :</span>
                <input
                  type="range"
                  min={0}
                  max={RAYON_OPTIONS.length - 1}
                  value={RAYON_OPTIONS.findIndex(o => o.value === rayon)}
                  onChange={e => setRayon(RAYON_OPTIONS[+e.target.value].value)}
                  className="flex-1 h-2 cursor-pointer accent-primary-500"
                />
                <span className="text-sm font-black w-14 text-right shrink-0" style={{ color: '#8B1A2E' }}>
                  {RAYON_OPTIONS.find(o => o.value === rayon)?.label}
                </span>
              </div>

              <button
                onClick={locate}
                className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-50 transition-colors"
                style={{ color: '#7a5c3a' }}
              >
                Relocaliser
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Résultats */}
      {(loading || biens.length > 0 || (asked && pos)) && (
        <div className="wrap pb-nav">

          {/* Compteur */}
          {!loading && pos && (
            <p className="text-sm font-semibold mb-5" style={{ color: '#7a5c3a' }}>
              {biens.length === 0
                ? `Aucun bien dans un rayon de ${RAYON_OPTIONS.find(o => o.value === rayon)?.label}`
                : `${biens.length} bien${biens.length > 1 ? 's' : ''} trouvé${biens.length > 1 ? 's' : ''} — ${RAYON_OPTIONS.find(o => o.value === rayon)?.label} autour de vous`
              }
            </p>
          )}

          {/* Skeletons */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => <BienCardSkeleton key={i} />)}
            </div>
          )}

          {/* Biens */}
          {!loading && biens.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {biens.map(bien => <BienCard key={bien.id} bien={bien} />)}
            </div>
          )}

          {/* Aucun résultat */}
          {!loading && asked && pos && biens.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#FAE8EC' }}>
                <MapPin size={28} style={{ color: '#8B1A2E' }} />
              </div>
              <p className="font-black text-lg mb-1" style={{ color: '#1a0a00' }}>Aucun bien dans ce périmètre</p>
              <p className="text-sm" style={{ color: '#7a5c3a' }}>Essayez d&apos;augmenter le rayon de recherche.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
