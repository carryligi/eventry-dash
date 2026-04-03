'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Key, Trash2, Bell, AlertTriangle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
import { setPushoverKey, removePushoverKey, updatePriority } from '@/lib/actions/pushover'
import type { PushoverSettings } from '@/types'

interface PushoverConfigProps {
  settings: PushoverSettings | null
}

const PRIORITIES = [
  { value: 0, label: 'Normal', description: 'Standard notification', icon: Bell },
  { value: 1, label: 'High', description: 'Bypasses quiet hours', icon: AlertTriangle },
  { value: 2, label: 'Emergency', description: 'Repeats until acknowledged', icon: AlertCircle },
] as const

export function PushoverConfig({ settings }: PushoverConfigProps) {
  const [keyValue, setKeyValue] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState<number>(settings?.priority ?? 0)
  const [isPending, startTransition] = useTransition()

  const isConfigured = !!settings?.user_key
  const maskedKey = settings?.user_key
    ? settings.user_key.slice(0, 4) + '\u2022'.repeat(24) + settings.user_key.slice(-4)
    : ''

  const handleSetKey = () => {
    if (!keyValue.trim()) return
    startTransition(async () => {
      await setPushoverKey(keyValue.trim(), selectedPriority)
      setKeyValue('')
      setShowKey(false)
    })
  }

  const handleRemoveKey = () => {
    startTransition(async () => {
      await removePushoverKey()
    })
  }

  const handlePriorityChange = (priority: number) => {
    setSelectedPriority(priority)
    if (isConfigured) {
      startTransition(async () => {
        await updatePriority(priority)
      })
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* API Key Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-9 rounded-lg"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Key className="size-4" style={{ color: 'var(--text-accent)' }} />
              </div>
              <div>
                <CardTitle style={{ color: 'var(--text-primary)' }}>
                  Pushover User Key
                </CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>
                  {isConfigured ? 'API key configured' : 'No API key configured'}
                </CardDescription>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{
                  backgroundColor: isConfigured
                    ? 'var(--success)'
                    : 'var(--text-tertiary)',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: isConfigured
                    ? 'var(--success)'
                    : 'var(--text-tertiary)',
                }}
              >
                {isConfigured ? 'Connected' : 'Not configured'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isConfigured ? (
            <>
              {/* Masked key display */}
              <div className="space-y-2">
                <Label style={{ color: 'var(--text-secondary)' }}>Current Key</Label>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-mono"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span className="flex-1 truncate">
                    {showKey ? settings.user_key : maskedKey}
                  </span>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="flex-shrink-0 p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Remove key */}
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="destructive" size="sm" disabled={isPending}>
                      <Trash2 className="size-3.5" data-icon="inline-start" />
                      Remove Key
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Remove Pushover Key</DialogTitle>
                    <DialogDescription>
                      This will remove your Pushover user key and disable push notifications. This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose render={<Button variant="outline" size="sm" />}>
                      Cancel
                    </DialogClose>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveKey}
                      disabled={isPending}
                    >
                      Remove
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            /* Set key form */
            <div className="space-y-3">
              <Label htmlFor="pushover-key" style={{ color: 'var(--text-secondary)' }}>
                User Key
              </Label>
              <div className="flex gap-2">
                <Input
                  id="pushover-key"
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter your Pushover user key"
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSetKey()
                  }}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={handleSetKey}
                disabled={isPending || !keyValue.trim()}
              >
                <Key className="size-3.5" data-icon="inline-start" />
                Set Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Priority Card */}
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center size-9 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Bell className="size-4" style={{ color: 'var(--text-accent)' }} />
            </div>
            <div>
              <CardTitle style={{ color: 'var(--text-primary)' }}>
                Notification Priority
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                Controls how aggressively Pushover delivers alerts
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid gap-2">
            {PRIORITIES.map((p) => {
              const Icon = p.icon
              const isSelected = selectedPriority === p.value
              return (
                <button
                  key={p.value}
                  onClick={() => handlePriorityChange(p.value)}
                  disabled={isPending}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200"
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                    border: isSelected
                      ? '1px solid var(--border-default)'
                      : '1px solid transparent',
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  <div
                    className="flex items-center justify-center size-8 rounded-md flex-shrink-0"
                    style={{
                      backgroundColor: isSelected
                        ? 'rgba(255,255,255,0.06)'
                        : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid var(--border-subtle)' : 'none',
                    }}
                  >
                    <Icon
                      className="size-4"
                      style={{
                        color: isSelected
                          ? 'var(--text-accent)'
                          : 'var(--text-tertiary)',
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-sm font-medium"
                      style={{
                        color: isSelected
                          ? 'var(--text-primary)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {p.label}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {p.description}
                    </div>
                  </div>
                  {/* Selection indicator */}
                  <div
                    className="size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{
                      borderColor: isSelected
                        ? 'var(--text-accent)'
                        : 'var(--border-default)',
                    }}
                  >
                    {isSelected && (
                      <div
                        className="size-2 rounded-full"
                        style={{ backgroundColor: 'var(--text-accent)' }}
                      />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
