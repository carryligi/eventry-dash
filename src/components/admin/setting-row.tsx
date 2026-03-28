'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Check, X, Eye, EyeOff } from 'lucide-react'
import { updateAppSetting } from '@/lib/actions/admin'

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
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const displayValue = masked && !showValue
    ? value ? value.slice(0, 3) + '***' + value.slice(-3) : '(not set)'
    : value || '(not set)'

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      try {
        await updateAppSetting(settingKey, editValue)
        setIsEditing(false)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save')
      }
    })
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
    setError(null)
  }

  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3"
      style={{ borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-xs font-medium uppercase tracking-widest mb-1"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {label}
        </p>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 font-mono text-sm max-w-md"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                borderColor: 'var(--border-default)',
                color: 'var(--text-primary)',
              }}
              autoFocus
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSave}
              disabled={isPending}
              className="size-8 p-0"
            >
              <Check className="size-4" style={{ color: 'var(--success)' }} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              className="size-8 p-0"
            >
              <X className="size-4" style={{ color: 'var(--error)' }} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-mono"
              style={{ color: 'var(--text-primary)' }}
            >
              {displayValue}
            </span>
            {masked && value && (
              <button
                onClick={() => setShowValue(!showValue)}
                className="flex items-center justify-center size-6 rounded-md transition-colors duration-200"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {showValue ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            )}
          </div>
        )}
        {error && (
          <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
            {error}
          </p>
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
