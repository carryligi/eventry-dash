'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Webhook,
  Send,
  Save,
  RotateCcw,
  Code2,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAction, useActionNoInput } from '@/hooks/use-action'
import { updateWebhookTemplate, testWebhookTemplate } from '@/lib/actions/admin'
import type { WebhookTemplateKey } from '@/lib/validations'
import type { TemplateVariable } from '@/lib/webhook-templates'

interface WebhookPayloadEditorProps {
  title: string
  description: string
  settingKey: WebhookTemplateKey
  defaultTemplate: string
  currentValue: string | null
  variables: TemplateVariable[]
}

export function WebhookPayloadEditor({
  title,
  description,
  settingKey,
  defaultTemplate,
  currentValue,
  variables,
}: WebhookPayloadEditorProps) {
  const initial = currentValue && currentValue.trim() !== '' ? currentValue : defaultTemplate
  const [value, setValue] = useState(initial)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!testResult) return
    const t = setTimeout(() => setTestResult(null), 5000)
    return () => clearTimeout(t)
  }, [testResult])

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(null), 1500)
    return () => clearTimeout(t)
  }, [copied])

  const parseError = useMemo(() => {
    if (!value.trim()) return 'Template darf nicht leer sein'
    try {
      const parsed = JSON.parse(value)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
        return 'Muss ein JSON-Objekt sein'
      if (!Array.isArray((parsed as { embeds?: unknown }).embeds))
        return 'Muss ein "embeds" Array enthalten'
      return null
    } catch (e) {
      return e instanceof Error ? e.message : 'Ungueltiges JSON'
    }
  }, [value])

  const isDirty = value !== initial

  const saveAction = useAction(
    async (v: string) => updateWebhookTemplate(settingKey, v),
    { successMessage: 'Webhook-Template gespeichert' },
  )

  const testAction = useActionNoInput(
    async () => testWebhookTemplate(settingKey),
    {
      onSuccess: () => setTestResult({ success: true }),
      onError: (error) => setTestResult({ success: false, error }),
    },
  )

  const handleFormat = () => {
    try {
      const pretty = JSON.stringify(JSON.parse(value), null, 2)
      setValue(pretty)
    } catch {
      // do nothing — parseError already shows the issue
    }
  }

  const handleReset = () => {
    setValue(defaultTemplate)
  }

  const handleCopyVar = async (name: string) => {
    const token = `{{${name}}}`
    try {
      await navigator.clipboard.writeText(token)
      setCopied(name)
    } catch {
      // ignore clipboard failures
    }
  }

  return (
    <div className="bg-ev-secondary rounded-xl border border-ev-border-default overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-ev-border-subtle">
        <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
          <Webhook className="size-4 text-ev-text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ev-text-primary">{title}</h3>
          <p className="text-xs text-ev-text-secondary truncate">{description}</p>
        </div>
      </div>

      {/* Editor */}
      <div className="p-5 space-y-4">
        <Textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
          className="font-mono text-xs leading-relaxed min-h-[420px] bg-ev-tertiary border-ev-border-default text-ev-text-primary resize-y"
        />

        {parseError ? (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-ev-error/10 border border-ev-error/20">
            <XCircle className="size-4 flex-shrink-0 text-ev-error mt-0.5" />
            <span className="text-xs text-ev-error font-mono break-all">{parseError}</span>
          </div>
        ) : (
          <p className="text-[11px] text-ev-text-tertiary">
            Valides JSON. Platzhalter mit <code className="font-mono">{'{{variable}}'}</code> werden beim Senden ersetzt.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => saveAction.execute(value)}
            disabled={saveAction.isPending || !!parseError || !isDirty}
          >
            {saveAction.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleFormat}
            disabled={!!parseError}
          >
            <Code2 className="size-3.5" />
            Format JSON
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={value === defaultTemplate}
          >
            <RotateCcw className="size-3.5" />
            Reset to Default
          </Button>

          <div className="flex-1" />

          <Button
            size="sm"
            variant="secondary"
            onClick={() => testAction.execute()}
            disabled={testAction.isPending}
          >
            {testAction.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            Send Test
          </Button>
        </div>

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
                <span className="text-ev-success">Test-Webhook erfolgreich gesendet</span>
              </>
            ) : (
              <>
                <XCircle className="size-4 flex-shrink-0 text-ev-error" />
                <span className="text-ev-error break-all">{testResult.error || 'Fehler beim Senden'}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Variables reference */}
      <div className="px-5 py-4 border-t border-ev-border-subtle bg-ev-tertiary/30">
        <p className="text-[11px] uppercase tracking-widest font-semibold text-ev-text-tertiary mb-2">
          Verfuegbare Variablen (click to copy)
        </p>
        <div className="flex flex-wrap gap-1.5">
          {variables.map((v) => (
            <button
              key={v.name}
              type="button"
              onClick={() => handleCopyVar(v.name)}
              title={v.description}
              className="group flex items-center gap-1 px-2 py-1 rounded-md bg-ev-tertiary border border-ev-border-subtle hover:border-ev-border-strong transition-colors"
            >
              <code className="text-[11px] font-mono text-ev-text-secondary group-hover:text-ev-text-primary">
                {`{{${v.name}}}`}
              </code>
              {copied === v.name ? (
                <CheckCircle2 className="size-3 text-ev-success" />
              ) : (
                <Copy className="size-3 text-ev-text-tertiary group-hover:text-ev-text-secondary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
