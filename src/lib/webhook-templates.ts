/**
 * Shared webhook payload templates.
 *
 * Both the Dashboard test webhook and the Python bot render these JSON
 * templates with mustache-style `{{variable}}` substitution before POSTing to
 * Discord. Admins edit them via /dashboard/admin/webhooks.
 *
 * Substitution is string-based and happens BEFORE JSON.parse, so:
 *  - String values must be quoted: `"value": "{{keyword}}"`
 *  - Numeric values unquoted:      `"color": {{color}}`
 *  - All string vars are JSON-escaped via `jsonEscape()` to prevent broken JSON
 *    when product titles or keywords contain `"`, `\`, newlines, etc.
 */

// ─── Defaults (match the current hardcoded bot payloads 1:1) ─────────────────

export const DEFAULT_USER_WEBHOOK_TEMPLATE = `{
  "username": "Eventry",
  "embeds": [
    {
      "title": "\u{1F680} Autostart Triggered",
      "color": 11382189,
      "timestamp": "{{timestamp_iso}}",
      "fields": [
        { "name": "Keyword",      "value": "\`{{keyword}}\`",                              "inline": true  },
        { "name": "Status",       "value": "{{status_emoji}} {{status}}",                  "inline": true  },
        { "name": "Product",      "value": "{{product_title}}",                            "inline": false },
        { "name": "Price Breaks", "value": "{{price_info}}",                               "inline": true  },
        { "name": "Stock",        "value": "{{stock_info}}",                               "inline": true  },
        { "name": "Product Link", "value": "{{product_link}}",                             "inline": false },
        { "name": "Message",      "value": "[Jump to original message]({{message_jump_url}})", "inline": false }
      ],
      "footer": { "text": "Eventry Autostart \u2022 {{timestamp_cest}}" }
    }
  ]
}`

export const DEFAULT_ADMIN_WEBHOOK_TEMPLATE = `{
  "username": "Eventry Admin Log",
  "embeds": [
    {
      "title": "\u{1F514} Autostart Triggered",
      "color": {{color}},
      "timestamp": "{{timestamp_iso}}",
      "fields": [
        { "name": "User",          "value": "{{user_display}}",                               "inline": false },
        { "name": "Keyword",       "value": "\`{{keyword}}\`",                                "inline": true  },
        { "name": "Status",        "value": "{{status_emoji}} {{status}}",                    "inline": true  },
        { "name": "Channel",       "value": "#{{channel_name}}",                              "inline": true  },
        { "name": "Product",       "value": "{{product_title}}",                              "inline": false },
        { "name": "Price Breaks",  "value": "{{price_info}}",                                 "inline": true  },
        { "name": "Stock",         "value": "{{stock_info}}",                                 "inline": true  },
        { "name": "Product Link",  "value": "{{product_link}}",                               "inline": false },
        { "name": "Source Message","value": "[Jump to original]({{message_jump_url}})",       "inline": false }
      ],
      "footer": { "text": "Eventry Admin Log \u2022 {{timestamp_cest}}" }
    }
  ]
}`

// ─── Variable catalogs (shown in the editor UI) ──────────────────────────────

export interface TemplateVariable {
  name: string
  description: string
}

export const USER_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'keyword',           description: 'Matched keyword text' },
  { name: 'status',            description: '"200 OK" or "500 Failed"' },
  { name: 'status_emoji',      description: '✅ or ❌' },
  { name: 'http_status',       description: 'Raw HTTP status code (number as string)' },
  { name: 'product_title',     description: 'Product title from Silently embed' },
  { name: 'product_description', description: 'Product description from embed' },
  { name: 'price_info',        description: 'Price breaks string' },
  { name: 'stock_info',        description: 'Stock string' },
  { name: 'product_link',      description: 'Decoded product URL (or —)' },
  { name: 'message_jump_url',  description: 'Discord jump URL of the source message' },
  { name: 'timestamp_iso',     description: 'ISO-8601 UTC timestamp' },
  { name: 'timestamp_cest',    description: 'DD.MM.YYYY HH:MM:SS CEST' },
]

