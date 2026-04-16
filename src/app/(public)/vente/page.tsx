import { Suspense } from 'react'
import VenteClient from './VenteClient'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'

export const metadata = { title: 'Acheter — Biens en vente au Togo' }

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
