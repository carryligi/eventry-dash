# Eventry Dashboard

## Project
- **Stack:** Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase + Vercel
- **Supabase Project ID:** `ewsvttrxcqxgifiajvkt`
- **Vercel Project:** `eventry-dash` (Team: `team_PuOQRJE5OnWEqalHlZAAWnok`)
- **GitHub:** `carryligi/eventry-dash`
- **Production URL:** https://eventry-dash.vercel.app

## Branch-Strategie
- **`Develope`** — Standard-Arbeitsbranch. Alle Entwicklung passiert hier.
- **`main`** — Production only. Erhält Merges von `Develope`.
- **Nie direkt auf `main` committen!**

## Workflow (3 Steps)

### Step 1: Lokaler Commit
```bash
git add <files> && git commit -m "type: beschreibung"
```
→ Pre-commit Hook: ESLint via lint-staged auf gestagte Dateien

### Step 2: Push zu Develope (Preview)
```bash
git push origin Develope
```
→ Pre-push Hook: TypeScript Typecheck + Next.js Build
→ GitHub Actions CI: Lint + Typecheck + Build
→ Vercel Preview Deploy (wenn GitHub Integration aktiv)

### Step 3: Deploy zu Production
```bash
# Option A: /deploy Slash Command (empfohlen)
# Option B: Manuell
git checkout main && git merge Develope && git push origin main && git checkout Develope
```
→ GitHub Actions: Quality Checks + Vercel Production Deploy

## Quality Gates
- **Pre-commit:** ESLint auf gestagte Dateien (husky + lint-staged)
- **Pre-push:** `tsc --noEmit` + `next build`
- **CI (GitHub Actions):** Lint + Typecheck + Build
- **Production Deploy:** Nur nach bestandenen Quality Checks

## Auth
- **Provider:** Whop OAuth 2.0 with PKCE (replaced Discord OAuth)
- **Flow:** Client PKCE (`src/lib/auth-client.ts`) → Whop authorize → Callback (`src/app/auth/callback/route.ts`) → Custom session cookie
- **Session:** Custom HTTPOnly cookie via `src/lib/session.ts` (NOT Supabase Auth)
- **Key files:** `src/lib/whop.ts` (token exchange, userinfo, access check), `src/lib/auth-client.ts` (PKCE + redirect)
- **Access logic:** Any Whop-authenticated user gets access (product owner = access)
- **Env vars:** `NEXT_PUBLIC_WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `WHOP_API_KEY`, `WHOP_COMPANY_ID`

## Discord Bot
- **Location:** `bot/` directory (Python, runs on Basti's Windows server)
- **Architecture:** Reads all config from Supabase (no JSON files, no slash commands)
- **Realtime:** Supabase async client for instant cache updates when Dashboard settings change
- **Key:** Uses `supabase` sync client for DB queries, `create_async_client` for Realtime subscriptions
- **Silently API:** `GET https://qt.silently.gg/?{params}&user_key={keys}&api_key={global_key}` — batches of max 10 users
- **Global Silently API Key:** Stored in `app_settings` table (key=`silently_api_key`)
- **Writes to:** `notification_log`, `active_cooldowns`
- **Start:** `start.bat` on server (auto-creates venv, installs deps, auto-restarts on crash)

## Supabase
- Database migrations via Supabase MCP `apply_migration` tool
- Project ref: `ewsvttrxcqxgifiajvkt`
- **RLS: All tables use permissive policies (`true`)** — auth is handled server-side via custom session, NOT via Supabase JWT
- **IMPORTANT:** Never use `auth.jwt()` or `auth_discord_id()` in RLS policies — Whop Auth doesn't set Supabase JWT
- Realtime enabled on: `keywords`, `pinger_settings`, `silently_settings`, `pushover_settings`, `webhook_settings`, `autostart_disabled_keywords`, `app_settings`
- `profiles.discord_username` is nullable (Whop users don't have Discord usernames)
- `active_cooldowns` has UNIQUE constraint on `(user_id, channel_id, keyword_id)` for upsert

## Commit Messages
Jeder Commit muss eine kurze, knackige Beschreibung der Hauptänderungen enthalten. Format:
```
type: Kurzbeschreibung

- Hauptaspekt 1
- Hauptaspekt 2
```
Typen: `feat` (neue Funktion), `fix` (Bugfix), `design` (UI/Design), `refactor`, `perf`, `docs`, `chore`.
Die Aufzählungspunkte sollen in wenigen Wörtern beschreiben, was konkret geändert wurde (z.B. "Discord Login hinzugefügt", "Dashboard Sidebar neu gestaltet").

## Key Directories
- `src/app/` — Next.js App Router pages
- `src/components/` — React components (ui/, landing/, dashboard/)
- `src/lib/` — Utilities, Supabase clients, server actions, auth helpers
- `src/types/` — TypeScript types
- `bot/` — Python Discord bot (Supabase-backed, runs on server)
- `docs/specs/` — Technical specification
