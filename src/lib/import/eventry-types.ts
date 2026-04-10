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
  /** Both channelIds and categoryIds being null means the keyword is
   *  **global** — it matches in every channel the bot listens in. */
  channelIds: string[] | null
  categoryIds: string[] | null
  maxPrice: number | null
}

export interface ParsedEventryImport {
  meta: {
    exportedAt: string | null
    exportedByUsername: string | null
    formatVersion: string | null
  }
  discordUserId: string | null
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
  | 'invalid_webhook'
  | 'invalid_priority'
  | 'invalid_schedule'
  | 'duplicate_keyword'
  | 'unmapped_max_price'
  | 'missing_keyword_text'
  | 'missing_discord_id'
  | 'invalid_discord_id'

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

export interface CommitEventryImportInput {
  rawJson: string
}

export interface ImportSummary {
  discordUserId: string | null
  keywordsImported: number
  keywordsGlobal: number
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
