import { Suspense } from 'react'
import VenteClient from './VenteClient'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'

export const metadata = {
  title: 'Acheter — Terrains, maisons et villas en vente au Togo',
  description: 'Achetez un terrain, une maison, une villa ou un immeuble au Togo. Biens vérifiés par nos modérateurs. Lomé, Kara, Sokodé et toutes les villes du Togo.',
  alternates: { canonical: 'https://logikahome.com/vente' },
  openGraph: {
    title: 'Acheter — Terrains, maisons et villas en vente au Togo',
    description: 'Achetez un terrain, une maison, une villa ou un immeuble au Togo. Biens vérifiés. Lomé et partout au Togo.',
    url: 'https://logikahome.com/vente',
    siteName: 'LOFIA.',
    locale: 'fr_TG',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Acheter un bien immobilier au Togo — LOFIA.',
    description: 'Terrains, maisons, villas et immeubles à vendre au Togo.',
  },
}

export default function VentePage() {
  return (
    <Suspense fallback={
      <div className="wrap py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <BienCardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <VenteClient />
    </Suspense>
  )
}
