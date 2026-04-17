export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8 max-w-2xl">
      {/* Avatar */}
      <div className="dashboard-card flex items-center gap-4 mb-6">
        <div className="skeleton rounded-full w-20 h-20 shrink-0" />
        <div className="space-y-2">
          <div className="skeleton rounded-xl h-5 w-36" />
          <div className="skeleton rounded-xl h-4 w-24" />
        </div>
      </div>
      {/* Champs */}
      <div className="dashboard-card space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="skeleton rounded-lg h-3.5 w-24" />
            <div className="skeleton rounded-xl h-11 w-full" />
          </div>
        ))}
        <div className="skeleton rounded-xl h-11 w-full mt-2" />
      </div>
    </div>
  )
}
