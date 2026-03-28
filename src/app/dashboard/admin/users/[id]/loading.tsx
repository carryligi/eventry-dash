import { Skeleton } from '@/components/ui/skeleton'

export default function AdminUserDetailLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Back link */}
      <Skeleton className="h-5 w-28" />
      {/* User Header */}
      <Skeleton className="h-28 rounded-xl" />
      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      {/* Keywords */}
      <Skeleton className="h-64 rounded-xl" />
      {/* Notifications */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
