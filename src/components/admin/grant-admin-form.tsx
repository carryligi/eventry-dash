'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Plus } from 'lucide-react'
import { grantAdmin } from '@/lib/actions/admin'

export function GrantAdminForm() {
  const [userId, setUserId] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId.trim()) return

    setError(null)
    setSuccess(false)

    startTransition(async () => {
      try {
        await grantAdmin(userId.trim())
        setSuccess(true)
        setUserId('')
        setTimeout(() => setSuccess(false), 3000)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to grant admin')
      }
    })
  }

  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
        }}
      />
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <Plus className="size-4" style={{ color: 'var(--text-tertiary)' }} />
        <h3
          className="text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Add Admin
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label
            htmlFor="userId"
            className="text-xs uppercase tracking-widest"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Discord User ID
          </Label>
          <Input
            id="userId"
            placeholder="e.g. 123456789012345678"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value)
              setError(null)
            }}
            className="h-9 font-mono"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        {error && (
          <p className="text-xs" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs" style={{ color: 'var(--success)' }}>
            Admin privileges granted successfully.
          </p>
        )}

        <Button
          type="submit"
          size="sm"
          disabled={isPending || !userId.trim()}
          className="gap-1.5"
        >
          <Shield className="size-3.5" />
          {isPending ? 'Granting...' : 'Grant Admin'}
        </Button>
      </form>
    </div>
  )
}
