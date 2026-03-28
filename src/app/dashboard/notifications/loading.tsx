import { Skeleton } from '@/components/ui/skeleton'

export default function NotificationsLoading() {
  return (
    <div className="space-y-0">
      {/* TopBar skeleton */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Skeleton className="h-7 w-32" />
      </div>

      <div className="p-6 space-y-4">
        {/* Tabs skeleton */}
        <div
          className="inline-flex items-center gap-1 rounded-lg p-1"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Skeleton className="h-7 w-36 rounded-md" />
          <Skeleton className="h-7 w-32 rounded-md" />
        </div>

        {/* Card skeleton - Pushover config */}
        <div
          className="rounded-xl p-4 space-y-4 max-w-2xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          {/* Card header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-28" />
              </div>
            </div>
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Key input skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>

        {/* Priority card skeleton */}
        <div
          className="rounded-xl p-4 space-y-4 max-w-2xl"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3.5 w-52" />
            </div>
          </div>

          {/* Priority options */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <Skeleton className="size-8 rounded-md" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-36" />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
