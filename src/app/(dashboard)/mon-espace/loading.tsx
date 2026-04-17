import { StatCardsSkeleton, PageHeaderSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8 space-y-6">
      <PageHeaderSkeleton />
      <StatCardsSkeleton n={4} />
      {/* Annonces récentes */}
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="dashboard-card flex gap-4">
            <div className="skeleton rounded-xl w-16 h-16 shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton rounded-xl h-4 w-3/4" />
              <div className="skeleton rounded-xl h-3 w-1/2" />
            </div>
            <div className="skeleton rounded-full h-6 w-16 self-start" />
          </div>
        ))}
      </div>
    </div>
  )
}
