import { Suspense } from 'react'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import CategoriesSection from '@/components/home/CategoriesSection'
import BiensFeatured from '@/components/home/BiensFeatured'
import VillesSection from '@/components/home/VillesSection'
import TrustSection from '@/components/home/TrustSection'
import CtaSection from '@/components/home/CtaSection'
import BienCardSkeleton from '@/components/biens/BienCardSkeleton'

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
