# Bot Rewrite: JSON → Supabase

**Date:** 2026-04-06
**Status:** Design approved

## Context

The Discord bot currently reads all configuration from local JSON files (`keywords.json`, `silently_keys.json`, `pinger_status.json`, etc.). The Eventry Dashboard already stores all this data in Supabase. The bot needs to be rewritten to read from Supabase instead of JSON, eliminating the need for slash commands and making the Dashboard the single source of truth.

## Architecture

```
bot/
├── main.py              # Bot entry, Discord Gateway, Realtime subscriptions
├── config.py            # Supabase client init, env vars, constants
├── cache.py             # In-memory cache with Realtime updates
├── handlers/
│   └── message.py       # on_message: keyword matching + trigger orchestration
├── services/
│   ├── supabase_db.py   # All DB reads/writes
│   ├── silently.py      # Silently API call (GET https://qt.silently.gg/...)
│   ├── pushover.py      # Pushover API call
│   └── webhooks.py      # Discord webhook notifications
├── models.py            # Dataclasses for Keywords, Settings, etc.
├── requirements.txt     # discord.py, supabase-py, requests
└── .env                 # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_BOT_TOKEN
```

## Core Changes

### 1. JSON → Supabase

All `load_*()` / `save_*()` functions replaced by Supabase queries:

| JSON File | Supabase Table | Notes |
|-----------|---------------|-------|
| `keywords.json` | `keywords` | Includes `max_price` (was separate file) |
| `pinger_status.json` | `pinger_settings` | `is_active`, `cooldown_minutes` |
| `cooldowns.json` | `active_cooldowns` | Bot reads/writes |
| `pushover_keys.json` | `pushover_settings` | `user_key`, `priority` |
| `pushover_app_key.json` | `app_settings` (key=`pushover_app_key`) | Global |
| `silently_keys.json` | `silently_settings` | `user_key`, `is_active` |
| `min_stock.json` | `silently_settings.min_stock` | Merged into silently_settings |
| `autostart_schedule.json` | `silently_settings.schedule_start/end` | TIME fields |
| `autostart_disabled_keywords.json` | `autostart_disabled_keywords` | Per user+keyword |
| `autostart_max_price.json` | `keywords.max_price` | Merged into keywords |
| `autostart_webhooks.json` | `webhook_settings` | `webhook_url`, `is_active` |
| Hardcoded `SILENTLY_API_KEY` | `app_settings` (key=`silently_api_key`) | Global |

### 2. Zero-Delay Caching (Supabase Realtime)

**No polling. No delays.**

- **Bot start**: Full load of all settings from Supabase into RAM
- **Supabase Realtime**: WebSocket subscriptions on all config tables
- **On change**: Only the changed record is updated in the local cache
- **Keyword match**: Always reads from RAM cache → 0ms DB latency

Subscribed tables:
- `keywords` (INSERT, UPDATE, DELETE)
- `pinger_settings` (INSERT, UPDATE)
- `silently_settings` (INSERT, UPDATE)
- `pushover_settings` (INSERT, UPDATE)
- `autostart_disabled_keywords` (INSERT, DELETE)
- `webhook_settings` (INSERT, UPDATE)
- `app_settings` (UPDATE)

### 3. Slash Commands Removed

All slash commands are removed. The Dashboard handles all user configuration. The bot is a pure listener/trigger service.

### 4. Notification Logging

Bot writes to `notification_log` table after each keyword match:
- `user_id`, `keyword_id`, `keyword_text`
- `channel_id`, `channel_name`, `message_url`
- `dm_sent`, `pushover_sent`, `silently_triggered`, `silently_success`
- `webhook_sent`, `stock_value`

### 5. Silently API (unchanged)

```
GET https://qt.silently.gg/?{product_params}&user_key={key1,key2,...}&api_key={global_key}
```

- Batches of max 10 user_keys per request (comma-separated)
- `api_key` read from `app_settings.silently_api_key`
- Trigger conditions: `is_active`, `min_stock`, schedule window, disabled keywords, max_price

## Supabase Access

- **Client**: `supabase-py` with **Service Role Key** (bypasses RLS)
- **Reads**: All config tables (cached via Realtime)
- **Writes**: `notification_log`, `active_cooldowns`

## What Does NOT Change

- Discord Gateway logic (Intents: message_content, messages, members)
- `on_message` flow: check categories → extract embeds → match keywords
- Channel/category restriction checks
- Cooldown system logic
- Silently/Pushover HTTP calls (same endpoints, same params)
- TARGET_CATEGORIES filtering
- Batch processing (max 10 users per Silently request)

## Environment Variables

```
DISCORD_BOT_TOKEN=...
SUPABASE_URL=https://ewsvttrxcqxgifiajvkt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GUILD_ID=1341267240540180542
```

TARGET_CATEGORIES and AUTHORIZED_ROLES remain as constants (or move to `app_settings` later).

## Verification

1. Bot starts and loads all settings from Supabase
2. Change a keyword in Dashboard → Bot cache updates instantly (Realtime)
3. Keyword match triggers DM, Pushover, Silently correctly
4. `notification_log` entries appear in Dashboard
5. Schedule/min_stock/disabled keyword filters work
6. Cooldowns persist across bot restarts (stored in `active_cooldowns` table)
