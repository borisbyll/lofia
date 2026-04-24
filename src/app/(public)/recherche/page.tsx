import { Suspense } from 'react'
import RechercheClient from './RechercheClient'
import { BienGridSkeleton } from '@/components/ui/DashboardSkeleton'

export const metadata = {
  title: 'Recherche — LOFIA.',
  description: 'Recherchez parmi tous les biens en vente et en location au Togo.',
}

export default function RecherchePage() {
  return (
    <Suspense fallback={<BienGridSkeleton />}>
      <RechercheClient />
    </Suspense>
  )
}
