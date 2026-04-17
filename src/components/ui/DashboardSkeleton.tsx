// Briques de skeleton réutilisables pour les loading.tsx du dashboard

function Sk({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className ?? ''}`} />
}

/** Grille de N stat-cards */
export function StatCardsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="stat-card">
          <Sk className="h-4 w-20 mb-2" />
          <Sk className="h-7 w-16 mb-1" />
          <Sk className="h-3 w-24" />
        </div>
      ))}
    </div>
  )
}

/** Grille de N BienCard skeletons */
export function BienGridSkeleton({ n = 6, cols = 3 }: { n?: number; cols?: 2 | 3 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''} gap-4`}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="card-bien overflow-hidden">
          <Sk className="aspect-[4/3] rounded-none rounded-t-xl" />
          <div className="p-4 space-y-2">
            <Sk className="h-4 w-3/4" />
            <Sk className="h-5 w-1/2" />
            <Sk className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Liste de N cartes réservation */
export function ReservationListSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="dashboard-card flex gap-4">
          <Sk className="w-20 h-20 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <Sk className="h-4 w-2/3" />
            <Sk className="h-3 w-1/2" />
            <Sk className="h-3 w-1/3" />
          </div>
          <Sk className="h-6 w-20 rounded-full self-start" />
        </div>
      ))}
    </div>
  )
}

/** Header de page dashboard */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6">
      <Sk className="h-7 w-48 mb-1" />
      <Sk className="h-4 w-64" />
    </div>
  )
}

/** Tabs skeleton */
export function TabsSkeleton({ n = 4 }: { n?: number }) {
  return (
    <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
      {Array.from({ length: n }).map((_, i) => (
        <Sk key={i} className="h-8 w-24 rounded-xl shrink-0" />
      ))}
    </div>
  )
}
