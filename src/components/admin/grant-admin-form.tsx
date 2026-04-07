'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Loader2 } from 'lucide-react'
import { grantAdmin } from '@/lib/actions/admin'
import { useAction } from '@/hooks/use-action'

export function GrantAdminForm() {
  const [userId, setUserId] = useState('')

  const { execute, isPending } = useAction(grantAdmin, {
    successMessage: 'Admin-Rechte erteilt',
    onSuccess: () => setUserId(''),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) return
    execute(userId.trim())
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-ev-border-subtle">
        <Shield className="size-4 text-ev-text-tertiary" />
        <h3 className="text-sm font-medium text-ev-text-primary">Add Admin</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="userId" className="text-xs uppercase tracking-widest text-ev-text-tertiary">
            User ID
          </Label>
          <Input
            id="userId"
            placeholder="e.g. user_xxxxx"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-9 font-mono bg-ev-tertiary border-ev-border-default text-ev-text-primary"
          />
        </div>

        <Button
          type="submit"
          size="sm"
          disabled={isPending || !userId.trim()}
          className="gap-1.5"
        >
          {isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Shield className="size-3.5" />
          )}
          {isPending ? 'Granting...' : 'Grant Admin'}
        </Button>
      </form>
    </div>
  )
}
