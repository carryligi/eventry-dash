// ── Types for the Eventry JSON import pipeline ──
//
// Parser output (pure, DB-agnostic) used by both the client preview and
// the server-side commit action.

export interface ParsedEventryKeyword {
  /** Legacy UUID from the source file — used to match autostart_max_prices.
   *  Never written to the DB. */
  legacyId: string
  keyword: string
  internalName: string | null
  channelIds: string[] | null
  categoryIds: string[] | null
  maxPrice: number | null
  /** True when both channelIds and categoryIds are null. The new schema
   *  requires at least one scope, so these keywords need to be resolved
   *  by the user in the preview step. */
  needsScope: boolean
}

export interface ParsedEventryImport {
  meta: {
    exportedAt: string | null
    exportedByUsername: string | null
    formatVersion: string | null
  }
  discordUserId: string
  pinger: {
    isActive: boolean
    cooldownMinutes: number
  }
  pushover: {
    userKey: string
    priority: 0 | 1 | 2
  } | null
  silently: {
    userKey: string
    isActive: boolean
    minStock: number
    scheduleStart: string | null
    scheduleEnd: string | null
  } | null
  webhook: {
    webhookUrl: string
  } | null
  keywords: ParsedEventryKeyword[]
  autostartDisabledKeywords: string[]
  issues: ImportIssue[]
}

export type ImportIssueKind =
  | 'scopeless_keyword'
  | 'invalid_webhook'
  | 'invalid_priority'
  | 'invalid_schedule'
  | 'duplicate_keyword'
  | 'unmapped_max_price'
  | 'missing_keyword_text'

export interface ImportIssue {
  kind: ImportIssueKind
  message: string
  legacyId?: string
}

export class EventryParseError extends Error {
  readonly details: string
  constructor(message: string, details?: string) {
    super(message)
    this.name = 'EventryParseError'
    this.details = details ?? ''
  }
}

// ── Server action input/output ──

export interface ScopeOverride {
  channelIds?: string[]
  categoryIds?: string[]
  skip?: boolean
}

export interface CommitEventryImportInput {
  rawJson: string
  /** Keyed by the parser's `legacyId`. Each override resolves a scopeless keyword. */
  scopeOverrides: Record<string, ScopeOverride>
}

export interface ImportSummary {
  discordUserId: string
  keywordsImported: number
  keywordsSkipped: number
  pingerUpdated: boolean
  pushoverUpdated: boolean
  pushoverRemoved: boolean
  silentlyUpdated: boolean
  silentlyRemoved: boolean
  webhookUpdated: boolean
  webhookRemoved: boolean
  autostartDisabledKeywordsImported: number
  warnings: string[]
}
