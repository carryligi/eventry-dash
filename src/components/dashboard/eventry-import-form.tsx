'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, FileJson, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { parseEventryExport } from '@/lib/import/eventry-parser'
import {
  EventryParseError,
  type ImportSummary,
  type ParsedEventryImport,
} from '@/lib/import/eventry-types'
import { EventryImportPreview } from './eventry-import-preview'

const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB

interface EventryImportFormProps {
  variant: 'onboarding' | 'settings'
  existingDataCounts: {
    keywords: number
    hasPushover: boolean
    hasSilently: boolean
    hasWebhook: boolean
  }
  /** Where to redirect after a successful import. */
  redirectTo?: string
}

type ParsedState = {
  parsed: ParsedEventryImport
  rawJson: string
  fileName: string
} | null

export function EventryImportForm({
  variant,
  existingDataCounts,
  redirectTo = '/dashboard/keywords',
}: EventryImportFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ParsedState>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    setParseError(null)
    if (file.size > MAX_FILE_SIZE) {
      setParseError(
        `Datei zu groß (${(file.size / 1024).toFixed(0)} KB, max 1024 KB)`,
      )
      resetFileInput()
      return
    }

    let text: string
    try {
      text = await file.text()
    } catch {
      setParseError('Datei konnte nicht gelesen werden.')
      resetFileInput()
      return
    }

    let rawData: unknown
    try {
      rawData = JSON.parse(text)
    } catch {
      setParseError('Datei ist kein valides JSON.')
      resetFileInput()
      return
    }

    try {
      const parsed = parseEventryExport(rawData)
      setState({ parsed, rawJson: text, fileName: file.name })
    } catch (err) {
      if (err instanceof EventryParseError) {
        setParseError(err.message)
      } else {
        setParseError(
          err instanceof Error ? err.message : 'Unbekannter Parse-Fehler',
        )
      }
      resetFileInput()
    }
  }

  const handleSuccess = (summary: ImportSummary) => {
    const parts: string[] = []
    if (summary.keywordsImported > 0) {
      parts.push(`${summary.keywordsImported} Keywords`)
    }
    if (summary.keywordsSkipped > 0) {
      parts.push(`${summary.keywordsSkipped} übersprungen`)
    }
    if (summary.autostartDisabledKeywordsImported > 0) {
      parts.push(
        `${summary.autostartDisabledKeywordsImported} Autostart-Blacklist`,
      )
    }
    const detail = parts.length > 0 ? ` (${parts.join(', ')})` : ''
    toast.success(`Import abgeschlossen${detail}`)

    for (const warning of summary.warnings) {
      toast.warning(warning)
    }

    setState(null)
    resetFileInput()
    router.push(redirectTo)
    router.refresh()
  }

  const handleCancel = () => {
    setState(null)
    setParseError(null)
    resetFileInput()
  }

  if (state) {
    return (
      <EventryImportPreview
        parsed={state.parsed}
        rawJson={state.rawJson}
        fileName={state.fileName}
        existingDataCounts={existingDataCounts}
        onCancel={handleCancel}
        onSuccess={handleSuccess}
      />
    )
  }

  const heading =
    variant === 'onboarding'
      ? 'Settings aus altem Eventry-Tool importieren'
      : 'Import aus altem Eventry-Tool'

  const description =
    variant === 'onboarding'
      ? 'Lade deine JSON-Export-Datei hoch, um Keywords, Pinger, Silently, Pushover und Webhook-Settings in Sekunden zu übernehmen.'
      : 'Lade deine JSON-Export-Datei hoch, um Keywords und Settings erneut zu übernehmen. Achtung: Deine aktuellen Daten werden komplett ersetzt.'

  return (
    <div className="space-y-4">
      <div className="bg-ev-secondary rounded-xl border border-ev-border-default p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center size-9 rounded-lg bg-ev-tertiary border border-ev-border-subtle shrink-0">
            <Upload className="size-4 text-ev-text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-ev-text-primary">
              {heading}
            </h3>
            <p className="text-xs text-ev-text-secondary mt-0.5">{description}</p>
          </div>
        </div>

        <label
          htmlFor={`eventry-file-${variant}`}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ev-border-default bg-ev-tertiary px-6 py-8 cursor-pointer transition-colors hover:border-ev-text-accent/50 hover:bg-ev-tertiary/70"
        >
          <FileJson className="size-8 text-ev-text-tertiary" />
          <div className="text-center space-y-0.5">
            <p className="text-sm font-medium text-ev-text-secondary">
              JSON-Datei auswählen
            </p>
            <p className="text-xs text-ev-text-tertiary">
              Max 1 MB • z.B. <span className="font-mono">eventry_settings_*.json</span>
            </p>
          </div>
        </label>
        <input
          id={`eventry-file-${variant}`}
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-red-300">{parseError}</div>
            <button
              onClick={() => setParseError(null)}
              className="text-red-400 hover:text-red-300 shrink-0"
              aria-label="Fehler schließen"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
