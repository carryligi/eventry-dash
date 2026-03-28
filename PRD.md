# Eventry Dashboard - Product Requirements Document

## 1. Product Overview

**Product Name:** Eventry Dashboard
**Version:** 1.0
**Date:** 2026-03-28

### Problem Statement
Users currently manage keyword monitoring, notification settings, and autostart configurations through Discord slash commands. This approach is fragmented, lacks visual feedback, has no persistent history, and requires users to remember command syntax. Configuration is stored in JSON files on the server with no backup or audit trail.

### Solution
A modern web dashboard that replaces all Discord slash commands with an intuitive UI. The Discord bot continues to run in the background for message monitoring and notification delivery, but all user-facing configuration moves to the dashboard.

### Brand Identity
- **Name:** Eventry
- **Logo:** Metallic "E" emblem (dark chrome/silver)
- **Primary Colors:** Dark grays (#1a1a2e, #16213e), Silver/Chrome accents (#c0c0c0, #e0e0e0)
- **Accent Color:** Subtle blue-silver (#7f8fa6)
- **Design Language:** Clean, minimal, dark-mode-first, metallic undertones

---

## 2. Target Users

| Role | Description | Access Level |
|------|-------------|--------------|
| **Member** | Discord server member with authorized role | Full self-service dashboard |
| **Admin** | Server admin/moderator | All member features + user management |

**Authentication:** Discord OAuth 2.0 via Supabase Auth. Only members of the configured Discord server (Guild ID: fixed) can access the dashboard.

---

## 3. Core Features

### 3.1 Keyword Management

**Replaces:** `/add_keyword`, `/remove_keyword`, `/active_keywords`, `/add_internal_name`

| Feature | Description |
|---------|-------------|
| Add Keywords | Single or batch (comma-separated). Assign to specific channels, categories, or global. |
| Internal Names | Optional display label per keyword (e.g., "nike" -> "Nike Dunks") |
| Channel/Category Restriction | Limit keyword matching to specific Discord channels or an entire category |
| Max Price | Per-keyword maximum price filter for autostart (new feature from guide) |
| Remove Keywords | Delete individual keywords or bulk-delete |
| Keyword List | Table view with search, sort, filter. Shows: keyword, internal name, restriction, autostart status, max price |
| Duplicate Prevention | Same keyword + same restriction = blocked (matches existing bot logic) |

**Data Model (replaces `keywords.json`):**
```
keywords table:
- id: UUID (PK)
- user_id: TEXT (Discord user ID, FK -> profiles)
- keyword: TEXT (lowercase)
- internal_name: TEXT (nullable)
- restriction_type: ENUM ('global', 'channels', 'category')
- channel_ids: TEXT[] (nullable, for channel restriction)
- category_id: TEXT (nullable, for category restriction)
- max_price: DECIMAL (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 3.2 Pinger Control

**Replaces:** `/activate_pinger`, `/deactivate_pinger`, `/pinger_cooldown`, `/reset_cooldown`

| Feature | Description |
|---------|-------------|
| Global Toggle | ON/OFF switch for keyword monitoring |
| Cooldown | Set cooldown in minutes (per channel + keyword combo). 0 = no cooldown |
| Status Indicator | Visual green/red badge showing pinger status |

**Data Model (replaces `pinger_status.json` + `cooldowns.json`):**
```
pinger_settings table:
- user_id: TEXT (PK, FK -> profiles)
- is_active: BOOLEAN (default false)
- cooldown_minutes: INTEGER (default 0)
- updated_at: TIMESTAMPTZ

active_cooldowns table:
- id: UUID (PK)
- user_id: TEXT (FK -> profiles)
- channel_id: TEXT
- keyword_id: UUID (FK -> keywords)
- expires_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### 3.3 Pushover Integration

**Replaces:** `/pushover`, `/pushover_reset`, `/pushover_priority`

| Feature | Description |
|---------|-------------|
| User Key | Set/update/remove Pushover user key |
| Priority | Select priority level: 0 (normal), 1 (high + sound), 2 (emergency) |
| Test Notification | Button to send a test push notification |
| Status | Shows whether Pushover is configured and current priority |

**Data Model (replaces `pushover_keys.json`):**
```
pushover_settings table:
- user_id: TEXT (PK, FK -> profiles)
- user_key: TEXT (encrypted)
- priority: INTEGER (default 0, range 0-2)
- updated_at: TIMESTAMPTZ
```

### 3.4 Silently Integration (Autostart)

**Replaces:** `/silently`, `/silently_reset`, `/silently_activate`, `/silently_deactivate`, `/autostart_min_stock`, `/autostart_schedule`, `/autostart_schedule_reset`, `/autostart_disable_keyword`, `/autostart_enable_keyword`, `/autostart_disabled_keywords`

| Feature | Description |
|---------|-------------|
| API Key | Set/update/remove Silently user key |
| Autostart Toggle | Enable/disable automatic quicktask starts |
| Min Stock Filter | Minimum stock threshold (0 = always start) |
| Schedule | Daily time window (HH:MM format, CEST timezone, supports overnight spans) |
| Per-Keyword Toggle | Enable/disable autostart for individual keywords |
| Disabled Keywords List | View all keywords excluded from autostart |

**Data Model (replaces `silently_keys.json` + `min_stock.json` + `autostart_schedule.json` + `autostart_disabled_keywords.json`):**
```
silently_settings table:
- user_id: TEXT (PK, FK -> profiles)
- user_key: TEXT (encrypted)
- is_active: BOOLEAN (default false)
- min_stock: INTEGER (default 0)
- schedule_start: TIME (nullable, CEST)
- schedule_end: TIME (nullable, CEST)
- updated_at: TIMESTAMPTZ

autostart_disabled_keywords table:
- id: UUID (PK)
- user_id: TEXT (FK -> profiles)
- keyword: TEXT (lowercase)
- created_at: TIMESTAMPTZ
- UNIQUE(user_id, keyword)
```

### 3.5 Dashboard (Home)

**Replaces:** `/keywordpinger_settings`

A single-page overview showing:
- Pinger status (active/inactive) with toggle
- Keyword count + quick stats
- Cooldown setting
- Pushover status + priority
- Silently status + autostart toggle
- Min stock filter
- Schedule window
- Disabled keywords count
- Recent notification activity (last 10)

### 3.6 Notification Log (New Feature)

Not in the original bot - new addition:
- Chronological log of keyword matches and triggered actions
- Columns: timestamp, keyword, channel, actions taken (DM/Pushover/Silently)
- Filter by keyword, date range
- Pagination

**Data Model:**
```
notification_log table:
- id: UUID (PK)
- user_id: TEXT (FK -> profiles)
- keyword_id: UUID (FK -> keywords)
- keyword_text: TEXT
- channel_id: TEXT
- channel_name: TEXT
- message_url: TEXT
- dm_sent: BOOLEAN
- pushover_sent: BOOLEAN
- silently_triggered: BOOLEAN
- silently_success: BOOLEAN (nullable)
- stock_value: INTEGER (nullable)
- created_at: TIMESTAMPTZ
```

### 3.7 Admin Panel

**Replaces:** `/keywords` (admin), `/pushover_application_key` (admin)

| Feature | Description |
|---------|-------------|
| User List | All registered users with keyword count, pinger status |
| View User Keywords | Inspect any user's keyword configuration |
| Pushover App Key | View/change the global Pushover application key |
| System Stats | Total users, total keywords, active pingers, recent matches |

**Access Control:** Only users with configured admin Discord role IDs.

---

## 4. Pages & Navigation

### 4.1 Public Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing Page | `/` | Minimal marketing page with Discord OAuth login |

### 4.2 Authenticated Pages (Sidebar Navigation)

| Page | Route | Icon | Description |
|------|-------|------|-------------|
| Dashboard | `/dashboard` | LayoutDashboard | Overview of all settings + stats |
| Keywords | `/dashboard/keywords` | Tag | CRUD keyword management |
| Autostart | `/dashboard/autostart` | Zap | Silently settings, schedule, filters |
| Notifications | `/dashboard/notifications` | Bell | Pushover settings + notification log |
| Settings | `/dashboard/settings` | Settings | Account & general settings |
| Admin | `/dashboard/admin` | Shield | User management (admin only) |

---

## 5. Landing Page Design

### Structure
1. **Navbar:** Logo (left) + "Login with Discord" button (right)
2. **Hero Section:** Large logo + tagline ("Monitor. Alert. Autostart.") + CTA button
3. **Features Grid:** 3-4 cards highlighting key features
   - Keyword Monitoring
   - Push Notifications
   - Autostart Integration
   - Real-time Dashboard
4. **Footer:** Minimal with branding

### Design Specs
- Dark background (#0a0a0f to #1a1a2e gradient)
- Metallic/chrome text accents
- Glassmorphism cards with subtle borders
- Single viewport height (no scrolling or minimal scroll)
- Responsive (mobile-first)

---

## 6. Technical Architecture

### Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 15 (App Router) | SSR, API routes, Vercel-optimized |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 | Utility-first, fast |
| Components | shadcn/ui | Accessible, customizable, no runtime |
| Database | Supabase (PostgreSQL) | Managed DB, Auth, RLS, Realtime |
| Auth | Supabase Auth (Discord OAuth) | Built-in Discord provider |
| Hosting | Vercel | Zero-config Next.js deploys |
| Repository | GitHub | CI/CD with Vercel |

### Architecture Diagram
```
[User Browser]
     |
     v
[Vercel / Next.js 15]
     |
     ├── Landing Page (SSR)
     ├── Dashboard Pages (Client Components + Server Actions)
     └── API Routes (for bot communication)
            |
            v
     [Supabase]
     ├── PostgreSQL (data)
     ├── Auth (Discord OAuth)
     ├── Row Level Security
     └── Realtime (optional, for live updates)
            |
            v
     [Discord Bot (Python, separate server)]
     ├── Reads settings from Supabase (replaces JSON)
     ├── Monitors Discord messages
     ├── Sends DMs, Pushover, Silently triggers
     └── Writes to notification_log
```

### Database Schema Summary

```sql
-- User profiles (auto-created on Discord OAuth)
profiles (
  id TEXT PRIMARY KEY,          -- Discord user ID
  discord_username TEXT,
  discord_avatar TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Keywords
keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id),
  keyword TEXT NOT NULL,
  internal_name TEXT,
  restriction_type TEXT DEFAULT 'global',  -- 'global', 'channels', 'category'
  channel_ids TEXT[],
  category_id TEXT,
  max_price DECIMAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Pinger settings
pinger_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT false,
  cooldown_minutes INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Active cooldowns (managed by bot)
active_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id),
  channel_id TEXT NOT NULL,
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Pushover settings
pushover_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id),
  user_key TEXT NOT NULL,
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 2),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Silently / Autostart settings
silently_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id),
  user_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  min_stock INTEGER DEFAULT 0,
  schedule_start TIME,
  schedule_end TIME,
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Keywords excluded from autostart
autostart_disabled_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id),
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, keyword)
)

-- Notification history (written by bot)
notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(id),
  keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
  keyword_text TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  message_url TEXT,
  dm_sent BOOLEAN DEFAULT false,
  pushover_sent BOOLEAN DEFAULT false,
  silently_triggered BOOLEAN DEFAULT false,
  silently_success BOOLEAN,
  stock_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Global app settings (admin-managed)
app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
)
-- Initial: pushover_app_key, silently_api_key, guild_id
```

### Row Level Security (RLS)
- Users can only read/write their own data
- Admin users can read all users' data
- `notification_log` is insert-only from service role (bot), read-only for users
- `app_settings` is read/write for admins only

### API Routes (for Discord Bot)

The bot needs to read from Supabase. Two approaches:
1. **Direct Supabase client** (recommended) - Bot uses `supabase-py` with service role key
2. **Next.js API routes** - Bot calls dashboard API endpoints

Recommended: Direct Supabase client in the bot for lowest latency.

---

## 7. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.0s |
| Time to Interactive | < 1.5s |
| Lighthouse Score | > 90 |
| API Response Time | < 200ms |
| Database Queries | < 50ms |

### Optimization Strategies
- Server Components by default (minimize client JS)
- Static generation for landing page
- Supabase connection pooling
- Optimistic UI updates for toggles/forms
- Lazy load notification log with pagination
- Image optimization via Next.js `<Image />`

---

## 8. Project Structure

```
eventry-dash/
├── public/
│   └── logo.png
├── src/
│   ├── app/
│   │   ├── (landing)/
│   │   │   └── page.tsx              # Landing page
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── callback/route.ts     # OAuth callback
│   │   ├── dashboard/
│   │   │   ├── layout.tsx            # Sidebar + auth guard
│   │   │   ├── page.tsx              # Dashboard overview
│   │   │   ├── keywords/page.tsx
│   │   │   ├── autostart/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── landing/                  # Landing page components
│   │   ├── dashboard/                # Dashboard-specific components
│   │   └── shared/                   # Shared components (logo, nav)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser client
│   │   │   ├── server.ts             # Server client
│   │   │   └── middleware.ts          # Auth middleware
│   │   ├── utils.ts
│   │   └── constants.ts
│   ├── hooks/                        # Custom React hooks
│   └── types/                        # TypeScript types
├── supabase/
│   └── migrations/                   # SQL migrations
├── .env.local
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── PRD.md
```

---

## 9. Migration Plan (JSON -> Supabase)

1. Create Supabase project + tables
2. Write migration script to import existing JSON data
3. Update bot to read from Supabase instead of JSON files
4. Deploy dashboard
5. Test in parallel (bot + dashboard writing to same DB)
6. Deprecate slash commands

---

## 10. Out of Scope (v1)

- Multi-server support (single guild only)
- Mobile native app
- Real-time WebSocket updates (Supabase Realtime - can add in v2)
- Email notifications
- Billing / subscription management
- Bot hosting/deployment (bot stays on current server)

---

## 11. Success Metrics

- All 14 slash commands replicated in dashboard UI
- < 2s page load times
- Zero data loss during JSON -> Supabase migration
- Users can self-service all settings without Discord commands
