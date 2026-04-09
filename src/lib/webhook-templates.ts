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
        { "name": "Product",        "value": "{{product_title}}",                            "inline": false },
        { "name": "Product Link",   "value": "{{product_link}}",                             "inline": false },
        { "name": "Status",         "value": "{{status_emoji}} {{status_summary}}",          "inline": true  },
        { "name": "Channel",        "value": "#{{channel_name}}",                            "inline": true  },
        { "name": "Source Message", "value": "[Jump to original]({{message_jump_url}})",     "inline": false },
        { "name": "Users ({{user_count}})", "value": "{{user_list}}",                        "inline": false }
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

/**
 * Admin log webhook is AGGREGATED — ONE webhook per quicktask event,
 * containing every user who was triggered. Variables are event-level only.
 */
export const ADMIN_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { name: 'product_title',    description: 'Product title from Silently embed' },
  { name: 'product_link',     description: 'Decoded product URL (or —)' },
  { name: 'channel_name',     description: 'Discord channel name' },
  { name: 'message_jump_url', description: 'Discord jump URL of the source message' },
  { name: 'user_list',        description: 'Multiline list: <@discord_id> · `silently_key` · `keyword` · status' },
  { name: 'user_count',       description: 'Total number of users triggered' },
  { name: 'success_count',    description: 'Users with http_status == 200' },
  { name: 'failure_count',    description: 'Users with failure status' },
  { name: 'status_summary',   description: 'e.g. "5 OK / 2 Failed"' },
  { name: 'status_emoji',     description: '✅ all OK / ⚠️ mixed / ❌ all failed' },
  { name: 'color',            description: 'Decimal color (green / amber / red)' },
  { name: 'timestamp_iso',    description: 'ISO-8601 UTC timestamp' },
  { name: 'timestamp_cest',   description: 'DD.MM.YYYY HH:MM:SS CEST' },
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

export interface AdminLogUserResult {
  discord_user_id: string | null
  whop_user_id: string
  silently_key: string
  keyword: string
  http_status: number
}

/**
 * Build the vars dict for the aggregated admin log webhook render.
 *
 * Unlike user webhooks (one per user), the admin log fires ONCE per autostart
 * event and lists every participating user inline. Vars are event-level.
 */
export function buildAdminWebhookVars(input: {
  product_title: string
  product_link: string
  channel_name: string
  message_jump_url: string
  results: AdminLogUserResult[]
}): Record<string, string | number> {
  const now = new Date()
  const cest = formatCest(now)
  const { results } = input

  const userCount = results.length
  const successCount = results.filter(r => r.http_status === 200).length
  const failureCount = userCount - successCount

  let statusEmoji: string
  let color: number
  if (userCount === 0) {
    statusEmoji = '\u2753' // ❓
    color = 8421504 // gray
  } else if (failureCount === 0) {
    statusEmoji = '\u2705' // ✅
    color = 4906624 // green
  } else if (successCount === 0) {
    statusEmoji = '\u274C' // ❌
    color = 16287345 // red
  } else {
    statusEmoji = '\u26A0\uFE0F' // ⚠️
    color = 16753920 // amber
  }
  const statusSummary = `${successCount} OK / ${failureCount} Failed`

  // Build user_list lines: <@discord> · `silently_key` · `keyword` · status
  const lines = results.map(r => {
    const mention = r.discord_user_id ? `<@${r.discord_user_id}>` : '`' + r.whop_user_id + '`'
    const ok = r.http_status === 200
    const lineStatus = ok ? `\u2705 ${r.http_status} OK` : `\u274C ${r.http_status} Failed`
    return `${mention} \u00B7 \`${r.silently_key || '—'}\` \u00B7 \`${r.keyword || '—'}\` \u00B7 ${lineStatus}`
  })
  let userList = lines.join('\n')
  if (userList.length > 1000) {
    const truncated: string[] = []
    let running = 0
    for (const ln of lines) {
      if (running + ln.length + 1 > 950) break
      truncated.push(ln)
      running += ln.length + 1
    }
    truncated.push(`\u2026 and ${userCount - truncated.length} more`)
    userList = truncated.join('\n')
  }

  return {
    product_title:    jsonEscape(input.product_title.slice(0, 256)),
    product_link:     jsonEscape(input.product_link),
    channel_name:     jsonEscape(input.channel_name || '—'),
    message_jump_url: jsonEscape(input.message_jump_url),
    user_list:        jsonEscape(userList),
    user_count:       String(userCount),
    success_count:    String(successCount),
    failure_count:    String(failureCount),
    status_summary:   jsonEscape(statusSummary),
    status_emoji:     statusEmoji,
    color,
    timestamp_iso:    now.toISOString(),
    timestamp_cest:   jsonEscape(cest),
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

export const SAMPLE_ADMIN_INPUT: {
  product_title: string
  product_link: string
  channel_name: string
  message_jump_url: string
  results: AdminLogUserResult[]
} = {
  product_title: 'Test Product — Webhook Verification',
  product_link: 'https://example.com/product/test',
  channel_name: 'test-channel',
  message_jump_url: 'https://discord.com',
  results: [
    {
      discord_user_id: '123456789012345678',
      whop_user_id: 'user_abc123',
      silently_key: 'silently_key_1_DEMO',
      keyword: 'test-keyword',
      http_status: 200,
    },
    {
      discord_user_id: '987654321098765432',
      whop_user_id: 'user_def456',
      silently_key: 'silently_key_2_DEMO',
      keyword: 'test-keyword',
      http_status: 200,
    },
    {
      discord_user_id: null,
      whop_user_id: 'user_ghi789',
      silently_key: 'silently_key_3_DEMO',
      keyword: 'another-keyword',
      http_status: 500,
    },
  ],
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
