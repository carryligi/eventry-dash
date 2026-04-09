'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Eye, EyeOff, Loader2 } from 'lucide-react'
import { updateAppSetting } from '@/lib/actions/admin'
import { useAction } from '@/hooks/use-action'

interface SettingRowProps {
  settingKey: string
  label: string
  value: string
  masked?: boolean
  readOnly?: boolean
}

export function SettingRow({
  settingKey,
  label,
  value,
  masked = false,
  readOnly = false,
}: SettingRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [showValue, setShowValue] = useState(false)

  const { execute, isPending } = useAction(
    async (newValue: string) => updateAppSetting(settingKey, newValue),
    {
      successMessage: 'Setting saved',
      onSuccess: () => setIsEditing(false),
    },
  )

  const displayValue = masked && !showValue
    ? value ? value.slice(0, 3) + '***' + value.slice(-3) : '(not set)'
    : value || '(not set)'

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-ev-border-subtle">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-widest mb-1 text-ev-text-tertiary">
          {label}
        </p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 font-mono text-sm max-w-md bg-ev-tertiary border-ev-border-default text-ev-text-primary"
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => execute(editValue)}
              disabled={isPending}
              className="size-8 p-0"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4 text-ev-success" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              className="size-8 p-0"
            >
              <X className="size-4 text-ev-error" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-ev-text-primary">
              {displayValue}
            </span>
            {masked && value && (
              <button
                onClick={() => setShowValue(!showValue)}
                className="flex items-center justify-center size-6 rounded-md transition-colors text-ev-text-tertiary hover:text-ev-text-secondary"
              >
                {showValue ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            )}
          </div>
        )}
      </div>

      {!readOnly && !isEditing && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="gap-1.5 flex-shrink-0"
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      )}
    </div>
  )
}
