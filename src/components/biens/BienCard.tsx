'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, MapPin, BedDouble, Bath, Maximize2, Navigation, ShieldCheck, Star } from 'lucide-react'
import { cn, formatPrix, formatDistance } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

import type { Bien } from '@/types/immobilier'

interface Props {
  bien: Bien & { _distKm?: number; _favori?: boolean; note_moyenne?: number; nb_avis?: number }
  compact?: boolean
  priority?: boolean
  onUnfavorite?: (id: string) => void
}

export default function BienCard({ bien, compact, priority, onUnfavorite }: Props) {
  const { user } = useAuthStore()

  const [favori, setFavori] = useState(bien._favori ?? false)
  const [loadingFav, setLoadingFav] = useState(false)

  const toggleFavori = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!user || loadingFav) return
    setLoadingFav(true)
    try {
      if (favori) {
        await supabase.from('favoris').delete().eq('user_id', user.id).eq('bien_id', bien.id)
        if (onUnfavorite) onUnfavorite(bien.id)
      } else {
        await supabase.from('favoris').insert({ user_id: user.id, bien_id: bien.id })
      }
      setFavori(v => !v)
    } finally {
      setLoadingFav(false)
    }
  }

  const img = bien.photo_principale || bien.photos?.[0]

  const isVente = bien.categorie === 'vente'
  const isCourte = bien.type_location === 'courte_duree'

  return (
    <Link href={`/biens/${bien.slug}`} className="card-bien group block">
      {/* Photo */}
      <div className="relative overflow-hidden aspect-[4/3]">
        {img ? (
          <Image
            src={img}
            alt={bien.titre}
            fill
            priority={priority}
            className="object-cover sm:group-hover:scale-105 sm:transition-transform sm:duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #FAE8EC 0%, #F5E6C0 100%)' }}
          >
            <MapPin size={32} style={{ color: '#E8909F' }} />
          </div>
        )}

        {/* Badge catégorie */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
            style={
              isVente
                ? { background: '#8B1A2E', color: '#fff' }
                : isCourte
                ? { background: '#D4A832', color: '#1a0a00' }
                : { background: '#2D6A4F', color: '#fff' }
            }
          >
            {isVente ? 'À vendre' : isCourte ? 'Courte durée' : 'Longue durée'}
          </span>
          {bien.is_featured && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm"
              style={{ background: '#D4A832', color: '#1a0a00' }}
            >
              ⭐ Sponsorisé
            </span>
          )}
        </div>

        {/* Distance */}
        {bien._distKm != null && (
          <div className="absolute top-3 right-10 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
            style={{ color: '#8B1A2E' }}
          >
            <Navigation size={9} /> {formatDistance(bien._distKm)}
          </div>
        )}

        {/* Favori */}
        {user && (
          <button
            onClick={toggleFavori}
            disabled={loadingFav}
            className={cn(
              'absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm',
              favori ? 'bg-red-500 text-white' : 'bg-white/90 hover:bg-white'
            )}
            style={!favori ? { color: '#7a5c3a' } : undefined}
          >
            <Heart size={14} fill={favori ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* Vérifié */}
        {bien.proprietaire?.identite_verifiee && (
          <div
            className="absolute bottom-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
            style={{ color: '#2D6A4F' }}
          >
            <ShieldCheck size={10} /> Vérifié
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="p-4">
        <h3
          className="font-bold text-sm leading-snug line-clamp-2 mb-2 transition-colors"
          style={{ color: '#1a0a00' }}
        >
          {bien.titre}
        </h3>

        {/* Prix */}
        <p className="prix text-lg mb-1">
          {formatPrix(bien.prix)}
          {bien.categorie === 'location' && isCourte && (
            <span className="text-xs font-normal ml-1" style={{ color: '#7a5c3a' }}>/nuit</span>
          )}
          {bien.categorie === 'location' && !isCourte && (
            <span className="text-xs font-normal ml-1" style={{ color: '#7a5c3a' }}>/mois</span>
          )}
        </p>

        {/* Localisation */}
        <div className="flex items-center gap-1 text-xs mb-3" style={{ color: '#7a5c3a' }}>
          <MapPin size={11} className="shrink-0 opacity-60" />
          <span className="truncate">{[bien.quartier, bien.ville].filter(Boolean).join(', ')}</span>
        </div>

        {/* Détails */}
        {!compact && (
          <div
            className="flex items-center gap-3 text-xs border-t pt-3"
            style={{ borderColor: '#FAE8EC', color: '#7a5c3a' }}
          >
            {bien.nb_chambres != null && (
              <div className="flex items-center gap-1">
                <BedDouble size={12} className="opacity-60" />
                {bien.nb_chambres} ch.
              </div>
            )}
            {bien.nb_salles_bain != null && (
              <div className="flex items-center gap-1">
                <Bath size={12} className="opacity-60" />
                {bien.nb_salles_bain} sdb
              </div>
            )}
            {bien.superficie != null && (
              <div className="flex items-center gap-1">
                <Maximize2 size={12} className="opacity-60" />
                {bien.superficie} m²
              </div>
            )}
            {bien.nb_avis != null && bien.nb_avis > 0 && (
              <div className="flex items-center gap-1 ml-auto">
                <Star size={11} style={{ color: '#D4A832', fill: '#D4A832' }} />
                <span className="font-semibold" style={{ color: '#1a0a00' }}>
                  {bien.note_moyenne?.toFixed(1)}
                </span>
                <span className="opacity-60">({bien.nb_avis})</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
