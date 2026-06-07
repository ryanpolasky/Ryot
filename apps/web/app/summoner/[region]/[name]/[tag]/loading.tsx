export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="skeleton h-11 w-full" />

      {/* Profile header */}
      <div className="card flex flex-wrap items-center gap-4 p-4">
        <div className="skeleton h-[72px] w-[72px]" />
        <div className="space-y-2">
          <div className="skeleton h-8 w-56" />
          <div className="skeleton h-3 w-36" />
        </div>
        <div className="skeleton ml-auto h-9 w-28" />
      </div>

      {/* Rank cards */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {[0, 1].map((i) => (
          <div key={i} className="card flex-1 space-y-3 p-5">
            <div className="skeleton h-2.5 w-24" />
            <div className="skeleton h-7 w-36" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-1 w-full" />
          </div>
        ))}
      </div>

      {/* Champion stats */}
      <div className="space-y-3">
        <div className="skeleton h-2.5 w-32" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="skeleton h-[88px] w-full" />
          <div className="skeleton h-[88px] w-full lg:col-span-2" />
        </div>
        <div className="skeleton h-56 w-full" />
      </div>

      {/* Recent matches */}
      <div className="space-y-2">
        <div className="skeleton mb-3 h-2.5 w-36" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[84px] w-full" />
        ))}
      </div>
    </div>
  );
}
