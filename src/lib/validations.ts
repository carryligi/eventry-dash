import { z } from 'zod'

// ── Keywords ──
//
// A keyword with neither channel_ids nor category_ids is a **global**
// keyword — it matches in every channel the bot listens in. This mirrors
// the behaviour of the old Python Eventry bot.

const maxPriceField = z
  .union([z.coerce.number().positive('Price must be positive'), z.literal(''), z.nan()])
  .optional()
  .transform(v => (typeof v === 'number' && !isNaN(v) ? v : undefined))

// NULL / empty / undefined → undefined (= DB NULL, use global fallback).
// Anything else → coerced integer >= 0.
const minStockField = z
  .union([z.coerce.number().int().min(0, 'Min stock cannot be negative'), z.literal(''), z.nan()])
  .optional()
  .transform(v => (typeof v === 'number' && !isNaN(v) ? v : undefined))

export const addKeywordsSchema = z.object({
  keywords: z.string().min(1, 'Enter at least one keyword'),
  internal_name: z.string().optional(),
  max_price: maxPriceField,
  min_stock: minStockField,
  channel_ids: z.string().optional(),
  category_ids: z.string().optional(),
})

export type AddKeywordsInput = z.infer<typeof addKeywordsSchema>

export const updateKeywordSchema = z.object({
  id: z.string().min(1),
  keyword: z.string().min(1, 'Keyword cannot be empty'),
  internal_name: z.string().optional(),
  max_price: maxPriceField,
  min_stock: minStockField,
  channel_ids: z.string().optional(),
  category_ids: z.string().optional(),
})

export type UpdateKeywordInput = z.infer<typeof updateKeywordSchema>

// ── Pinger ──

export const cooldownSchema = z.object({
  cooldown_minutes: z.coerce.number().int().min(0, 'Cooldown cannot be negative').max(1440, 'Max 24 hours'),
})

// ── Pushover ──

export const pushoverKeySchema = z.object({
  user_key: z.string().min(1, 'Pushover key is required').max(100),
  priority: z.coerce.number().int().min(0).max(2).default(0),
})

// ── Webhook ──

export const webhookUrlSchema = z.object({
  webhook_url: z
    .string()
    .url('Invalid URL')
    .refine(
      url =>
        url.startsWith('https://discord.com/api/webhooks/') ||
        url.startsWith('https://discordapp.com/api/webhooks/'),
      'Must be a valid Discord webhook URL',
    ),
})

// ── Silently ──

export const silentlyKeySchema = z.object({
  user_key: z.string().min(1, 'Silently key is required'),
})

export const minStockSchema = z.object({
  min_stock: z.coerce.number().int().min(0, 'Min stock cannot be negative'),
})

export const scheduleSchema = z.object({
  schedule_start: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format: HH:MM')
    .nullable(),
  schedule_end: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format: HH:MM')
    .nullable(),
})

// ── Profile ──

export const discordUserIdSchema = z.object({
  discord_user_id: z
    .string()
    .trim()
    .regex(/^[0-9]{17,20}$/, 'Must be a 17-20 digit Discord User ID')
    .or(z.literal('')),
})

// ── Admin ──

export const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export const WEBHOOK_TEMPLATE_KEYS = [
  'webhook_user_payload_template',
  'webhook_admin_payload_template',
] as const
export type WebhookTemplateKey = (typeof WEBHOOK_TEMPLATE_KEYS)[number]

/**
 * app_settings keys that store the Discord webhook URL tied to each template.
 * - webhook_user_test_url   → URL used by the admin "Send Test" button for the
 *                             user-payload template. Separate from per-user
 *                             webhook_settings.webhook_url.
 * - autostart_log_webhook_url → already existed; target for the aggregated
 *                               admin log webhook sent by the bot.
 */
export const WEBHOOK_URL_SETTING_KEYS = [
  'webhook_user_test_url',
  'autostart_log_webhook_url',
] as const
export type WebhookUrlSettingKey = (typeof WEBHOOK_URL_SETTING_KEYS)[number]

export const webhookTemplateSchema = z.object({
  key: z.enum(WEBHOOK_TEMPLATE_KEYS),
  value: z.string().refine(
    s => {
      try {
        const p = JSON.parse(s)
        return (
          typeof p === 'object' &&
          p !== null &&
          !Array.isArray(p) &&
          Array.isArray((p as { embeds?: unknown }).embeds)
        )
      } catch {
        return false
      }
    },
    'Must be valid JSON with an "embeds" array',
  ),
})
