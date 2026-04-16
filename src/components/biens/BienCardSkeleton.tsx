export default function BienCardSkeleton() {
  return (
    <div className="card-bien overflow-hidden">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded-lg w-1/3" />
        <div className="h-5 skeleton rounded-lg w-4/5" />
        <div className="h-6 skeleton rounded-lg w-2/5" />
        <div className="h-4 skeleton rounded-lg w-3/5" />
        <div className="flex gap-3 pt-1">
          <div className="h-3 skeleton rounded w-16" />
          <div className="h-3 skeleton rounded w-16" />
          <div className="h-3 skeleton rounded w-14" />
        </div>
      </div>
    </div>
  )
}
