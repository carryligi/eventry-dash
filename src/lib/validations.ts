import { z } from 'zod'

// ── Keywords ──

const maxPriceField = z
  .union([z.coerce.number().positive('Preis muss positiv sein'), z.literal(''), z.nan()])
  .optional()
  .transform(v => (typeof v === 'number' && !isNaN(v) ? v : undefined))

const scopeNotEmpty = (data: { channel_ids?: string; category_ids?: string }, ctx: z.RefinementCtx) => {
  const hasChannels = !!data.channel_ids
    ?.split(',')
    .map(s => s.trim())
    .filter(Boolean).length
  const hasCats = !!data.category_ids
    ?.split(',')
    .map(s => s.trim())
    .filter(Boolean).length
  if (!hasChannels && !hasCats) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Mindestens ein Channel oder eine Kategorie auswaehlen',
      path: ['channel_ids'],
    })
  }
}

export const addKeywordsSchema = z
  .object({
    keywords: z.string().min(1, 'Mindestens ein Keyword eingeben'),
    internal_name: z.string().optional(),
    max_price: maxPriceField,
    channel_ids: z.string().optional(),
    category_ids: z.string().optional(),
  })
  .superRefine(scopeNotEmpty)

export type AddKeywordsInput = z.infer<typeof addKeywordsSchema>

export const updateKeywordSchema = z
  .object({
    id: z.string().min(1),
    keyword: z.string().min(1, 'Keyword darf nicht leer sein'),
    internal_name: z.string().optional(),
    max_price: maxPriceField,
    channel_ids: z.string().optional(),
    category_ids: z.string().optional(),
  })
  .superRefine(scopeNotEmpty)

export type UpdateKeywordInput = z.infer<typeof updateKeywordSchema>

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

// ── Profile ──

export const discordUserIdSchema = z.object({
  discord_user_id: z
    .string()
    .trim()
    .regex(/^[0-9]{17,20}$/, 'Muss eine 17-20 stellige Discord User ID sein')
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
    'Muss valides JSON mit einem "embeds" Array sein',
  ),
})
