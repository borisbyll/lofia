import type { Metadata } from 'next'
import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import BiensFeatured from '@/components/home/BiensFeatured'
import VillesSection from '@/components/home/VillesSection'
import TrustSection from '@/components/home/TrustSection'
import CtaSection from '@/components/home/CtaSection'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'

// Revalidation ISR toutes les 5 minutes — Vercel sert la page en cache, régénère en arrière-plan
export const revalidate = 300

export const metadata: Metadata = {
  title: 'LOFIA. — Immobilier au Togo : Vente & Location',
  description: 'Trouvez votre bien immobilier au Togo. Maisons, villas, terrains, appartements à vendre ou à louer à Lomé et partout au Togo. Plateforme de confiance pour résidents et diaspora.',
  alternates: { canonical: 'https://lofia.vercel.app' },
  openGraph: {
    title: 'LOFIA. — Immobilier au Togo : Vente & Location',
    description: 'Trouvez votre bien immobilier au Togo. Maisons, villas, terrains à vendre ou à louer à Lomé et partout au Togo.',
    url: 'https://lofia.vercel.app',
    siteName: 'LOFIA.',
    locale: 'fr_TG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LOFIA. — Immobilier au Togo',
    description: 'La plateforme immobilière de référence au Togo. Vente & location pour résidents et diaspora.',
  },
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <CategoriesSection />
      <Suspense fallback={
        <div className="wrap section">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({length: 8}).map((_,i) => <BienCardSkeleton key={i} />)}
          </div>
        </div>
      }>
        <BiensFeatured />
      </Suspense>
      <VillesSection />
      <TrustSection />
      <CtaSection />
    </>
  )
}
