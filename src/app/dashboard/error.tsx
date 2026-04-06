'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[dashboard] Unhandled error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div
        className="flex items-center justify-center size-12 rounded-full"
        style={{ backgroundColor: 'rgba(248,113,113,0.1)' }}
      >
        <AlertTriangle className="size-6" style={{ color: 'var(--error, #f87171)' }} />
      </div>
      <div className="text-center space-y-2">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          Something went wrong
        </h2>
        <p
          className="text-sm max-w-md"
          style={{ color: 'var(--text-tertiary)' }}
        >
          An error occurred while loading this page. This is usually temporary.
        </p>
      </div>
      <Button onClick={reset} variant="outline" className="gap-2 mt-2">
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  )
}
