import { z } from 'zod'

// ── Zod schema for the raw JSON export produced by the legacy Eventry Python tool ──
// This matches the shape seen in the real example file:
// eventry_settings_<discord_id>.json
//
// Unknown top-level fields are passed through (forward-compat).
// Soft fields (missing/invalid) fall back to defaults; only `discord_user_id`
// is a hard requirement.

export const RawEventryKeywordSchema = z
  .object({
    id: z.string().optional(),
    keyword: z.string().min(1),
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
    discord_user_id: z
      .string()
      .trim()
      .regex(/^[0-9]{17,20}$/, 'discord_user_id must be a 17-20 digit Snowflake'),
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
        start: z.string(),
        end: z.string(),
      })
      .nullable()
      .optional(),
    autostart_disabled_keywords: z.array(z.string()).optional(),
    autostart_max_prices: z.record(z.string(), z.number()).optional(),
    autostart_webhook: z.string().optional(),
  })
  .passthrough()

export type RawEventryExport = z.infer<typeof RawEventryExportSchema>
