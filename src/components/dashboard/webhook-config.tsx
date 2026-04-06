'use client'

import { useState, useTransition, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Trash2,
  Webhook,
  Power,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
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
  const [isPending, startTransition] = useTransition()
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

  const handleSetUrl = () => {
    const trimmed = urlValue.trim()
    if (!trimmed || !isValidWebhookInput(trimmed)) return
    startTransition(async () => {
      await setWebhookUrl(trimmed)
      setUrlValue('')
      setShowUrl(false)
    })
  }

  const handleRemove = () => {
    startTransition(async () => {
      await removeWebhookUrl()
    })
  }

  const handleToggle = (checked: boolean) => {
    startTransition(async () => {
      await toggleWebhook(checked)
    })
  }

  const handleTest = () => {
    startTransition(async () => {
      const result = await testWebhook()
      setTestResult(result)
    })
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-9 rounded-lg"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Webhook className="size-4" style={{ color: 'var(--text-accent)' }} />
              </div>
              <div>
                <CardTitle style={{ color: 'var(--text-primary)' }}>
                  Discord Webhook
                </CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>
                  {isConfigured
                    ? settings.is_active
                      ? 'Webhook active \u2013 receiving autostart status notifications'
                      : 'Webhook configured but disabled'
                    : 'Send autostart status notifications to a Discord channel'}
                </CardDescription>
              </div>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2 rounded-full"
                style={{
                  backgroundColor: isConfigured
                    ? settings.is_active
                      ? 'var(--success)'
                      : 'var(--warning)'
                    : 'var(--text-tertiary)',
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  color: isConfigured
                    ? settings.is_active
                      ? 'var(--success)'
                      : 'var(--warning)'
                    : 'var(--text-tertiary)',
                }}
              >
                {isConfigured
                  ? settings.is_active
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
              {/* Masked URL display */}
              <div className="space-y-2">
                <Label style={{ color: 'var(--text-secondary)' }}>Webhook URL</Label>
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-mono"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span className="flex-1 truncate">
                    {showUrl ? settings.webhook_url : maskedUrl}
                  </span>
                  <button
                    onClick={() => setShowUrl(!showUrl)}
                    className="flex-shrink-0 p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {showUrl ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Active toggle */}
              <div
                className="flex items-center justify-between rounded-lg px-3 py-3"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Power className="size-4" style={{ color: 'var(--text-tertiary)' }} />
                  <span
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Webhook Enabled
                  </span>
                </div>
                <Switch
                  checked={settings.is_active}
                  onCheckedChange={handleToggle}
                  disabled={isPending}
                />
              </div>

              {/* Remove button */}
              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger
                    render={
                      <Button variant="destructive" size="sm" disabled={isPending}>
                        <Trash2 className="size-3.5" data-icon="inline-start" />
                        Remove Webhook
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Remove Discord Webhook</DialogTitle>
                      <DialogDescription>
                        This will remove your Discord webhook URL and disable status
                        notifications. This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose render={<Button variant="outline" size="sm" />}>
                        Cancel
                      </DialogClose>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleRemove}
                        disabled={isPending}
                      >
                        Remove
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            /* Set URL form */
            <div className="space-y-3">
              <Label htmlFor="webhook-url" style={{ color: 'var(--text-secondary)' }}>
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
                    if (e.key === 'Enter') handleSetUrl()
                  }}
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                />
                <button
                  onClick={() => setShowUrl(!showUrl)}
                  className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {showUrl ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                size="sm"
                onClick={handleSetUrl}
                disabled={isPending || !isValidWebhookInput(urlValue.trim())}
              >
                <Webhook className="size-3.5" data-icon="inline-start" />
                Set Webhook
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Webhook Card */}
      {isConfigured && settings.is_active && (
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center size-9 rounded-lg"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <Send className="size-4" style={{ color: 'var(--text-accent)' }} />
              </div>
              <div>
                <CardTitle style={{ color: 'var(--text-primary)' }}>
                  Test Webhook
                </CardTitle>
                <CardDescription style={{ color: 'var(--text-secondary)' }}>
                  Send a test notification to verify your webhook is working
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <Button
              size="sm"
              onClick={handleTest}
              disabled={isPending}
            >
              <Send className="size-3.5" data-icon="inline-start" />
              Send Test Notification
            </Button>

            {/* Test result feedback */}
            {testResult && (
              <div
                className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
                style={{
                  backgroundColor: testResult.success
                    ? 'rgba(74,222,128,0.08)'
                    : 'rgba(248,113,113,0.08)',
                  border: `1px solid ${testResult.success ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                }}
              >
                {testResult.success ? (
                  <>
                    <CheckCircle2
                      className="size-4 flex-shrink-0"
                      style={{ color: 'var(--success)' }}
                    />
                    <span style={{ color: 'var(--success)' }}>
                      Test notification sent successfully!
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle
                      className="size-4 flex-shrink-0"
                      style={{ color: 'var(--error)' }}
                    />
                    <span style={{ color: 'var(--error)' }}>
                      {testResult.error || 'Failed to send test notification'}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
