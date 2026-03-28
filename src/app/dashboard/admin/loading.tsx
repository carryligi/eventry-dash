import { Skeleton } from '@/components/ui/skeleton'

export default function AdminOverviewLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {/* Active Users */}
      <Skeleton className="h-48 rounded-xl" />
      {/* Activity Feed */}
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}
