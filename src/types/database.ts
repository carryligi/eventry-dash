export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_cooldowns: {
        Row: {
          channel_id: string
          created_at: string
          expires_at: string
          id: string
          keyword_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          expires_at: string
          id?: string
          keyword_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          keyword_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_cooldowns_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_cooldowns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      autostart_disabled_keywords: {
        Row: {
          created_at: string
          id: string
          keyword: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          keyword: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          keyword?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "autostart_disabled_keywords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keywords: {
        Row: {
          category_ids: string[] | null
          channel_ids: string[] | null
          created_at: string
          id: string
          internal_name: string | null
          keyword: string
          max_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_ids?: string[] | null
          channel_ids?: string[] | null
          created_at?: string
          id?: string
          internal_name?: string | null
          keyword: string
          max_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_ids?: string[] | null
          channel_ids?: string[] | null
          created_at?: string
          id?: string
          internal_name?: string | null
          keyword?: string
          max_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keywords_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          channel_id: string | null
          channel_name: string | null
          created_at: string
          dm_sent: boolean
          id: string
          keyword_id: string | null
          keyword_text: string
          message_url: string | null
          pushover_sent: boolean
          silently_success: boolean | null
          silently_triggered: boolean
          stock_value: number | null
          user_id: string
          webhook_sent: boolean
        }
        Insert: {
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string
          dm_sent?: boolean
          id?: string
          keyword_id?: string | null
          keyword_text: string
          message_url?: string | null
          pushover_sent?: boolean
          silently_success?: boolean | null
          silently_triggered?: boolean
          stock_value?: number | null
          user_id: string
          webhook_sent?: boolean
        }
        Update: {
          channel_id?: string | null
          channel_name?: string | null
          created_at?: string
          dm_sent?: boolean
          id?: string
          keyword_id?: string | null
          keyword_text?: string
          message_url?: string | null
          pushover_sent?: boolean
          silently_success?: boolean | null
          silently_triggered?: boolean
          stock_value?: number | null
          user_id?: string
          webhook_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "keywords"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pinger_settings: {
        Row: {
          cooldown_minutes: number
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cooldown_minutes?: number
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          cooldown_minutes?: number
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinger_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_admin: boolean
          membership_status: string | null
          updated_at: string
          username: string | null
          whop_user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          is_admin?: boolean
          membership_status?: string | null
          updated_at?: string
          username?: string | null
          whop_user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_admin?: boolean
          membership_status?: string | null
          updated_at?: string
          username?: string | null
          whop_user_id?: string | null
        }
        Relationships: []
      }
      pushover_settings: {
        Row: {
          priority: number
          updated_at: string
          user_id: string
          user_key: string
        }
        Insert: {
          priority?: number
          updated_at?: string
          user_id: string
          user_key: string
        }
        Update: {
          priority?: number
          updated_at?: string
          user_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "pushover_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      silently_settings: {
        Row: {
          is_active: boolean
          min_stock: number
          schedule_end: string | null
          schedule_start: string | null
          updated_at: string
          user_id: string
          user_key: string
        }
        Insert: {
          is_active?: boolean
          min_stock?: number
          schedule_end?: string | null
          schedule_start?: string | null
          updated_at?: string
          user_id: string
          user_key: string
        }
        Update: {
          is_active?: boolean
          min_stock?: number
          schedule_end?: string | null
          schedule_start?: string | null
          updated_at?: string
          user_id?: string
          user_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "silently_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_settings: {
        Row: {
          is_active: boolean
          updated_at: string
          user_id: string
          webhook_url: string
        }
        Insert: {
          is_active?: boolean
          updated_at?: string
          user_id: string
          webhook_url: string
        }
        Update: {
          is_active?: boolean
          updated_at?: string
          user_id?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Row"]

export type TablesInsert<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Insert"]

export type TablesUpdate<
  TableName extends keyof DefaultSchema["Tables"],
> = DefaultSchema["Tables"][TableName]["Update"]
