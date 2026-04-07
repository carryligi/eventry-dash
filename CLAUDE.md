# Eventry Dashboard

## Architektur-Prinzip
- **Dashboard (Next.js)** = Reine Eingabe-UI. User konfiguriert Keywords, Filter, API-Keys, Benachrichtigungen. Schreibt NUR in die Supabase-Datenbank.
- **Discord Bot (Python)** = Liest die Datenbank, monitort Discord-Nachrichten, matcht Keywords, sendet Notifications. Schreibt nur Logs und Cooldowns zurueck.
- **Kommunikation:** Ausschliesslich ueber die Supabase-Datenbank + Realtime.

## Project
- **Stack:** Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase + Vercel
- **Supabase Project ID:** `ewsvttrxcqxgifiajvkt`
- **Vercel Project:** `eventry-dash` (Team: `team_PuOQRJE5OnWEqalHlZAAWnok`)
- **GitHub:** `carryligi/eventry-dash`
- **Production URL:** https://eventry-dash.vercel.app

## Branch-Strategie
- **`Develope`** — Standard-Arbeitsbranch. Alle Entwicklung passiert hier.
- **`main`** — Production only. Erhaelt Merges von `Develope`.
- **Nie direkt auf `main` committen!**

## Workflow (3 Steps)

### Step 1: Lokaler Commit
```bash
git add <files> && git commit -m "type: beschreibung"
```

### Step 2: Push zu Develope (Preview)
```bash
git push origin Develope
```

### Step 3: Deploy zu Production
```bash
# Option A: /deploy Slash Command (empfohlen)
# Option B: Manuell
git checkout main && git merge Develope && git push origin main && git checkout Develope
```

## Auth
- **Provider:** Whop OAuth 2.0 with PKCE
- **Flow:** Client PKCE (`src/lib/auth-client.ts`) -> Whop authorize -> Callback (`src/app/auth/callback/route.ts`) -> Custom session cookie
- **Session:** Custom HTTPOnly cookie via `src/lib/session.ts` (NOT Supabase Auth)
- **Key files:** `src/lib/whop.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`
- **Access logic:** Any Whop-authenticated user gets access
- **Env vars:** `NEXT_PUBLIC_WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_API_KEY`, `WHOP_COMPANY_ID`

## Server Actions Pattern
- **Alle** Actions returnen `ActionResult<T>` (`{ success: true, data: T } | { success: false, error: string }`)
- **Keine throws** — alle Errors werden als Result returned
- **Zod-Validierung** via `src/lib/validations.ts`
- **Upsert-first** statt select+insert (keine Race Conditions)
- **Toast-Feedback** via `useAction` Hook (`src/hooks/use-action.ts`) + Sonner

## Discord Bot
- **Location:** `bot/` directory (Python, runs on Basti's Windows server)
- **Architecture:** Reads all config from Supabase (no JSON files, no slash commands)
- **Realtime:** Supabase async client for instant cache updates when Dashboard settings change
- **Silently API:** `GET https://qt.silently.gg/?{params}&user_key={keys}&api_key={global_key}` — batches of max 10 users
- **Global Silently API Key:** Stored in `app_settings` table (key=`silently_api_key`)
- **Writes to:** `notification_log`, `active_cooldowns`
- **Start:** `start.bat` on server

## Supabase
- Database migrations via Supabase MCP `apply_migration` tool
- Project ref: `ewsvttrxcqxgifiajvkt`
- **RLS: All tables use permissive policies (`true`)** — auth is handled server-side via custom session, NOT via Supabase JWT
- **IMPORTANT:** Never use `auth.jwt()` in RLS policies — Whop Auth doesn't set Supabase JWT
- Realtime enabled on: `keywords`, `pinger_settings`, `silently_settings`, `pushover_settings`, `webhook_settings`, `autostart_disabled_keywords`, `app_settings`
- `active_cooldowns` has UNIQUE constraint on `(user_id, channel_id, keyword_id)` for upsert
- `autostart_disabled_keywords` has UNIQUE constraint on `(user_id, keyword)` for upsert
- `profiles` table has NO legacy Discord fields (no discord_username, discord_discriminator, discord_avatar)
- All tables have `ON DELETE CASCADE` FKs and auto-updating `updated_at` triggers

## Commit Messages
Format:
```
type: Kurzbeschreibung

- Hauptaspekt 1
- Hauptaspekt 2
```
Typen: `feat`, `fix`, `design`, `refactor`, `perf`, `docs`, `chore`.

## Key Directories
- `src/app/` — Next.js App Router pages
- `src/components/` — React components (ui/, landing/, dashboard/, admin/, shared/)
- `src/lib/` — Utilities, Supabase clients, server actions, auth helpers
- `src/lib/actions/` — Server actions (all return ActionResult<T>)
- `src/lib/validations.ts` — Zod schemas for all inputs
- `src/hooks/use-action.ts` — Custom hook for server action calls with toast
- `src/types/` — TypeScript types + auto-generated database types
- `bot/` — Python Discord bot (Supabase-backed, runs on server)
