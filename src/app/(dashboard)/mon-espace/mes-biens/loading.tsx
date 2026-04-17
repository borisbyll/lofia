import { TabsSkeleton, PageHeaderSkeleton, BienGridSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <PageHeaderSkeleton />
        <div className="skeleton rounded-xl h-10 w-28" />
      </div>
      <TabsSkeleton n={5} />
      <BienGridSkeleton n={6} cols={3} />
    </div>
  )
}
