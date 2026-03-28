import { Skeleton } from '@/components/ui/skeleton'

export default function ImportLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      {/* Upload Card */}
      <Skeleton className="h-[500px] rounded-xl" />
    </div>
  )
}
