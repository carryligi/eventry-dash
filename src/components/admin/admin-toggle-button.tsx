'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Shield, ShieldOff } from 'lucide-react'
import { grantAdmin, revokeAdmin } from '@/lib/actions/admin'

interface AdminToggleButtonProps {
  userId: string
  isAdmin: boolean
  isSelf: boolean
}

export function AdminToggleButton({
  userId,
  isAdmin,
  isSelf,
}: AdminToggleButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleToggle = () => {
    setError(null)
    startTransition(async () => {
      try {
        if (isAdmin) {
          await revokeAdmin(userId)
        } else {
          await grantAdmin(userId)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An error occurred')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isAdmin ? 'destructive' : 'default'}
        size="sm"
        onClick={handleToggle}
        disabled={isPending || isSelf}
        className="gap-1.5"
      >
        {isAdmin ? (
          <>
            <ShieldOff className="size-3.5" />
            Revoke Admin
          </>
        ) : (
          <>
            <Shield className="size-3.5" />
            Grant Admin
          </>
        )}
      </Button>
      {isSelf && (
        <span
          className="text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Cannot modify yourself
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
