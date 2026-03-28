import { Skeleton } from '@/components/ui/skeleton'

export default function AutostartLoading() {
  return (
    <>
      {/* TopBar skeleton */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>

      <div className="p-6 space-y-6">
        {/* SilentlyConfig skeleton */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>

        {/* AutostartFilters skeleton */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-[200px] rounded-lg" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>

        {/* ScheduleConfig skeleton */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-8 rounded-lg" />
            <Skeleton className="h-8 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>

        {/* KeywordAutostartList skeleton */}
        <div
          className="rounded-xl p-4 space-y-4"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-52" />
            </div>
          </div>
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-1.5 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-[18px] w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
