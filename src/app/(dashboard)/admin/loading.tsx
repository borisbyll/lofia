import { StatCardsSkeleton, PageHeaderSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton n={4} />
      {/* Chart placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="dashboard-card">
          <div className="skeleton rounded-xl h-4 w-32 mb-4" />
          <div className="skeleton rounded-xl w-full" style={{ height: 180 }} />
        </div>
        <div className="dashboard-card">
          <div className="skeleton rounded-xl h-4 w-32 mb-4" />
          <div className="skeleton rounded-xl w-full" style={{ height: 180 }} />
        </div>
      </div>
      {/* Top biens */}
      <div className="skeleton rounded-xl h-5 w-40 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="dashboard-card flex gap-3">
            <div className="skeleton rounded-xl w-12 h-12 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton rounded-xl h-4 w-2/3" />
              <div className="skeleton rounded-xl h-3 w-1/3" />
            </div>
            <div className="skeleton rounded-xl h-5 w-20 self-center" />
          </div>
        ))}
      </div>
    </div>
  )
}
