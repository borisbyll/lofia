'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

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

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 13) }, [map, center])
  return null
}

interface Props {
  ville: string
  commune?: string | null
}

export default function MapApproximatif({ ville, commune }: Props) {
  const center = COORDS_VILLES[ville] ?? DEFAULT_COORDS

  return (
    <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: 220 }}>
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle
          center={center}
          radius={800}
          pathOptions={{
            color: '#8B1A2E',
            fillColor: '#8B1A2E',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
        <RecenterMap center={center} />
      </MapContainer>

      {/* Badge zone approximative */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 flex items-center gap-1.5 shadow-sm border border-primary-100">
        <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
        <span className="text-xs font-semibold text-primary-700">
          Zone approximative — {commune ? `${commune}, ` : ''}{ville}
        </span>
      </div>
    </div>
  )
}
