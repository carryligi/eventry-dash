'use client'

import { useState } from 'react'
import { Eye, EyeOff, Key, Trash2, Loader2 } from 'lucide-react'
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
import { setSilentlyKey, removeSilentlyKey } from '@/lib/actions/silently'
import { useAction, useActionNoInput } from '@/hooks/use-action'
import type { SilentlySettings } from '@/types'

interface SilentlyConfigProps {
  settings: SilentlySettings | null
}

export function SilentlyConfig({ settings }: SilentlyConfigProps) {
  const [keyValue, setKeyValue] = useState('')
  const [showKey, setShowKey] = useState(false)

  const isConfigured = !!settings?.user_key
  const maskedKey = settings?.user_key
    ? settings.user_key.slice(0, 4) + '\u2022'.repeat(24) + settings.user_key.slice(-4)
    : ''

  const { execute: executeSetKey, isPending: isSettingKey } = useAction(
    setSilentlyKey,
    {
      successMessage: 'API key saved',
      onSuccess: () => {
        setKeyValue('')
        setShowKey(false)
      },
    },
  )

  const { execute: executeRemoveKey, isPending: isRemovingKey } = useActionNoInput(
    removeSilentlyKey,
    { successMessage: 'API key removed' },
  )

  const isPending = isSettingKey || isRemovingKey

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-gradient-to-br from-white/[0.06] to-white/[0.03] border border-ev-border-subtle">
              <Key className="size-4 text-ev-text-accent" />
            </div>
            <div>
              <CardTitle className="text-ev-text-primary">
                Silently API Key
              </CardTitle>
              <CardDescription className="text-ev-text-secondary">
                {isConfigured ? 'API key configured' : 'No API key configured'}
              </CardDescription>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                isConfigured
                  ? settings?.is_active
                    ? 'bg-ev-success'
                    : 'bg-ev-warning'
                  : 'bg-ev-text-tertiary'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isConfigured
                  ? settings?.is_active
                    ? 'text-ev-success'
                    : 'text-ev-warning'
                  : 'text-ev-text-tertiary'
              }`}
            >
              {isConfigured
                ? settings?.is_active
                  ? 'Active'
                  : 'Inactive'
                : 'Not configured'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isConfigured ? (
          <>
            {/* Masked key display */}
            <div className="space-y-2">
              <Label className="text-ev-text-secondary">Current Key</Label>
              <div className="flex items-center gap-2 rounded-lg bg-ev-tertiary border border-ev-border-subtle px-3 py-2 text-sm font-mono text-ev-text-secondary">
                <span className="flex-1 truncate">
                  {showKey ? settings.user_key : maskedKey}
                </span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex-shrink-0 p-1 rounded text-ev-text-tertiary transition-colors hover:bg-white/[0.06]"
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
                    onClick={executeRemoveKey}
                    disabled={isRemovingKey}
                  >
                    {isRemovingKey ? (
                      <Loader2 className="size-3.5 mr-1 animate-spin" />
                    ) : null}
                    Remove
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          /* Set key form */
          <div className="space-y-3">
            <Label htmlFor="silently-key" className="text-ev-text-secondary">
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
                  if (e.key === 'Enter' && keyValue.trim()) executeSetKey(keyValue.trim())
                }}
                className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="flex-shrink-0 p-2 rounded-lg text-ev-text-tertiary transition-colors hover:bg-white/[0.06]"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => executeSetKey(keyValue.trim())}
              disabled={isSettingKey || !keyValue.trim()}
            >
              {isSettingKey ? (
                <Loader2 className="size-3.5 mr-1 animate-spin" />
              ) : (
                <Key className="size-3.5" data-icon="inline-start" />
              )}
              Set Key
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
