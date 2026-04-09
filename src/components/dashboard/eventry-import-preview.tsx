'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Bot,
  CheckCircle2,
  Clock,
  FileJson,
  Key,
  Loader2,
  MessageSquare,
  Package,
  Upload,
  Webhook,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAction } from '@/hooks/use-action'
import { commitEventryImport } from '@/lib/actions/eventry-import'
import type {
  ImportSummary,
  ParsedEventryImport,
  ScopeOverride,
} from '@/lib/import/eventry-types'

type ScopeFormState = Record<
  string,
  {
    channelIds: string
    categoryIds: string
    skip: boolean
  }
>

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

function parseIdList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function EventryImportPreview({
  parsed,
  rawJson,
  fileName,
  existingDataCounts,
  onCancel,
  onSuccess,
}: EventryImportPreviewProps) {
  const scopelessKeywords = useMemo(
    () => parsed.keywords.filter((k) => k.needsScope),
    [parsed.keywords],
  )
  const scopedKeywordsCount = parsed.keywords.length - scopelessKeywords.length

  const [scopeForm, setScopeForm] = useState<ScopeFormState>(() => {
    const initial: ScopeFormState = {}
    for (const kw of scopelessKeywords) {
      initial[kw.legacyId] = { channelIds: '', categoryIds: '', skip: false }
    }
    return initial
  })

  const commitAction = useAction(commitEventryImport, {
    successMessage: 'Import erfolgreich',
    onSuccess,
  })

  const unresolvedScopeless = scopelessKeywords.filter((kw) => {
    const entry = scopeForm[kw.legacyId]
    if (!entry || entry.skip) return false
    const hasChannel = parseIdList(entry.channelIds).length > 0
    const hasCategory = parseIdList(entry.categoryIds).length > 0
    return !hasChannel && !hasCategory
  })

  const handleImport = () => {
    const scopeOverrides: Record<string, ScopeOverride> = {}
    for (const kw of scopelessKeywords) {
      const entry = scopeForm[kw.legacyId]
      if (!entry) continue
      if (entry.skip) {
        scopeOverrides[kw.legacyId] = { skip: true }
        continue
      }
      scopeOverrides[kw.legacyId] = {
        channelIds: parseIdList(entry.channelIds),
        categoryIds: parseIdList(entry.categoryIds),
      }
    }
    commitAction.execute({ rawJson, scopeOverrides })
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
            value={`${parsed.keywords.length} insgesamt • ${scopedKeywordsCount} mit Scope${
              scopelessKeywords.length > 0
                ? ` • ${scopelessKeywords.length} ohne Scope`
                : ''
            }`}
          />
        </div>

        {parsed.issues.filter((i) => i.kind !== 'scopeless_keyword').length >
          0 && (
          <div className="rounded-lg border border-ev-border-subtle bg-ev-tertiary p-3 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-ev-text-secondary">
              <AlertTriangle className="size-3.5 text-amber-400" />
              Hinweise
            </div>
            <ul className="text-xs text-ev-text-tertiary space-y-0.5 list-disc list-inside">
              {parsed.issues
                .filter((i) => i.kind !== 'scopeless_keyword')
                .map((i, idx) => (
                  <li key={idx}>{i.message}</li>
                ))}
            </ul>
          </div>
        )}
      </div>

      {/* Scopeless keyword editor */}
      {scopelessKeywords.length > 0 && (
        <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ev-text-primary">
              <AlertTriangle className="size-4 text-amber-400" />
              Keywords ohne Scope — Aktion erforderlich
            </h3>
            <p className="text-xs text-ev-text-secondary">
              Diese Keywords haben weder einen Channel noch eine Category. Weise
              jedem entweder Channel-IDs oder Category-IDs zu (Komma-getrennt),
              oder markiere sie als überspringen.
            </p>
          </div>

          <div className="space-y-3">
            {scopelessKeywords.map((kw) => {
              const entry = scopeForm[kw.legacyId]
              if (!entry) return null
              const disabled = entry.skip
              return (
                <div
                  key={kw.legacyId}
                  className="rounded-lg border border-ev-border-subtle bg-ev-tertiary p-3 space-y-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ev-text-primary truncate">
                        {kw.keyword}
                      </p>
                      {kw.internalName && (
                        <p className="text-xs text-ev-text-tertiary truncate">
                          {kw.internalName}
                        </p>
                      )}
                    </div>
                    <Button
                      variant={entry.skip ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setScopeForm((prev) => ({
                          ...prev,
                          [kw.legacyId]: { ...prev[kw.legacyId], skip: !entry.skip },
                        }))
                      }
                    >
                      {entry.skip ? (
                        <>
                          <XCircle className="size-3.5" />
                          Skipping
                        </>
                      ) : (
                        'Skip'
                      )}
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-ev-text-secondary">
                        Channel IDs (Komma-getrennt)
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="z.B. 1466199721696559207"
                        value={entry.channelIds}
                        disabled={disabled}
                        onChange={(e) =>
                          setScopeForm((prev) => ({
                            ...prev,
                            [kw.legacyId]: {
                              ...prev[kw.legacyId],
                              channelIds: e.target.value,
                            },
                          }))
                        }
                        className="bg-ev-secondary border-ev-border-default text-ev-text-primary font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-ev-text-secondary">
                        Category IDs (Komma-getrennt)
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="z.B. 1341277169191489628"
                        value={entry.categoryIds}
                        disabled={disabled}
                        onChange={(e) =>
                          setScopeForm((prev) => ({
                            ...prev,
                            [kw.legacyId]: {
                              ...prev[kw.legacyId],
                              categoryIds: e.target.value,
                            },
                          }))
                        }
                        className="bg-ev-secondary border-ev-border-default text-ev-text-primary font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-3">
          {unresolvedScopeless.length > 0 && (
            <span className="text-xs text-amber-300">
              {unresolvedScopeless.length} Keywords brauchen noch Scope
            </span>
          )}
          <Button
            onClick={handleImport}
            disabled={commitAction.isPending || unresolvedScopeless.length > 0}
          >
            {commitAction.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            Jetzt importieren
          </Button>
        </div>
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
