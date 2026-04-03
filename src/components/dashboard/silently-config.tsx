'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Key, Trash2, Power } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
import { setSilentlyKey, removeSilentlyKey, toggleAutostart } from '@/lib/actions/silently'
import type { SilentlySettings } from '@/types'

interface SilentlyConfigProps {
  settings: SilentlySettings | null
}

export function SilentlyConfig({ settings }: SilentlyConfigProps) {
  const [keyValue, setKeyValue] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [isPending, startTransition] = useTransition()

  const isConfigured = !!settings?.user_key
  const maskedKey = settings?.user_key
    ? settings.user_key.slice(0, 4) + '\u2022'.repeat(24) + settings.user_key.slice(-4)
    : ''

  const handleSetKey = () => {
    if (!keyValue.trim()) return
    startTransition(async () => {
      await setSilentlyKey(keyValue.trim())
      setKeyValue('')
      setShowKey(false)
    })
  }

  const handleRemoveKey = () => {
    startTransition(async () => {
      await removeSilentlyKey()
    })
  }

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await toggleAutostart(checked)
    })
  }

  return (
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
                Silently API Key
              </CardTitle>
              <CardDescription style={{ color: 'var(--text-secondary)' }}>
                {isConfigured ? 'API key configured' : 'No API key configured'}
              </CardDescription>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{
                  backgroundColor: isConfigured
                    ? settings?.is_active
                      ? 'var(--success)'
                      : 'var(--warning)'
                    : 'var(--text-tertiary)',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: isConfigured
                    ? settings?.is_active
                      ? 'var(--success)'
                      : 'var(--warning)'
                    : 'var(--text-tertiary)',
                }}
              >
                {isConfigured
                  ? settings?.is_active
                    ? 'Active'
                    : 'Inactive'
                  : 'Not configured'}
              </span>
            </div>
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

            {/* Connection toggle */}
            <div
              className="flex items-center justify-between rounded-lg px-3 py-3"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-2">
                <Power className="size-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Autostart Enabled
                </span>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={handleToggle}
                disabled={isPending}
              />
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
                  <DialogTitle>Remove Silently API Key</DialogTitle>
                  <DialogDescription>
                    This will remove your API key and disable autostart. This action cannot be undone.
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
            <Label htmlFor="silently-key" style={{ color: 'var(--text-secondary)' }}>
              API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="silently-key"
                type={showKey ? 'text' : 'password'}
                placeholder="Enter your Silently API key"
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
  )
}
