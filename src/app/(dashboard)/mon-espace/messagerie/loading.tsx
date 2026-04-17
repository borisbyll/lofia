export default function Loading() {
  return (
    <div className="wrap py-6 pb-24 lg:pb-8">
      <div className="skeleton rounded-xl h-7 w-40 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 480 }}>
        {/* Liste conversations */}
        <div className="lg:col-span-1 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="dashboard-card flex gap-3">
              <div className="skeleton rounded-full w-10 h-10 shrink-0" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="skeleton rounded-xl h-3.5 w-3/4" />
                <div className="skeleton rounded-xl h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        {/* Zone messages */}
        <div className="hidden lg:flex lg:col-span-2 dashboard-card items-center justify-center">
          <div className="skeleton rounded-full w-14 h-14" />
        </div>
      </div>
    </div>
  )
}
