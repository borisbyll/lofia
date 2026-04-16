'use client'

import { Loader2, Navigation, MapPin, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RAYON_OPTIONS } from '@/lib/constants'

export interface GeoState {
  active:  boolean
  userPos: { lat: number; lng: number } | null
  rayon:   number
  loading: boolean
  error:   string
}

interface Props {
  geo:           GeoState
  onActivate:    () => void
  onDeactivate:  () => void
  onRayonChange: (km: number) => void
  className?:    string
}

export default function GeoFilterBar({ geo, onActivate, onDeactivate, onRayonChange, className }: Props) {
  const rayonLabel = RAYON_OPTIONS.find(o => o.value === geo.rayon)?.label ?? `${geo.rayon} km`

  return (
    <div className={cn(
      'rounded-2xl border-2 px-4 py-3 transition-all duration-300 mb-4',
      geo.active && geo.userPos
        ? 'border-primary-500 bg-primary-50'
        : 'border-dashed border-gray-200 bg-gray-50/60',
      className
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Bouton activer */}
        <button type="button" onClick={geo.active ? onDeactivate : onActivate} disabled={geo.loading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all shrink-0',
            geo.active && geo.userPos
              ? 'bg-primary-500 text-white hover:bg-primary-600'
              : 'bg-white border-2 border-primary-500 text-primary-500 hover:bg-primary-50'
          )}>
          {geo.loading
            ? <Loader2 size={15} className="animate-spin" />
            : <Navigation size={15} className={geo.active && geo.userPos ? 'fill-white' : ''} />}
          {geo.loading ? 'Localisation…' : geo.active && geo.userPos ? 'Autour de moi — actif' : 'Autour de moi'}
        </button>

        {/* Slider rayon */}
        {geo.active && geo.userPos && (
          <>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold text-primary-500 shrink-0">Rayon :</span>
              <input type="range" min={0} max={RAYON_OPTIONS.length - 1}
                value={RAYON_OPTIONS.findIndex(o => o.value === geo.rayon)}
                onChange={e => onRayonChange(RAYON_OPTIONS[+e.target.value].value)}
                className="flex-1 accent-primary-500 h-2 cursor-pointer" />
              <span className="text-sm font-black text-primary-500 w-14 shrink-0 text-right">{rayonLabel}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-xs text-primary-600 font-semibold">
                <MapPin size={12} /> Position détectée
              </div>
              <button type="button" onClick={onDeactivate}
                className="w-6 h-6 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center transition-colors" title="Désactiver">
                <X size={12} className="text-primary-600" />
              </button>
            </div>
          </>
        )}

        {!geo.active && !geo.loading && (
          <p className="text-xs text-gray-400 hidden sm:block">
            Trouvez des biens à 500m, 2km… autour de votre position actuelle
          </p>
        )}
      </div>
      {geo.error && <p className="mt-2 text-xs text-red-500 font-medium">{geo.error}</p>}
    </div>
  )
}
