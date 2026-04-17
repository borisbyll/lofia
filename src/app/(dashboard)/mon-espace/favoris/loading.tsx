import { PageHeaderSkeleton, BienGridSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <PageHeaderSkeleton />
      <BienGridSkeleton n={6} cols={3} />
    </div>
  )
}
