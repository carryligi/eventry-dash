import { Skeleton } from '@/components/ui/skeleton'

export default function KeywordsLoading() {
  return (
    <div className="space-y-0">
      {/* TopBar skeleton */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <Skeleton className="h-7 w-28" />
      </div>

      <div className="p-6 space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>

        {/* Search bar */}
        <Skeleton className="h-8 w-64 rounded-lg" />

        {/* Table skeleton */}
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-4 px-4 h-10 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
          </div>

          {/* Rows */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 h-10 border-b last:border-b-0"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
