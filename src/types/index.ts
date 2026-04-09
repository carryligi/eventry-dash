// ── Result type for all server actions ──
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ── Domain types (match DB schema) ──

export interface Profile {
  id: string
  whop_user_id: string | null
  discord_user_id: string | null
  username: string | null
  email: string | null
  avatar_url: string | null
  membership_status: string | null
  is_admin: boolean
  is_onboarded: boolean
  created_at: string
  updated_at: string
}

export interface Keyword {
  id: string
  user_id: string
  keyword: string
  internal_name: string | null
  channel_ids: string[] | null
  category_ids: string[] | null
  max_price: number | null
  created_at: string
  updated_at: string
}

export interface PingerSettings {
  user_id: string
  is_active: boolean
  cooldown_minutes: number
  updated_at: string
}

export interface PushoverSettings {
  user_id: string
  user_key: string
  priority: 0 | 1 | 2
  updated_at: string
}

export interface SilentlySettings {
  user_id: string
  user_key: string
  is_active: boolean
  min_stock: number
  schedule_start: string | null
  schedule_end: string | null
  updated_at: string
}

export interface WebhookSettings {
  user_id: string
  webhook_url: string
  is_active: boolean
  updated_at: string
}

export interface AutostartDisabledKeyword {
  id: string
  user_id: string
  keyword: string
  created_at: string
}

export interface NotificationLog {
  id: string
  user_id: string
  keyword_id: string | null
  keyword_text: string
  channel_id: string | null
  channel_name: string | null
  message_url: string | null
  dm_sent: boolean
  pushover_sent: boolean
  silently_triggered: boolean
  silently_success: boolean | null
  webhook_sent: boolean
  stock_value: number | null
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
  updated_by: string | null
  updated_at: string
}

// ── Discord API types (for channel picker) ──

export interface DiscordTextChannel {
  id: string
  name: string
  type: number
  parent_id: string | null
  position: number
}

export interface DiscordCategory {
  id: string
  name: string
  position: number
  channels: DiscordTextChannel[]
}

export interface DiscordChannelsResponse {
  categories: DiscordCategory[]
  uncategorized: DiscordTextChannel[]
}