export const ADMIN_TEMPLATE_VARIABLES: TemplateVariable[] = [
  ...USER_TEMPLATE_VARIABLES,
  { name: 'user_display',  description: '@mention · `username` · `whop_user_id`' },
  { name: 'user_mention',  description: '<@discord_id> or empty' },
  { name: 'username',      description: 'Whop username' },
  { name: 'whop_user_id',  description: 'Whop user ID' },
  { name: 'channel_name',  description: 'Discord channel name' },
  { name: 'color',         description: 'Discord decimal color (4906624=green / 16287345=red)' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * JSON-escape a string so it can safely be inserted as a template variable
 * INSIDE a JSON string context (e.g. `"value": "{{keyword}}"`).
 *
 * `JSON.stringify(s).slice(1, -1)` handles \", \\, \n, \t, \r and control
 * characters exactly the way JSON.parse will accept them.
 */
export function jsonEscape(s: string): string {
  return JSON.stringify(s).slice(1, -1)
}

/**
 * Substitute all {{name}} tokens in `template` with the matching value in
 * `vars`, then JSON.parse the result. Missing variables are replaced with an
 * empty string. Returns `null` on parse errors so callers can fall back.
 *
 * String vars should already be jsonEscape()'d by the caller; numeric vars
 * can be passed as numbers and will be inserted without quotes.
 */
export function renderWebhookTemplate(
  template: string,
  vars: Record<string, string | number>,
): Record<string, unknown> | null {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const v = vars[name]
    if (v === undefined || v === null) return ''
    return String(v)
  })
  try {
    const parsed = JSON.parse(rendered)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    return parsed as Record<string, unknown>
  } catch {
    return null
  }
}

/**
 * Build the standard vars dict for a USER webhook render. All string inputs
 * are JSON-escaped automatically.
 */
export function buildUserWebhookVars(input: {
  keyword: string
  http_status: number
  product_title: string
  product_description: string
  price_info: string
  stock_info: string
  product_link: string
  message_jump_url: string
}): Record<string, string | number> {
  const now = new Date()
  const cest = formatCest(now)
  const ok = input.http_status === 200
  return {
    keyword:             jsonEscape(input.keyword),
    status:              jsonEscape(`${input.http_status} ${ok ? 'OK' : 'Failed'}`),
    status_emoji:        ok ? '\u2705' : '\u274C',
    http_status:         String(input.http_status),
    product_title:       jsonEscape(input.product_title.slice(0, 256)),
    product_description: jsonEscape(input.product_description),
    price_info:          jsonEscape(input.price_info.slice(0, 256)),
    stock_info:          jsonEscape(input.stock_info.slice(0, 64)),
    product_link:        jsonEscape(input.product_link),
    message_jump_url:    jsonEscape(input.message_jump_url),
    timestamp_iso:       now.toISOString(),
    timestamp_cest:      jsonEscape(cest),
  }
}

/**
 * Build the standard vars dict for an ADMIN LOG webhook render. All string
 * inputs are JSON-escaped automatically; `color` is numeric.
 */
export function buildAdminWebhookVars(input: {
  keyword: string
  http_status: number
  product_title: string
  product_description?: string
  price_info: string
  stock_info: string
  product_link: string
  message_jump_url: string
  user_mention: string
  username: string
  whop_user_id: string
  channel_name: string
}): Record<string, string | number> {
  const base = buildUserWebhookVars({
    keyword: input.keyword,
    http_status: input.http_status,
    product_title: input.product_title,
    product_description: input.product_description ?? '',
    price_info: input.price_info,
    stock_info: input.stock_info,
    product_link: input.product_link,
    message_jump_url: input.message_jump_url,
  })
  const ok = input.http_status === 200
  const userDisplayParts: string[] = []
  if (input.user_mention) userDisplayParts.push(input.user_mention)
  if (input.username) userDisplayParts.push('`' + input.username + '`')
  userDisplayParts.push('`' + input.whop_user_id + '`')
  return {
    ...base,
    user_display: jsonEscape(userDisplayParts.join(' \u00B7 ')),
    user_mention: jsonEscape(input.user_mention),
    username:     jsonEscape(input.username),
    whop_user_id: jsonEscape(input.whop_user_id),
    channel_name: jsonEscape(input.channel_name || '—'),
    color:        ok ? 4906624 : 16287345, // green / red
  }
}

// ─── Sample data for the "Send Test" button ──────────────────────────────────

export const SAMPLE_USER_INPUT = {
  keyword: 'test-keyword',
  http_status: 200,
  product_title: 'Test Product — Webhook Verification',
  product_description: 'Sample description for the test webhook',
  price_info: '85.00: 9, 95.00: 6',
  stock_info: '15',
  product_link: 'https://example.com/product/test',
  message_jump_url: 'https://discord.com',
}

export const SAMPLE_ADMIN_INPUT = {
  ...SAMPLE_USER_INPUT,
  user_mention: '<@123456789012345678>',
  username: 'test_user',
  whop_user_id: 'user_abc123',
  channel_name: 'test-channel',
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function formatCest(d: Date): string {
  // DD.MM.YYYY HH:MM:SS CEST  (matches Python bot format)
  const parts = new Intl.DateTimeFormat('de-DE', {
    timeZone: 'Europe/Berlin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}:${get('second')} CEST`
}
