import { TabsSkeleton, PageHeaderSkeleton, ReservationListSkeleton } from '@/components/ui/DashboardSkeleton'

export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <PageHeaderSkeleton />
      <TabsSkeleton n={3} />
      <ReservationListSkeleton n={5} />
    </div>
  )
}
