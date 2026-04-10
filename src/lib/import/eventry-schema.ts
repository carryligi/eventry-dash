import { z } from 'zod'

// ── Zod schema for the raw JSON export produced by the legacy Eventry Python tool ──
// This matches the shape seen in the real example file:
// eventry_settings_<discord_id>.json
//
// Unknown top-level fields are passed through (forward-compat).
// ALL fields are optional — missing or invalid values fall back to defaults
// and are surfaced as `ImportIssue`s in the parser. This lets partial exports
// (no webhook, no schedule, no Discord ID, etc.) still import cleanly.

export const RawEventryKeywordSchema = z
  .object({
    id: z.string().optional(),
    keyword: z.string().optional(),
    category_id: z.string().optional(),
    channel_ids: z.array(z.string()).optional(),
    internal_name: z.string().optional(),
  })
  .passthrough()

export const RawEventryExportSchema = z
  .object({
    meta: z
      .object({
        exported_at: z.string().optional(),
        exported_by_discord_id: z.string().optional(),
        exported_by_username: z.string().optional(),
        format_version: z.string().optional(),
      })
      .passthrough()
      .optional(),
    discord_user_id: z.string().trim().optional(),
    pinger_status: z.boolean().optional(),
    keywords: z.array(RawEventryKeywordSchema).optional(),
    cooldown: z
      .object({
        duration_minutes: z.number().int().optional(),
        active: z.unknown().optional(),
      })
      .passthrough()
      .optional(),
    pushover: z
      .object({
        key: z.string().optional(),
        priority: z.number().optional(),
      })
      .passthrough()
      .optional(),
    silently: z
      .object({
        key: z.string().optional(),
        active: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    min_stock: z.number().int().optional(),
    autostart_schedule: z
      .object({
        start: z.string().optional(),
        end: z.string().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    autostart_disabled_keywords: z.array(z.string()).optional(),
    autostart_max_prices: z.record(z.string(), z.number()).optional(),
    autostart_webhook: z.string().nullable().optional(),
  })
  .passthrough()

export type RawEventryExport = z.infer<typeof RawEventryExportSchema>
