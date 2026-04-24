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
| `updater.py` | Self-updater — pulls latest bot files from GitHub on start |

## Auto-updater

`start.bat` runs `python updater.py` once per launch (after venv activation,
before `pip install`). The updater compares the local commit SHA in
`.bot_version` against the latest commit on the configured GitHub branch; if
different, it downloads the repo ZIP and overwrites local files in place.

Env vars (in `.env`):

| Var | Default | Effect |
|-----|---------|--------|
| `BOT_UPDATE_BRANCH` | `main` | GitHub branch to track. Set to `Develope` in the test bot to run unreleased changes. |
| `BOT_AUTO_UPDATE` | `true` | Set to `false` to disable updates — useful when iterating on local files. |

Protected (never overwritten): `.env`, `.bot_version`, `venv`, `.venv`,
`__pycache__`, `start.bat`. If `start.bat` itself changes upstream you need
to replace it manually.

## Test bot setup (side-by-side with production)

Goal: run a second bot instance against the **same** Supabase + Discord guild
without touching real users' notifications. The test bot only reacts to
admins (`profiles.is_admin=true`); the prod bot is unchanged and processes
everyone including admins. While both bots are live, as an admin you'll
receive two notifications per match — this is expected and lets admins
keep getting production notifications whenever the test bot is stopped.
The test bot is meant to run temporarily while you're verifying changes.
Both bots can run simultaneously because they use different Discord
application tokens.

### 1. Create a second Discord application

This step can only be done in the Discord UI — no API path.

1. Go to <https://discord.com/developers/applications>
2. Click **New Application** → name it e.g. `Eventry Bot (Test)`
3. Open **Bot** in the left sidebar → **Reset Token** → copy the token
   somewhere safe (you won't see it again)
4. Scroll down to **Privileged Gateway Intents** and enable:
   - `SERVER MEMBERS INTENT`
   - `MESSAGE CONTENT INTENT`
5. Open **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `View Channels`, `Read Message History`, `Send Messages`
6. Copy the generated URL, open it in your browser, and authorize the bot
   into your existing Eventry guild. It will appear as a second bot user
   alongside the production bot.

### 2. Create a second bot folder on the Windows server

```
C:\Eventry\
├── bot-prod\    ← existing bot (renamed or already there)
└── bot-test\    ← new copy
```

Easiest way: copy `bot-prod\` to `bot-test\`, then delete
`bot-test\venv\` and `bot-test\.bot_version` so it re-installs
dependencies cleanly on first launch.

### 3. Configure the two `.env` files

**`bot-prod\.env`**:
```
DISCORD_BOT_TOKEN=<production_token>
SUPABASE_URL=https://ewsvttrxcqxgifiajvkt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
BOT_ROLE=production
BOT_UPDATE_BRANCH=main
BOT_AUTO_UPDATE=true
```

**`bot-test\.env`**:
```
DISCORD_BOT_TOKEN=<test_token>
SUPABASE_URL=https://ewsvttrxcqxgifiajvkt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
BOT_ROLE=test
BOT_UPDATE_BRANCH=Develope
BOT_AUTO_UPDATE=true
```

### 4. Make sure your own Whop account is marked as admin

Open the Dashboard → Admin Panel → Admins and confirm your Whop user has
`is_admin=true`. The test bot only reacts to admins; if you're not one,
you won't see anything.

### 5. Start both bots

Open two terminal/Explorer windows on the Windows server and double-click
`start.bat` in each folder. You should see:

- `bot-prod`: `Bot ready: <prod-bot-name>` + admin_ids logged
- `bot-test`: `Bot ready: <test-bot-name>` + admin_ids logged

Both bots will log `[RT] ... SUBSCRIBED` for every table. From now on:

- Keyword matches for **non-admin** users fire only on `bot-prod` →
  normal user notifications as before. The test bot ignores them
  completely, so real users are never touched.
- Keyword matches for **admin** users (you) fire on **both** bots → you
  see two DMs / Pushover pings per match while the test bot is running.
  That's expected: the double fire confirms the new code path works on
  `bot-test` without the prod bot having to be stopped.

### Typical dev loop

1. Edit code locally on your Mac → push to `Develope` branch
2. On the Windows server, restart `bot-test\start.bat` — updater pulls
   `Develope`, installs any new deps, runs the new code
3. Trigger a test match (write a keyword into your own Dashboard, then
   post a matching message in a monitored channel)
4. Verify the **new-code path fires for your admin account** (you'll
   see two notifications — the second one, with slightly different
   timing or a new field you just changed, is proof that `bot-test`
   is running your Develope code). Real users only see the `bot-prod`
   output.
5. When happy, merge `Develope → main` via `/deploy`. On the next
   restart of `bot-prod\start.bat`, the updater pulls `main` and all
   real users get the new code.
