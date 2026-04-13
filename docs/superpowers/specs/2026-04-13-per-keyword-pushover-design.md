# Per-Keyword Pushover Toggle

**Date:** 2026-04-13
**Status:** Draft

## Context

Pushover notifications are currently configured globally per user — one on/off state and one priority level that applies to all keywords. Users want granular control to disable Pushover for specific keywords while keeping it active for others. This follows the same pattern already established for autostart toggles.

## Requirements

- Per-keyword Pushover on/off toggle in the keyword table (new column next to autostart)
- Blocklist pattern: new keywords inherit global state (global ON = keyword ON by default)
- When Pushover is globally OFF, per-keyword toggles are visible but disabled (greyed out with tooltip)
- Priority remains global — only the on/off state is per-keyword
- Bot must respect per-keyword overrides in real-time via Supabase Realtime

## Database

New table: `pushover_disabled_keywords`

| Column       | Type          | Constraints                                  |
|-------------|---------------|----------------------------------------------|
| `id`        | UUID          | PK, default `gen_random_uuid()`              |
| `user_id`   | TEXT          | FK → profiles(id) ON DELETE CASCADE, NOT NULL |
| `keyword`   | TEXT          | NOT NULL                                     |
| `created_at`| TIMESTAMPTZ   | default `now()`                              |

- UNIQUE constraint on `(user_id, keyword)` for upsert conflict handling
- RLS: permissive policy (`true`) — auth handled server-side
- Realtime enabled for instant bot cache updates
- `updated_at` trigger (consistent with other tables)

### Logic

| Global Pushover | Keyword in blocklist? | Result             |
|----------------|----------------------|--------------------|
| ON             | No                   | Pushover active    |
| ON             | Yes                  | Pushover disabled  |
| OFF            | (irrelevant)         | Pushover disabled  |

## Server Action

File: `src/lib/actions/pushover.ts`

New action: `toggleKeywordPushover(keyword: string, enabled: boolean): ActionResult<void>`

- `enabled: true` → DELETE from `pushover_disabled_keywords` WHERE user_id AND keyword
- `enabled: false` → UPSERT into `pushover_disabled_keywords` with `(user_id, keyword)` conflict
- Revalidates `/dashboard/notifications` and `/dashboard/keywords`
- Zod validation for keyword string (reuse existing `keywordSchema`)

## UI Changes

### Keyword Table (`src/components/dashboard/keyword-table.tsx`)

New column "Pushover" adjacent to the existing autostart column:

- Switch toggle per keyword row
- Optimistic updates (same pattern as autostart toggle)
- **Global ON:** Toggle is interactive, reflects blocklist state
- **Global OFF / No Pushover key:** Toggle is disabled with tooltip "Pushover global deaktiviert" / "Kein Pushover-Key konfiguriert"

New props needed:
- `pushoverDisabledKeywords: string[]` — keywords with Pushover disabled
- `pushoverGlobalEnabled: boolean` — whether user has Pushover configured and active

### Data Fetching

The keywords page (`src/app/dashboard/keywords/page.tsx`) needs to additionally query:
- `pushover_disabled_keywords` for the current user
- `pushover_settings` to determine if Pushover is globally configured

## Bot Changes

### Cache (`bot/cache.py`)

- New cache structure: `pushover_disabled` — a dict keyed by `user_id` containing sets of disabled keyword strings
- Load on startup: `SELECT user_id, keyword FROM pushover_disabled_keywords`
- Realtime subscription on `pushover_disabled_keywords` for INSERT/DELETE events

### Message Handler (`bot/handlers/message.py`)

In the notification dispatch logic, before sending a Pushover notification:
1. Check if user has Pushover configured (existing check)
2. Check if `(user_id, matched_keyword)` is in `pushover_disabled` set
3. If disabled, skip Pushover for this match (other notification channels unaffected)

## Verification

1. **Database:** Run migration, verify table exists with correct constraints
2. **Server Action:** Toggle keywords on/off, verify rows appear/disappear in `pushover_disabled_keywords`
3. **UI:** 
   - With Pushover global ON: toggles are interactive, state persists after reload
   - With Pushover global OFF: toggles are visible but disabled with tooltip
   - New keywords don't appear in blocklist (inherit global ON state)
4. **Bot:** Trigger a keyword match, verify Pushover is skipped for disabled keywords but still sent for enabled ones
