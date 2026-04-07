'use client'

import { Button } from '@/components/ui/button'
import { ShieldOff, Loader2 } from 'lucide-react'
import { revokeAdmin } from '@/lib/actions/admin'
import { useAction } from '@/hooks/use-action'

interface RevokeAdminButtonProps {
  userId: string
  isSelf: boolean
}

export function RevokeAdminButton({ userId, isSelf }: RevokeAdminButtonProps) {
  const { execute, isPending } = useAction(revokeAdmin, {
    successMessage: 'Admin-Rechte entzogen',
  })

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="destructive"
        size="sm"
        onClick={() => execute(userId)}
        disabled={isPending || isSelf}
        className="gap-1.5"
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ShieldOff className="size-3.5" />
        )}
        {isPending ? 'Revoking...' : 'Remove'}
      </Button>
      {isSelf && (
        <span className="text-xs text-ev-text-tertiary">You</span>
      )}
    </div>
  )
}
