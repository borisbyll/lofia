'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Navigation, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoLofia } from '@/components/lofia/LogoLofia'

type Tab = 'tous' | 'vente' | 'location'

export default function HeroSection() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<Tab>('tous')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const dest = tab === 'vente' ? '/vente' : tab === 'location' ? '/location' : '/recherche'
    router.push(`${dest}?q=${encodeURIComponent(query)}${tab !== 'tous' ? `&categorie=${tab}` : ''}`)
  }

  const handleGeo = () => {
    router.push('/vente?geo=1')
  }

  const tabs: { key: Tab; label: string; href: string }[] = [
    { key: 'tous',     label: 'Tous',     href: '/recherche' },
    { key: 'vente',    label: 'Vente',    href: '/vente' },
    { key: 'location', label: 'Location', href: '/location' },
  ]

  return (
    <section
      className="relative min-h-[440px] md:min-h-[600px] flex items-center overflow-hidden"
      style={{ background: 'linear-gradient(150deg, #8B1A2E 0%, #6B0F1E 50%, #4D0A15 100%)' }}
    >
      {/* Motifs géométriques fond */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-white/5" />
        <div className="absolute top-1/2 -left-24 w-96 h-96 rounded-full border border-white/5" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full border border-accent/10" />
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#D4A832' }} />
      </div>

      <div className="wrap relative z-10 py-8 sm:py-14 md:py-20 w-full">
        <div className="max-w-2xl mx-auto text-center">

          {/* Logo LOFIA. */}
          <div className="flex justify-center mb-6 sm:mb-8">
            <LogoLofia variant="light" className="text-2xl sm:text-3xl" />
          </div>

          {/* Titre H1 */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] mb-3 sm:mb-4">
            Trouvez votre bien
            <span className="block" style={{ color: '#D4A832' }}>idéal au Togo</span>
          </h1>

          <p className="text-white/70 text-sm sm:text-base md:text-lg mb-7 sm:mb-10 leading-relaxed px-2">
            Vente, location courte et longue durée — en toute confiance.
          </p>

          {/* Tabs */}
          <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-2xl p-1 gap-1 mb-5 sm:mb-6 border border-white/10">
            {tabs.map(({ key, label, href }) => (
              <button
                key={key}
                onClick={() => { setTab(key); router.push(href) }}
                className={cn(
                  'px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200',
                  tab === key
                    ? 'bg-white text-primary-600 shadow-md'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Barre de recherche — colonne sur très petit écran */}
          <form
            onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,.3)] p-2 flex flex-col sm:flex-row gap-2"
          >
            <div className="flex-1 flex items-center gap-2.5 pl-3">
              <Search size={18} className="shrink-0" style={{ color: '#8B1A2E' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Quartier, ville, type de bien…"
                className="flex-1 text-sm outline-none py-2.5 min-w-0 placeholder:text-brun-doux/50 bg-transparent"
                style={{ color: '#1a0a00' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary rounded-xl px-5 sm:px-6 py-2.5 text-sm font-black w-full sm:w-auto justify-center"
            >
              <Search size={15} className="sm:hidden" />
              <span className="hidden sm:inline">Rechercher</span>
              <span className="sm:hidden">Rechercher</span>
            </button>
          </form>

          {/* Géolocalisation */}
          <button
            onClick={handleGeo}
            className="mt-4 sm:mt-5 inline-flex items-center gap-2 sm:gap-2.5 text-white/70 hover:text-white text-xs sm:text-sm font-medium transition-colors group"
          >
            <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border border-white/20 group-hover:border-white/40 transition-colors shrink-0" style={{ background: '#2D6A4F' }}>
              <Navigation size={13} className="text-white" />
            </span>
            Autour de moi — GPS
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 sm:mt-12 max-w-xs sm:max-w-sm mx-auto">
            {[
              { value: '500+', label: 'Annonces' },
              { value: '1 200+', label: 'Membres' },
              { value: '15',  label: 'Villes' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-black" style={{ color: '#D4A832' }}>{s.value}</p>
                <p className="text-[10px] sm:text-xs text-white/50 mt-0.5 uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Vague bas */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M0 64L1440 64L1440 0C1200 48 720 64 0 0L0 64Z" fill="#FFFDF5"/>
        </svg>
      </div>
    </section>
  )
}
