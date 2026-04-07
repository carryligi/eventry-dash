import { z } from 'zod'

// ── Keywords ──

export const addKeywordsSchema = z.object({
  keywords: z
    .string()
    .min(1, 'Mindestens ein Keyword eingeben'),
  restriction_type: z.enum(['global', 'channels', 'category']).default('global'),
  internal_name: z.string().optional(),
  max_price: z
    .union([z.coerce.number().positive('Preis muss positiv sein'), z.literal(''), z.nan()])
    .optional()
    .transform(v => (typeof v === 'number' && !isNaN(v) ? v : undefined)),
  channel_ids: z.string().optional(),
  category_id: z.string().optional(),
})

export type AddKeywordsInput = z.infer<typeof addKeywordsSchema>

// ── Pinger ──

export const cooldownSchema = z.object({
  cooldown_minutes: z.coerce.number().int().min(0, 'Cooldown darf nicht negativ sein').max(1440, 'Max 24 Stunden'),
})

// ── Pushover ──

export const pushoverKeySchema = z.object({
  user_key: z.string().min(1, 'Pushover Key ist erforderlich').max(100),
  priority: z.coerce.number().int().min(0).max(2).default(0),
})

// ── Webhook ──

export const webhookUrlSchema = z.object({
  webhook_url: z
    .string()
    .url('Ungueltige URL')
    .refine(
      url =>
        url.startsWith('https://discord.com/api/webhooks/') ||
        url.startsWith('https://discordapp.com/api/webhooks/'),
      'Muss eine gueltige Discord Webhook URL sein',
    ),
})

// ── Silently ──

export const silentlyKeySchema = z.object({
  user_key: z.string().min(1, 'Silently Key ist erforderlich'),
})

export const minStockSchema = z.object({
  min_stock: z.coerce.number().int().min(0, 'Min Stock darf nicht negativ sein'),
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

// ── Admin ──

export const appSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})
