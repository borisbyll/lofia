'use client'

// Coordonnées des villes du Togo
const COORDS_VILLES: Record<string, [number, number]> = {
  'Lomé':        [6.1375, 1.2123],
  'Kpalimé':     [6.9000, 0.6333],
  'Atakpamé':    [7.5333, 1.1167],
  'Sokodé':      [8.9833, 1.1333],
  'Kara':        [9.5511, 1.1862],
  'Tsévié':      [6.4167, 1.2000],
  'Aného':       [6.2333, 1.5833],
  'Notsé':       [6.9500, 1.1833],
  'Dapaong':     [10.8667, 0.2000],
  'Mango':       [10.3500, 0.4667],
  'Bassar':      [9.2500, 0.7833],
  'Bafilo':      [9.3500, 1.2667],
  'Kandé':       [9.9500, 1.0667],
  'Niamtougou':  [9.7667, 1.1000],
  'Pagouda':     [9.7500, 1.3833],
}

// Fallback : centre du Togo
const DEFAULT_COORDS: [number, number] = [8.6195, 0.8248]

interface Props {
  ville: string
  commune?: string | null
}

export default function MapApproximatif({ ville, commune }: Props) {
  const [lat, lon] = COORDS_VILLES[ville] ?? DEFAULT_COORDS
  const zoom = 13

  // Bounding box ≈ ±0.01° (~1 km) autour du centre
  const delta = 0.012
  const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 220 }}>
      {/* Overlay semi-transparent pour indiquer zone approximative + bloquer interaction */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,26,46,0.10) 0%, transparent 80%)' }}
      />

      <iframe
        title={`Carte approximative — ${ville}`}
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0, display: 'block', filter: 'saturate(0.85)' }}
        loading="lazy"
        referrerPolicy="no-referrer"
      />

      {/* Badge zone approximative */}
      <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-primary-100">
        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        <span className="text-xs font-semibold text-primary-700">
          Zone approximative — {commune ? `${commune}, ` : ''}{ville}
        </span>
      </div>
    </div>
  )
}
