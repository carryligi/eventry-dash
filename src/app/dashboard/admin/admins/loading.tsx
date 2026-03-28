import { Skeleton } from '@/components/ui/skeleton'

export default function AdminManagementLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Grant Admin Form */}
      <Skeleton className="h-44 rounded-xl" />
      {/* Current Admins Table */}
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
