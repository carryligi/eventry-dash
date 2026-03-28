import { Skeleton } from '@/components/ui/skeleton'

export default function AdminSettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      <Skeleton className="h-64 rounded-xl" />
    </div>
  )
}
