'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Upload,
  FileJson,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { importBotData, type ImportResult } from '@/lib/actions/import'

interface FileEntry {
  key: string
  label: string
  description: string
  file: File | null
  parsedCount: number | null
  error: string | null
}

const FILE_CONFIGS = [
  {
    key: 'keywords',
    label: 'Keywords',
    description: 'keywords.json -- user keyword configurations',
  },
  {
    key: 'pinger_status',
    label: 'Pinger Status',
    description: 'pinger_status.json -- active/inactive status per user',
  },
  {
    key: 'cooldowns',
    label: 'Cooldowns',
    description: 'cooldowns.json -- cooldown durations',
  },
  {
    key: 'pushover_keys',
    label: 'Pushover Keys',
    description: 'pushover_keys.json -- Pushover user keys and priorities',
  },
  {
    key: 'silently_keys',
    label: 'Silently Keys',
    description: 'silently_keys.json -- Silently API keys',
  },
  {
    key: 'min_stock',
    label: 'Min Stock',
    description: 'min_stock.json -- minimum stock thresholds',
  },
  {
    key: 'autostart_schedule',
    label: 'Autostart Schedule',
    description: 'autostart_schedule.json -- start/end times',
  },
  {
    key: 'autostart_disabled_keywords',
    label: 'Disabled Keywords',
    description: 'autostart_disabled_keywords.json -- per-user disabled list',
  },
]

export default function ImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [files, setFiles] = useState<FileEntry[]>(
    FILE_CONFIGS.map((c) => ({
      ...c,
      file: null,
      parsedCount: null,
      error: null,
    }))
  )
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileRefs = useRef<(HTMLInputElement | null)[]>([])

  const handleFileChange = (index: number, file: File | null) => {
    setFiles((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], file, parsedCount: null, error: null }
      return updated
    })
  }

  const selectedCount = files.filter((f) => f.file !== null).length

  const handlePreview = async () => {
    // Parse all selected files to validate JSON and count entries
    const updatedFiles = await Promise.all(
      files.map(async (f) => {
        if (!f.file) return { ...f, parsedCount: null, error: null }
        try {
          const text = await f.file.text()
          const json = JSON.parse(text)
          const count =
            typeof json === 'object' && json !== null
              ? Object.keys(json).length
              : 0
          return { ...f, parsedCount: count, error: null }
        } catch {
          return { ...f, parsedCount: null, error: 'Invalid JSON' }
        }
      })
    )
    setFiles(updatedFiles)
    setStep(2)
  }

  const handleImport = async () => {
    setImporting(true)
    setImportError(null)

    try {
      const formData = new FormData()
      for (const f of files) {
        if (f.file) {
          formData.append(f.key, f.file)
        }
      }
      const res = await importBotData(formData)
      setResult(res)
      setStep(3)
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const hasErrors = files.some((f) => f.error !== null)

  return (
    <div className="p-6 space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Preview' },
          { num: 3, label: 'Result' },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center size-7 rounded-full text-xs font-semibold transition-all duration-300"
                style={{
                  backgroundColor:
                    step >= s.num
                      ? 'var(--bg-active)'
                      : 'var(--bg-tertiary)',
                  color:
                    step >= s.num
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                  border:
                    step === s.num
                      ? '1px solid var(--border-strong)'
                      : '1px solid var(--border-subtle)',
                }}
              >
                {step > s.num ? (
                  <Check className="size-3.5" />
                ) : (
                  s.num
                )}
              </div>
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    step >= s.num
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                }}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className="w-8 h-px"
                style={{
                  backgroundColor:
                    step > s.num
                      ? 'var(--border-strong)'
                      : 'var(--border-subtle)',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Upload
                className="size-4"
                style={{ color: 'var(--text-tertiary)' }}
              />
              <h3
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                Upload JSON Files
              </h3>
            </div>
            <span
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {selectedCount} of {FILE_CONFIGS.length} selected
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            {files.map((f, idx) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-4 px-4 py-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <FileJson
                      className="size-4 flex-shrink-0"
                      style={{
                        color: f.file
                          ? 'var(--success)'
                          : 'var(--text-tertiary)',
                      }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {f.label}
                    </span>
                    {f.file && (
                      <Badge variant="default" className="text-xs">
                        {f.file.name}
                      </Badge>
                    )}
                  </div>
                  <p
                    className="text-xs ml-6"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {f.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    ref={(el) => { fileRefs.current[idx] = el }}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) =>
                      handleFileChange(idx, e.target.files?.[0] ?? null)
                    }
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => fileRefs.current[idx]?.click()}
                    className="gap-1.5"
                  >
                    <Upload className="size-3.5" />
                    {f.file ? 'Change' : 'Browse'}
                  </Button>
                  {f.file && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleFileChange(idx, null)}
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              Select at least one file to continue. All files are optional.
            </p>
            <Button
              size="sm"
              disabled={selectedCount === 0}
              onClick={handlePreview}
              className="gap-1.5"
            >
              Preview
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {step === 2 && (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(192,192,192,0.08) 30%, rgba(192,192,192,0.08) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <FileJson
              className="size-4"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Preview Import
            </h3>
          </div>
          <div
            className="divide-y"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {files
              .filter((f) => f.file !== null)
              .map((f) => (
                <div
                  key={f.key}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    {f.error ? (
                      <AlertTriangle
                        className="size-4 flex-shrink-0"
                        style={{ color: 'var(--error)' }}
                      />
                    ) : (
                      <Check
                        className="size-4 flex-shrink-0"
                        style={{ color: 'var(--success)' }}
                      />
                    )}
                    <span
                      className="text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {f.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.error ? (
                      <span
                        className="text-xs"
                        style={{ color: 'var(--error)' }}
                      >
                        {f.error}
                      </span>
                    ) : (
                      <span
                        className="text-sm tabular-nums"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {f.parsedCount} entries
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>

          {importError && (
            <div
              className="mx-4 my-3 px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: 'rgba(248,113,113,0.08)',
                color: 'var(--error)',
              }}
            >
              {importError}
            </div>
          )}

          <div className="px-4 py-3 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setStep(1)}
              className="gap-1.5"
            >
              <ChevronLeft className="size-3.5" />
              Back
            </Button>
            <Button
              size="sm"
              disabled={hasErrors || importing}
              onClick={handleImport}
              className="gap-1.5"
            >
              {importing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="size-3.5" />
                  Import Data
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && result && (
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, var(--success) 30%, var(--success) 70%, transparent 100%)',
            }}
          />
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <Check className="size-4" style={{ color: 'var(--success)' }} />
            <h3
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Import Complete
            </h3>
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Profiles', value: result.profiles },
              { label: 'Keywords', value: result.keywords },
              { label: 'Pinger Settings', value: result.pingerSettings },
              { label: 'Pushover Settings', value: result.pushoverSettings },
              { label: 'Silently Settings', value: result.silentlySettings },
              { label: 'Disabled Keywords', value: result.autostartDisabled },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p
                  className="text-xs font-medium uppercase tracking-widest mb-1"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {item.label}
                </p>
                <p
                  className="text-xl font-semibold tabular-nums"
                  style={{
                    color:
                      item.value > 0
                        ? 'var(--text-primary)'
                        : 'var(--text-tertiary)',
                  }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 flex items-center justify-end">
            <Button
              size="sm"
              onClick={() => {
                setStep(1)
                setResult(null)
                setFiles(
                  FILE_CONFIGS.map((c) => ({
                    ...c,
                    file: null,
                    parsedCount: null,
                    error: null,
                  }))
                )
              }}
              className="gap-1.5"
            >
              Import More
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
