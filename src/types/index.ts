export interface Profile {
  id: string
  discord_username: string
  discord_discriminator: string | null
  discord_avatar: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Keyword {
  id: string
  user_id: string
  keyword: string
  internal_name: string | null
  restriction_type: 'global' | 'channels' | 'category'
  channel_ids: string[] | null
  category_id: string | null
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
  stock_value: number | null
  created_at: string
}

export interface AppSetting {
  key: string
  value: string
  updated_by: string | null
  updated_at: string
}
