# Eventry Discord Bot

Keyword monitoring bot that reads all configuration from Supabase (via the Eventry Dashboard).

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and fill in:
   ```
   DISCORD_BOT_TOKEN=your_bot_token
   SUPABASE_URL=https://ewsvttrxcqxgifiajvkt.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. Run:
   ```bash
   python main.py
   ```

## Architecture

- **No JSON files** — all config comes from Supabase
- **No slash commands** — all management via the Dashboard
- **Supabase Realtime** — settings changes in Dashboard sync instantly to bot (no polling)
- **RAM cache** — on_message reads from memory, zero DB latency

## Files

| File | Purpose |
|------|---------|
| `main.py` | Bot entry point, Discord Gateway connection |
| `config.py` | Supabase client, constants |
| `cache.py` | In-memory cache with Realtime subscriptions |
| `models.py` | Dataclasses for all settings |
| `handlers/message.py` | Keyword matching + trigger orchestration |
| `services/silently.py` | Silently quicktask API |
| `services/pushover.py` | Pushover notification API |
| `services/webhooks.py` | Discord webhook notifications |
| `services/supabase_db.py` | DB write operations (notification_log, cooldowns) |
