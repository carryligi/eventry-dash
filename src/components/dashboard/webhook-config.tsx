'use client'

import { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Trash2,
  Webhook,
  Power,
  Send,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAction, useActionNoInput } from '@/hooks/use-action'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { setWebhookUrl, removeWebhookUrl, toggleWebhook, testWebhook } from '@/lib/actions/webhook'
import type { WebhookSettings } from '@/types'

interface WebhookConfigProps {
  settings: WebhookSettings | null
}

function isValidWebhookInput(url: string): boolean {
  return (
    url.startsWith('https://discord.com/api/webhooks/') ||
    url.startsWith('https://discordapp.com/api/webhooks/')
  )
}

export function WebhookConfig({ settings }: WebhookConfigProps) {
  const [urlValue, setUrlValue] = useState('')
  const [showUrl, setShowUrl] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    error?: string
  } | null>(null)

  const isConfigured = !!settings?.webhook_url

  const maskedUrl = settings?.webhook_url
    ? settings.webhook_url.slice(0, 35) + '\u2022'.repeat(12)
    : ''

  // Auto-clear test result
  useEffect(() => {
    if (!testResult) return
    const timer = setTimeout(() => setTestResult(null), 5000)
    return () => clearTimeout(timer)
  }, [testResult])

  const setUrlAction = useAction(setWebhookUrl, {
    successMessage: 'Webhook URL saved',
    onSuccess: () => {
      setUrlValue('')
      setShowUrl(false)
    },
  })

  const removeUrlAction = useActionNoInput(removeWebhookUrl, {
    successMessage: 'Webhook removed',
    onSuccess: () => setRemoveDialogOpen(false),
  })

  const toggleAction = useAction(toggleWebhook, {
    successMessage: 'Webhook status updated',
  })

  const testAction = useActionNoInput(testWebhook, {
    onSuccess: () => setTestResult({ success: true }),
    onError: (error) => setTestResult({ success: false, error }),
  })

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
              <Webhook className="size-4 text-ev-text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ev-text-primary">
                Discord Webhook
              </h3>
              <p className="text-xs text-ev-text-secondary">
                {isConfigured
                  ? settings.is_active
                    ? 'Webhook active \u2013 receiving autostart status notifications'
                    : 'Webhook configured but disabled'
                  : 'Send autostart status notifications to a Discord channel'}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${
                isConfigured
                  ? settings.is_active
                    ? 'bg-ev-success'
                    : 'bg-ev-warning'
                  : 'bg-ev-text-tertiary'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isConfigured
                  ? settings.is_active
                    ? 'text-ev-success'
                    : 'text-ev-warning'
                  : 'text-ev-text-tertiary'
              }`}
            >
              {isConfigured
                ? settings.is_active
                  ? 'Active'
                  : 'Inactive'
                : 'Not configured'}
            </span>
          </div>
        </div>

        {isConfigured ? (
          <>
            {/* Masked URL display */}
            <div className="space-y-2">
              <Label className="text-ev-text-secondary">Webhook URL</Label>
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-mono bg-ev-tertiary border border-ev-border-subtle text-ev-text-secondary">
                <span className="flex-1 truncate">
                  {showUrl ? settings.webhook_url : maskedUrl}
                </span>
                <button
                  onClick={() => setShowUrl(!showUrl)}
                  className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/5 text-ev-text-tertiary"
                >
                  {showUrl ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg px-3 py-3 bg-ev-tertiary border border-ev-border-subtle">
              <div className="flex items-center gap-2">
                <Power className="size-4 text-ev-text-tertiary" />
                <span className="text-sm font-medium text-ev-text-primary">
                  Webhook Enabled
                </span>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={(checked) => toggleAction.execute(checked)}
                disabled={toggleAction.isPending}
              />
            </div>

            {/* Remove button */}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setRemoveDialogOpen(true)}
              disabled={removeUrlAction.isPending}
            >
              <Trash2 className="size-3.5" />
              Remove Webhook
            </Button>

            <ConfirmDialog
              open={removeDialogOpen}
              onOpenChange={setRemoveDialogOpen}
              title="Remove Discord Webhook"
              description="This will remove your Discord webhook URL and disable status notifications. This action cannot be undone."
              confirmLabel="Remove"
              variant="destructive"
              isPending={removeUrlAction.isPending}
              onConfirm={() => removeUrlAction.execute()}
            />
          </>
        ) : (
          /* Set URL form */
          <div className="space-y-3">
            <Label htmlFor="webhook-url" className="text-ev-text-secondary">
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <Input
                id="webhook-url"
                type={showUrl ? 'text' : 'password'}
                placeholder="https://discord.com/api/webhooks/..."
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isValidWebhookInput(urlValue.trim())) {
                    setUrlAction.execute(urlValue.trim())
                  }
                }}
                className="bg-ev-tertiary border-ev-border-default text-ev-text-primary"
              />
              <button
                onClick={() => setShowUrl(!showUrl)}
                className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-white/5 text-ev-text-tertiary"
              >
                {showUrl ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Button
              size="sm"
              onClick={() => setUrlAction.execute(urlValue.trim())}
              disabled={setUrlAction.isPending || !isValidWebhookInput(urlValue.trim())}
            >
              {setUrlAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
              <Webhook className="size-3.5" />
              Set Webhook
            </Button>
          </div>
        )}
      </div>

      {/* Test Webhook Card */}
      {isConfigured && settings.is_active && (
        <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
              <Send className="size-4 text-ev-text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ev-text-primary">
                Test Webhook
              </h3>
              <p className="text-xs text-ev-text-secondary">
                Send a test notification to verify your webhook is working
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => testAction.execute()}
            disabled={testAction.isPending}
          >
            {testAction.isPending && <Loader2 className="size-3.5 animate-spin" />}
            <Send className="size-3.5" />
            Send Test Notification
          </Button>

          {/* Test result feedback */}
          {testResult && (
            <div
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                testResult.success
                  ? 'bg-ev-success/10 border border-ev-success/20'
                  : 'bg-ev-error/10 border border-ev-error/20'
              }`}
            >
              {testResult.success ? (
                <>
                  <CheckCircle2 className="size-4 flex-shrink-0 text-ev-success" />
                  <span className="text-ev-success">
                    Test notification sent successfully!
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="size-4 flex-shrink-0 text-ev-error" />
                  <span className="text-ev-error">
                    {testResult.error || 'Failed to send test notification'}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
