'use client'

import { useState } from 'react'
import { Eye, EyeOff, Key, Trash2, Bell, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAction, useActionNoInput } from '@/hooks/use-action'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
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
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const isConfigured = !!settings?.user_key
  const maskedKey = settings?.user_key
    ? settings.user_key.slice(0, 4) + '\u2022'.repeat(24) + settings.user_key.slice(-4)
    : ''

  const setKeyAction = useAction(
    (input: { key: string; priority: number }) => setPushoverKey(input.key, input.priority),
    {
      successMessage: 'Pushover key saved',
      onSuccess: () => {
        setKeyValue('')
        setShowKey(false)
      },
    },
  )

  const removeKeyAction = useActionNoInput(removePushoverKey, {
    successMessage: 'Pushover key removed',
    onSuccess: () => setRemoveDialogOpen(false),
  })

  const priorityAction = useAction(updatePriority, {
    successMessage: 'Priority updated',
  })

  const handlePriorityChange = (priority: number) => {
    setSelectedPriority(priority)
    if (isConfigured) {
      priorityAction.execute(priority)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {/* API Key Card */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
              <Key className="size-4 text-ev-text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ev-text-primary">
                Pushover User Key
              </h3>
              <p className="text-xs text-ev-text-secondary">
                {isConfigured ? 'API key configured' : 'No API key configured'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                isConfigured ? 'bg-ev-success' : 'bg-ev-text-tertiary'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isConfigured ? 'text-ev-success' : 'text-ev-text-tertiary'
              }`}
            >
              {isConfigured ? 'Connected' : 'Not configured'}
            </span>
          </div>
        </div>

        {isConfigured ? (
          <>
            {/* Masked key display */}
            <div className="space-y-2">
              <Label className="text-ev-text-secondary">Current Key</Label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-mono bg-ev-tertiary border border-ev-border-subtle text-ev-text-secondary">
                <span className="flex-1 truncate">
                  {showKey ? settings.user_key : maskedKey}
                </span>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/5 text-ev-text-tertiary"
                >
                  {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Remove key */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRemoveDialogOpen(true)}
              disabled={removeKeyAction.isPending}
            >
              <Trash2 className="size-3.5" />
              Remove Key
            </Button>

            <ConfirmDialog
              open={removeDialogOpen}
              onOpenChange={setRemoveDialogOpen}
              title="Remove Pushover Key"
              description="This will remove your Pushover user key and disable push notifications. This action cannot be undone."
              confirmLabel="Remove"
              variant="destructive"
              isPending={removeKeyAction.isPending}
              onConfirm={() => removeKeyAction.execute()}
            />
          </>
        ) : (
          /* Set key form */
          <div className="space-y-3">
            <Label htmlFor="pushover-key" className="text-ev-text-secondary">
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
                  if (e.key === 'Enter') {
                    setKeyAction.execute({ key: keyValue.trim(), priority: selectedPriority })
                  }
                }}
                className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-white/5 text-ev-text-tertiary"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => setKeyAction.execute({ key: keyValue.trim(), priority: selectedPriority })}
              disabled={setKeyAction.isPending || !keyValue.trim()}
            >
              {setKeyAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
              <Key className="size-3.5" />
              Set Key
            </Button>
          </div>
        )}
      </div>

      {/* Priority Card */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
            <Bell className="size-4 text-ev-text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ev-text-primary">
              Notification Priority
            </h3>
            <p className="text-xs text-ev-text-secondary">
              Controls how aggressively Pushover delivers alerts
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {PRIORITIES.map((p) => {
            const Icon = p.icon
            const isSelected = selectedPriority === p.value
            return (
              <button
                key={p.value}
                onClick={() => handlePriorityChange(p.value)}
                disabled={priorityAction.isPending}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-left transition-all duration-200 ${
                  isSelected
                    ? 'bg-ev-tertiary border border-ev-border-default'
                    : 'border border-transparent'
                } ${priorityAction.isPending ? 'opacity-60' : ''}`}
              >
                <div
                  className={`flex items-center justify-center size-8 rounded-md flex-shrink-0 ${
                    isSelected
                      ? 'bg-white/[0.06] border border-ev-border-subtle'
                      : 'bg-ev-tertiary'
                  }`}
                >
                  <Icon
                    className={`size-4 ${
                      isSelected ? 'text-ev-text-accent' : 'text-ev-text-tertiary'
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      isSelected ? 'text-ev-text-primary' : 'text-ev-text-secondary'
                    }`}
                  >
                    {p.label}
                  </div>
                  <div className="text-xs text-ev-text-tertiary">
                    {p.description}
                  </div>
                </div>
                {/* Selection indicator */}
                <div
                  className={`size-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'border-ev-text-accent' : 'border-ev-border-default'
                  }`}
                >
                  {isSelected && (
                    <div className="size-2 rounded-full bg-ev-text-accent" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
