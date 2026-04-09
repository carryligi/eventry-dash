// ── Pure parser for the legacy Eventry JSON export ──
//
// Consumes `unknown` (the raw JSON.parsed file contents), validates shape
// with Zod, then normalizes into `ParsedEventryImport`.
//
// Rules:
// - `discord_user_id` is the only HARD required field — missing/invalid
//   throws `EventryParseError`.
// - All other fields fall back to safe defaults and emit `ImportIssue`s.
// - Pure: no Supabase, no I/O — safe to run in client and server.

import {
  RawEventryExportSchema,
  type RawEventryExport,
} from './eventry-schema'
import {
  EventryParseError,
  type ImportIssue,
  type ParsedEventryImport,
  type ParsedEventryKeyword,
} from './eventry-types'

const DISCORD_WEBHOOK_PREFIXES = [
  'https://discord.com/api/webhooks/',
  'https://discordapp.com/api/webhooks/',
]

/** Converts the legacy `"HH.MM"` schedule format into the DB's `"HH:MM"` format.
 *  Returns null if the input is not a valid 24h time. */
function normalizeScheduleTime(raw: string): string | null {
  // Accept both "14.30" (legacy dot format) and "14:30" (already normalized)
  const normalized = raw.replace('.', ':').trim()
  if (!/^\d{1,2}:\d{2}$/.test(normalized)) return null
  const [hStr, mStr] = normalized.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null
  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function isDiscordWebhook(url: string): boolean {
  return DISCORD_WEBHOOK_PREFIXES.some((p) => url.startsWith(p))
}

export function parseEventryExport(raw: unknown): ParsedEventryImport {
  // Step 1: shape validation
  const parseResult = RawEventryExportSchema.safeParse(raw)
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0]
    const path = firstIssue.path.join('.') || '(root)'
    throw new EventryParseError(
      `Ungültiges Eventry-JSON (${path}): ${firstIssue.message}`,
      JSON.stringify(parseResult.error.issues, null, 2),
    )
  }

  const data: RawEventryExport = parseResult.data
  const issues: ImportIssue[] = []

  // Step 2: meta
  const meta = {
    exportedAt: data.meta?.exported_at ?? null,
    exportedByUsername: data.meta?.exported_by_username ?? null,
    formatVersion: data.meta?.format_version ?? null,
  }

  // Step 3: pinger
  const pinger = {
    isActive: data.pinger_status ?? true,
    cooldownMinutes: clamp(
      Math.round(data.cooldown?.duration_minutes ?? 0),
      0,
      1440,
    ),
  }

  // Step 4: pushover
  let pushover: ParsedEventryImport['pushover'] = null
  if (data.pushover && data.pushover.key) {
    const rawPriority = data.pushover.priority ?? 0
    let priority: 0 | 1 | 2 = 0
    if (rawPriority === 0 || rawPriority === 1 || rawPriority === 2) {
      priority = rawPriority
    } else {
      priority = clamp(Math.round(rawPriority), 0, 2) as 0 | 1 | 2
      issues.push({
        kind: 'invalid_priority',
        message: `Pushover-Priorität "${rawPriority}" ist ungültig, wurde auf ${priority} geclampt.`,
      })
    }
    pushover = { userKey: data.pushover.key, priority }
  }

  // Step 5: silently (merged with min_stock + autostart_schedule)
  let silently: ParsedEventryImport['silently'] = null
  if (data.silently && data.silently.key) {
    let scheduleStart: string | null = null
    let scheduleEnd: string | null = null
    if (data.autostart_schedule) {
      scheduleStart = normalizeScheduleTime(data.autostart_schedule.start)
      scheduleEnd = normalizeScheduleTime(data.autostart_schedule.end)
      if (data.autostart_schedule.start && !scheduleStart) {
        issues.push({
          kind: 'invalid_schedule',
          message: `Schedule-Start "${data.autostart_schedule.start}" ist kein gültiges HH:MM-Format.`,
        })
      }
      if (data.autostart_schedule.end && !scheduleEnd) {
        issues.push({
          kind: 'invalid_schedule',
          message: `Schedule-Ende "${data.autostart_schedule.end}" ist kein gültiges HH:MM-Format.`,
        })
      }
    }

    silently = {
      userKey: data.silently.key,
      isActive: data.silently.active ?? true,
      minStock: Math.max(0, Math.round(data.min_stock ?? 0)),
      scheduleStart,
      scheduleEnd,
    }
  }

  // Step 6: webhook
  let webhook: ParsedEventryImport['webhook'] = null
  if (data.autostart_webhook) {
    if (isDiscordWebhook(data.autostart_webhook)) {
      webhook = { webhookUrl: data.autostart_webhook }
    } else {
      issues.push({
        kind: 'invalid_webhook',
        message: `Webhook-URL "${data.autostart_webhook.slice(0, 50)}…" ist keine gültige Discord-Webhook-URL — wird nicht importiert.`,
      })
    }
  }

  // Step 7: keywords — dedup + max_price lookup + scope detection
  const rawKeywords = data.keywords ?? []
  const maxPrices = data.autostart_max_prices ?? {}
  const dedupeKey = (kw: ParsedEventryKeyword) =>
    `${kw.keyword}|${(kw.channelIds ?? []).join(',')}|${(kw.categoryIds ?? []).join(',')}`
  const seen = new Set<string>()
  const keywords: ParsedEventryKeyword[] = []
  let duplicatesDropped = 0

  for (let idx = 0; idx < rawKeywords.length; idx++) {
    const rawKw = rawKeywords[idx]
    const keywordText = (rawKw.keyword ?? '').trim().toLowerCase()
    if (!keywordText) {
      issues.push({
        kind: 'missing_keyword_text',
        message: `Keyword an Position ${idx + 1} hat keinen Text und wird übersprungen.`,
      })
      continue
    }

    const channelIds =
      Array.isArray(rawKw.channel_ids) && rawKw.channel_ids.length > 0
        ? rawKw.channel_ids.map((c) => c.trim()).filter(Boolean)
        : null
    const categoryIds =
      typeof rawKw.category_id === 'string' && rawKw.category_id.trim()
        ? [rawKw.category_id.trim()]
        : null

    const legacyId = typeof rawKw.id === 'string' && rawKw.id
      ? rawKw.id
      : `__no-id-${idx}`

    // autostart_max_prices lookup by legacy id
    let maxPrice: number | null = null
    const rawPrice = maxPrices[legacyId]
    if (typeof rawPrice === 'number' && rawPrice > 0) {
      maxPrice = rawPrice
    }

    const needsScope = !channelIds?.length && !categoryIds?.length

    const normalizedKw: ParsedEventryKeyword = {
      legacyId,
      keyword: keywordText,
      internalName:
        typeof rawKw.internal_name === 'string' && rawKw.internal_name.trim()
          ? rawKw.internal_name.trim()
          : null,
      channelIds: channelIds && channelIds.length > 0 ? channelIds : null,
      categoryIds,
      maxPrice,
      needsScope,
    }

    const key = dedupeKey(normalizedKw)
    if (seen.has(key)) {
      duplicatesDropped++
      continue
    }
    seen.add(key)
    keywords.push(normalizedKw)

    if (needsScope) {
      issues.push({
        kind: 'scopeless_keyword',
        message: `Keyword "${normalizedKw.keyword}" hat keinen Channel und keine Category — Scope erforderlich.`,
        legacyId: normalizedKw.legacyId,
      })
    }
  }

  if (duplicatesDropped > 0) {
    issues.push({
      kind: 'duplicate_keyword',
      message: `${duplicatesDropped} doppelte Keyword-Einträge wurden entfernt.`,
    })
  }

  // Warn about unmapped max_prices (legacyIds that don't match any keyword)
  const legacyIds = new Set(keywords.map((k) => k.legacyId))
  const unmappedPrices = Object.keys(maxPrices).filter((id) => !legacyIds.has(id))
  if (unmappedPrices.length > 0) {
    issues.push({
      kind: 'unmapped_max_price',
      message: `${unmappedPrices.length} Max-Price-Einträge konnten keinem Keyword zugeordnet werden.`,
    })
  }

  // Step 8: autostart_disabled_keywords — dedup + lowercase
  const disabledKeywords = Array.from(
    new Set(
      (data.autostart_disabled_keywords ?? [])
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
    ),
  )

  return {
    meta,
    discordUserId: data.discord_user_id,
    pinger,
    pushover,
    silently,
    webhook,
    keywords,
    autostartDisabledKeywords: disabledKeywords,
    issues,
  }
}
