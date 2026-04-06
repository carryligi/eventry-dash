'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { updateCooldown, togglePinger } from '@/lib/actions/pinger'
import { removeAllKeywords } from '@/lib/actions/keywords'
import { Clock, AlertTriangle, Power, Trash2 } from 'lucide-react'

interface SettingsFormProps {
  cooldownMinutes: number
  pingerActive: boolean
}

export function SettingsForm({ cooldownMinutes, pingerActive }: SettingsFormProps) {
  const [cooldown, setCooldown] = useState(cooldownMinutes)
  const [isPending, startTransition] = useTransition()
  const [deactivatePending, startDeactivateTransition] = useTransition()
  const [removePending, startRemoveTransition] = useTransition()
  const [cooldownSaved, setCooldownSaved] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  function handleSaveCooldown() {
    startTransition(async () => {
      try {
        await updateCooldown(cooldown)
        setCooldownSaved(true)
        setTimeout(() => setCooldownSaved(false), 2000)
      } catch {
        // Server action error
      }
    })
  }

  function handleDeactivatePinger() {
    startDeactivateTransition(async () => {
      try {
        await togglePinger(false)
      } catch {
        // Server action error
      }
    })
  }

  function handleRemoveAllKeywords() {
    startRemoveTransition(async () => {
      try {
        await removeAllKeywords()
        setRemoveDialogOpen(false)
      } catch {
        // Server action error
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Pinger Cooldown Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <Clock className="size-4" style={{ color: 'var(--text-accent)' }} />
            Pinger Cooldown
          </CardTitle>
          <CardDescription style={{ color: 'var(--text-secondary)' }}>
            Cooldown per channel and keyword combo. 0 = no cooldown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="space-y-2 flex-1 max-w-[200px]">
              <Label
                htmlFor="cooldown"
                style={{ color: 'var(--text-secondary)' }}
              >
                Minutes
              </Label>
              <Input
                id="cooldown"
                type="number"
                min={0}
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <Button
              onClick={handleSaveCooldown}
              disabled={isPending || cooldown === cooldownMinutes}
              size="default"
              style={{
                backgroundColor: cooldownSaved
                  ? 'var(--success)'
                  : 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              {isPending
                ? 'Saving...'
                : cooldownSaved
                  ? 'Saved!'
                  : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone Section */}
      <Card
        style={{
          borderColor: 'rgba(248, 113, 113, 0.2)',
        }}
        className="glass-card ring-1"
      >
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2"
            style={{ color: 'var(--error)' }}
          >
            <AlertTriangle className="size-4" />
            Danger Zone
          </CardTitle>
          <CardDescription style={{ color: 'var(--text-secondary)' }}>
            Irreversible actions. Proceed with caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deactivate Pinger */}
          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="space-y-0.5">
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Deactivate Pinger
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Stops all keyword notifications immediately.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeactivatePinger}
              disabled={deactivatePending || !pingerActive}
            >
              <Power className="size-3.5 mr-1.5" />
              {deactivatePending
                ? 'Deactivating...'
                : !pingerActive
                  ? 'Already Off'
                  : 'Deactivate'}
            </Button>
          </div>

          <Separator style={{ backgroundColor: 'var(--border-subtle)' }} />

          {/* Remove All Keywords */}
          <div
            className="flex items-center justify-between rounded-lg p-3"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="space-y-0.5">
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Remove All Keywords
              </p>
              <p
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Permanently deletes every keyword you have configured.
              </p>
            </div>
            <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" />
                }
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Remove All
              </DialogTrigger>
              <DialogContent
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'rgba(248, 113, 113, 0.3)',
                }}
              >
                <DialogHeader>
                  <DialogTitle style={{ color: 'var(--text-primary)' }}>
                    Remove All Keywords?
                  </DialogTitle>
                  <DialogDescription style={{ color: 'var(--text-secondary)' }}>
                    This will permanently delete all of your keywords. This
                    action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline" />}
                  >
                    Cancel
                  </DialogClose>
                  <Button
                    variant="destructive"
                    onClick={handleRemoveAllKeywords}
                    disabled={removePending}
                  >
                    {removePending ? 'Removing...' : 'Yes, Remove All'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
