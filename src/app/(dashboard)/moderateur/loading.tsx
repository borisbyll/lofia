import { StatCardsSkeleton, PageHeaderSkeleton, ReservationListSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton n={4} />
      <div className="skeleton rounded-xl h-5 w-48 mb-4" />
      <ReservationListSkeleton n={5} />
    </div>
  )
}
