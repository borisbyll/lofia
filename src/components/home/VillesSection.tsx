import Link from 'next/link'
import { MapPin } from 'lucide-react'

const villes = [
  { nom: 'Lomé',     desc: 'Capitale économique', bg: '#8B1A2E' },
  { nom: 'Kpalimé',  desc: 'Région des plateaux',  bg: '#6B0F1E' },
  { nom: 'Atakpamé', desc: 'Centre du pays',        bg: '#2D6A4F' },
  { nom: 'Sokodé',   desc: 'Région centrale',        bg: '#B08A28' },
  { nom: 'Kara',     desc: 'Nord du pays',           bg: '#4D0A15' },
  { nom: 'Tsévié',   desc: 'Proche de Lomé',         bg: '#2D6A4F' },
]

export default function VillesSection() {
  return (
    <section className="section" style={{ background: '#FFFDF5' }}>
      <div className="wrap">
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="section-title">Explorez par ville</h2>
          <p className="section-subtitle">Trouvez des biens dans les principales villes du Togo.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
          {villes.map(({ nom, desc, bg }) => (
            <Link
              key={nom}
              href={`/vente?ville=${encodeURIComponent(nom)}`}
              className="group relative rounded-xl sm:rounded-2xl p-3 sm:p-5 text-white overflow-hidden shadow-sm hover:shadow-[0_12px_32px_rgba(0,0,0,.2)] hover:scale-105 transition-all duration-300"
              style={{ background: bg }}
            >
              {/* Overlay doré hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-15 transition-opacity pointer-events-none"
                style={{ background: '#D4A832' }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#D4A832' }}
              />
              <MapPin size={15} className="mb-2 sm:mb-3 opacity-70" />
              <p className="font-black text-xs sm:text-sm leading-tight">{nom}</p>
              <p className="text-[9px] sm:text-[11px] opacity-60 mt-0.5 hidden sm:block">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
