'use client'

import { useMemo } from 'react'
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  FileJson,
  Globe,
  Key,
  Loader2,
  MessageSquare,
  Package,
  Upload,
  Webhook,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAction } from '@/hooks/use-action'
import { commitEventryImport } from '@/lib/actions/eventry-import'
import type {
  ImportSummary,
  ParsedEventryImport,
} from '@/lib/import/eventry-types'

interface EventryImportPreviewProps {
  parsed: ParsedEventryImport
  rawJson: string
  fileName: string
  existingDataCounts: {
    keywords: number
    hasPushover: boolean
    hasSilently: boolean
    hasWebhook: boolean
  }
  onCancel: () => void
  onSuccess: (summary: ImportSummary) => void
}

export function EventryImportPreview({
  parsed,
  rawJson,
  fileName,
  existingDataCounts,
  onCancel,
  onSuccess,
}: EventryImportPreviewProps) {
  const { globalCount, scopedCount } = useMemo(() => {
    let global = 0
    let scoped = 0
    for (const kw of parsed.keywords) {
      if (!kw.channelIds?.length && !kw.categoryIds?.length) global++
      else scoped++
    }
    return { globalCount: global, scopedCount: scoped }
  }, [parsed.keywords])

  const commitAction = useAction(commitEventryImport, {
    successMessage: 'Import successful',
    onSuccess,
  })

  const handleImport = () => {
    commitAction.execute({ rawJson })
  }

  const exportedDate = parsed.meta.exportedAt
    ? new Date(parsed.meta.exportedAt).toLocaleString('de-DE')
    : 'unbekannt'

  const userHasExistingData =
    existingDataCounts.keywords > 0 ||
    existingDataCounts.hasPushover ||
    existingDataCounts.hasSilently ||
    existingDataCounts.hasWebhook

  const maskWebhook = (url: string) => {
    const prefix = url.slice(0, 42)
    const tail = url.slice(-8)
    return `${prefix}…${tail}`
  }

  return (
    <div className="space-y-5">
      {/* File header */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle">
            <FileJson className="size-4 text-ev-text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ev-text-primary truncate">
              {fileName}
            </h3>
            <p className="text-xs text-ev-text-secondary">
              Exportiert am {exportedDate}
              {parsed.meta.exportedByUsername
                ? ` von ${parsed.meta.exportedByUsername}`
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Summary grid */}
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <h3 className="text-sm font-semibold text-ev-text-primary">
          Das wird importiert
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewRow
            icon={MessageSquare}
            label="Discord User ID"
            value={parsed.discordUserId}
            mono
          />
          <PreviewRow
            icon={Clock}
            label="Pinger"
            value={`${parsed.pinger.isActive ? 'Aktiv' : 'Inaktiv'}, ${parsed.pinger.cooldownMinutes} Min Cooldown`}
          />
          <PreviewRow
            icon={Bell}
            label="Pushover"
            value={
              parsed.pushover
                ? `Key gesetzt, Priority ${parsed.pushover.priority}`
                : 'nicht vorhanden'
            }
            muted={!parsed.pushover}
          />
          <PreviewRow
            icon={Bot}
            label="Silently"
            value={
              parsed.silently
                ? `Key gesetzt, min_stock ${parsed.silently.minStock}`
                : 'nicht vorhanden'
            }
            muted={!parsed.silently}
          />
          <PreviewRow
            icon={Clock}
            label="Autostart Schedule"
            value={
              parsed.silently?.scheduleStart && parsed.silently?.scheduleEnd
                ? `${parsed.silently.scheduleStart} – ${parsed.silently.scheduleEnd}`
                : 'nicht gesetzt'
            }
            muted={
              !parsed.silently?.scheduleStart || !parsed.silently?.scheduleEnd
            }
          />
          <PreviewRow
            icon={Webhook}
            label="Webhook"
            value={
              parsed.webhook
                ? maskWebhook(parsed.webhook.webhookUrl)
                : 'nicht vorhanden'
            }
            mono={!!parsed.webhook}
            muted={!parsed.webhook}
          />
          <PreviewRow
            icon={Package}
            label="Autostart Blacklist"
            value={`${parsed.autostartDisabledKeywords.length} Keywords`}
            muted={parsed.autostartDisabledKeywords.length === 0}
          />
          <PreviewRow
            icon={Key}
            label="Keywords"
            value={`${parsed.keywords.length} insgesamt • ${scopedCount} mit Scope${
              globalCount > 0 ? ` • ${globalCount} global` : ''
            }`}
          />
        </div>

        {globalCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-ev-border-subtle bg-ev-tertiary p-3">
            <Globe className="size-4 text-ev-text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-ev-text-secondary">
              {globalCount} Keyword{globalCount === 1 ? '' : 's'} ohne Scope
              wird als <strong className="text-ev-text-primary">Global</strong>{' '}
              importiert — matcht in allen vom Bot beobachteten Kategorien und
              Channels.
            </p>
          </div>
        )}

        {parsed.issues.length > 0 && (
          <div className="rounded-lg border border-ev-border-subtle bg-ev-tertiary p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-ev-text-secondary">
              <AlertTriangle className="size-3.5 text-amber-400" />
              Hinweise
            </div>
            <ul className="text-xs text-ev-text-tertiary space-y-0.5 list-disc list-inside">
              {parsed.issues.map((i, idx) => (
                <li key={idx}>{i.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Replace-all warning */}
      {userHasExistingData && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
            <AlertTriangle className="size-4" />
            Replace All — bestehende Daten werden gelöscht
          </div>
          <ul className="text-xs text-amber-200/80 space-y-0.5 list-disc list-inside">
            {existingDataCounts.keywords > 0 && (
              <li>{existingDataCounts.keywords} bestehende Keywords</li>
            )}
            {existingDataCounts.hasPushover && <li>Aktuelle Pushover-Settings</li>}
            {existingDataCounts.hasSilently && <li>Aktuelle Silently-Settings</li>}
            {existingDataCounts.hasWebhook && <li>Aktuelle Webhook-Settings</li>}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={commitAction.isPending}
        >
          Abbrechen
        </Button>
        <Button onClick={handleImport} disabled={commitAction.isPending}>
          {commitAction.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          Jetzt importieren
        </Button>
      </div>
    </div>
  )
}

interface PreviewRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  mono?: boolean
  muted?: boolean
}

function PreviewRow({ icon: Icon, label, value, mono, muted }: PreviewRowProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-ev-border-subtle bg-ev-tertiary px-3 py-2.5">
      <div className="flex items-center justify-center size-7 rounded-md bg-ev-secondary border border-ev-border-subtle shrink-0 mt-0.5">
        <Icon className="size-3.5 text-ev-text-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-ev-text-tertiary">
          {label}
        </p>
        <p
          className={`text-sm truncate ${
            muted ? 'text-ev-text-tertiary' : 'text-ev-text-primary'
          } ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </p>
      </div>
      {!muted && (
        <CheckCircle2 className="size-3.5 text-ev-success shrink-0 mt-1" />
      )}
    </div>
  )
}
