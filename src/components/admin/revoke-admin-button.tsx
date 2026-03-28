'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { ShieldOff } from 'lucide-react'
import { revokeAdmin } from '@/lib/actions/admin'

interface RevokeAdminButtonProps {
  userId: string
  isSelf: boolean
}

export function RevokeAdminButton({ userId, isSelf }: RevokeAdminButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleRevoke = () => {
    setError(null)
    startTransition(async () => {
      try {
        await revokeAdmin(userId)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to revoke admin')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        onClick={handleRevoke}
        disabled={isPending || isSelf}
        className="gap-1.5"
      >
        <ShieldOff className="size-3.5" />
        {isPending ? 'Revoking...' : 'Remove'}
      </Button>
      {isSelf && (
        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          You
        </span>
      )}
      {error && (
        <span className="text-xs" style={{ color: 'var(--error)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
