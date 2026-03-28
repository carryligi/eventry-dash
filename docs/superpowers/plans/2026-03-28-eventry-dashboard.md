# Eventry Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Eventry Dashboard — a Next.js web app replacing Discord slash commands for keyword monitoring, with Supabase backend, Discord OAuth, and Vercel hosting.

**Architecture:** Next.js 15 App Router with React Server Components for zero-loading-time data fetching, Supabase for PostgreSQL + Auth + RLS, Framer Motion for landing page animations. Design crafted at build time via `frontend-design` skill and `21st.dev` MCP.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase, Framer Motion, Vercel

**Spec:** `docs/specs/2026-03-28-eventry-dashboard-spec.md`

---

## Dependency Graph

```
Task 1 (Project Setup)
  ├─→ Task 2 (Database) ─→ Task 4 (Auth) ─→ Task 6 (Dashboard Layout)
  │                                              ├─→ Task 7 (Dashboard Home)
  │                                              ├─→ Task 8 (Keywords Page)
  │                                              ├─→ Task 9 (Autostart Page)
  │                                              ├─→ Task 10 (Notifications Page)
  │                                              ├─→ Task 11 (Settings Page)
  │                                              └─→ Task 12 (Admin Section)
  └─→ Task 3 (Design System) ─→ Task 5 (Landing Page)
```

**Parallelizable groups:**
- After Task 1: Tasks 2 + 3 in parallel
- After Task 4 + 6: Tasks 7-12 in parallel (all dashboard pages are independent)

---

### Task 1: Project Setup + GitHub

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `.env.local`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd "C:/Users/basti/Desktop/Programmieren/Claude Code/Eventry_Dash"
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr framer-motion lucide-react class-variance-authority clsx tailwind-merge
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes

- [ ] **Step 4: Install shadcn/ui components**

```bash
npx shadcn@latest add button card dialog input select switch table badge tooltip tabs skeleton separator dropdown-menu label textarea
```

- [ ] **Step 5: Copy logo to public/**

```bash
cp "C:/Users/basti/Desktop/EventryLogo.png" public/logo.png
```

- [ ] **Step 6: Create `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

(Values filled after Task 2 creates Supabase project)

- [ ] **Step 7: Create `.gitignore`**

Ensure it includes:
```
node_modules/
.next/
.env.local
.env*.local
.superpowers/
```

- [ ] **Step 8: Initialize git + GitHub repo**

```bash
git init
git add -A
git commit -m "feat: initialize Next.js 15 project with Tailwind, shadcn/ui, Supabase deps"
gh repo create eventry-dash --public --source=. --push
```

- [ ] **Step 9: Create utility files**

Create `src/lib/utils.ts`:
```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Create `src/types/index.ts`:
```typescript
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
```

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: add TypeScript types and utility helpers"
```

---

### Task 2: Supabase Database Setup

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Modify: `.env.local`

- [ ] **Step 1: Create Supabase project**

Use MCP tool `mcp__bdf0900e...create_project` or create via Supabase dashboard. Region: `eu-central-1`.

- [ ] **Step 2: Enable Discord OAuth in Supabase**

In Supabase Dashboard → Authentication → Providers → Discord:
- Enable Discord provider
- Set Client ID + Client Secret from Discord Developer Portal
- Redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback`

- [ ] **Step 3: Apply database migration**

Use `mcp__bdf0900e...apply_migration` with the complete SQL from spec section 5.1 (CREATE TABLEs + indexes + triggers).

- [ ] **Step 4: Apply RLS policies**

Use `mcp__bdf0900e...apply_migration` with the complete SQL from spec section 5.2 (ALTER TABLE ENABLE RLS + all CREATE POLICY statements).

- [ ] **Step 5: Insert initial app_settings**

```sql
INSERT INTO app_settings (key, value) VALUES
  ('pushover_app_key', ''),
  ('silently_api_key', ''),
  ('guild_id', '1341267240540180542');
```

- [ ] **Step 6: Update `.env.local`**

Fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` from Supabase project settings.

- [ ] **Step 7: Generate TypeScript types**

Use `mcp__bdf0900e...generate_typescript_types` and save output to `src/types/database.ts`.

- [ ] **Step 8: Create Supabase client helpers**

Create `src/lib/supabase/server.ts`:
```typescript
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const cookieStore = await cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

Create `src/lib/supabase/client.ts`:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Create `src/lib/supabase/middleware.ts`:
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 9: Create Next.js middleware**

Create `src/middleware.ts`:
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
```

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: Supabase setup with schema, RLS, auth middleware"
```

---

### Task 3: Design System + Global Styles

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`
- Create: `src/lib/constants.ts`

- [ ] **Step 1: Configure globals.css with CSS custom properties**

Replace `src/app/globals.css` with the full color palette from spec section 1.1 as CSS custom properties, plus Tailwind imports. All `--bg-*`, `--border-*`, `--text-*`, `--accent-*`, `--success/warning/error/info` variables.

- [ ] **Step 2: Configure root layout with fonts**

Update `src/app/layout.tsx` to load Inter and JetBrains Mono via `next/font/google`. Set metadata (title: "Eventry", description). Apply dark bg class to body.

- [ ] **Step 3: Create constants**

Create `src/lib/constants.ts` with route paths, navigation items (icon + label + href for sidebar), and config values.

- [ ] **Step 4: Invoke `frontend-design` skill for shadcn/ui theme customization**

Use the `frontend-design` skill and/or `shadcn/ui` MCP `apply_theme` tool to create a distinctive dark theme. Apply Chrome/Silver Metallic palette. Override shadcn component defaults to match.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: design system with metallic dark theme"
```

---

### Task 4: Authentication (Discord OAuth)

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/hooks/use-user.ts`

- [ ] **Step 1: Create OAuth callback route**

Create `src/app/auth/callback/route.ts` following spec section 6.2. Exchanges code for session, upserts profile from Discord metadata, initializes default pinger_settings row, redirects to `/dashboard`.

- [ ] **Step 2: Create auth helper hook**

Create `src/hooks/use-user.ts`:
```typescript
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import type { Profile } from '@/types'

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.user_metadata.provider_id)
          .single()
        setProfile(data)
      }
      setLoading(false)
    })
  }, [])

  return { profile, loading }
}
```

- [ ] **Step 3: Create server-side auth helper**

Create `src/lib/auth.ts`:
```typescript
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types'

export async function getCurrentUser(): Promise<Profile> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user_metadata.provider_id)
    .single()

  if (!profile) redirect('/')
  return profile
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUser()
  if (!profile.is_admin) redirect('/dashboard')
  return profile
}
```

- [ ] **Step 4: Test auth flow**

Run `npm run dev`, navigate to localhost:3000, verify Discord OAuth redirect works, callback creates profile in DB.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: Discord OAuth with profile upsert and auth helpers"
```

---

### Task 5: Landing Page

**Files:**
- Create: `src/app/(landing)/page.tsx`, `src/app/(landing)/layout.tsx`
- Create: `src/components/landing/navbar.tsx`, `hero.tsx`, `features.tsx`, `how-it-works.tsx`, `cta-section.tsx`
- Create: `src/components/shared/reveal.tsx`, `src/components/shared/logo.tsx`

- [ ] **Step 1: Create shared components**

Create `src/components/shared/reveal.tsx` — Framer Motion scroll-reveal wrapper (code in spec section 3.8).
Create `src/components/shared/logo.tsx` — Eventry logo component using `next/image`.

- [ ] **Step 2: Create landing layout**

Create `src/app/(landing)/layout.tsx` — minimal layout without sidebar, just children.

- [ ] **Step 3: Use `frontend-design` skill to build landing page**

Invoke the `frontend-design` skill to design and build all landing page components:
- Navbar with sticky behavior + backdrop blur
- Hero section with animated logo background (large semi-transparent E logo, Framer Motion ambient animation) + headline + CTA
- Features grid (3 cards: Keyword Monitoring, Push Notifications, Auto-Start)
- How It Works (3 steps)
- CTA section
- Footer

Use `21st.dev` MCP (`mcp__magic__21st_magic_component_builder`) for individual component inspiration.

Constraints from spec:
- Animated Eventry logo as hero background (`public/logo.png`, opacity 0.04-0.08, slow animation)
- Chrome/Silver Metallic palette
- Framer Motion for all animations
- Anti-AI-slop rules (no gratuitous gradients, no blur blobs, no icon soup)

- [ ] **Step 4: Create landing page.tsx**

Assemble all landing components in `src/app/(landing)/page.tsx`. Static generation (no `'use client'` at page level except for animation wrappers).

- [ ] **Step 5: Test landing page**

Run dev server, verify:
- Logo animation plays on load
- Scroll reveals trigger
- "Login with Discord" button redirects to OAuth
- Responsive on mobile

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: landing page with animated hero and scroll reveals"
```

---

### Task 6: Dashboard Layout (Sidebar + Top Bar)

**Files:**
- Create: `src/app/dashboard/layout.tsx`, `src/app/dashboard/loading.tsx`
- Create: `src/components/dashboard/sidebar.tsx`, `src/components/dashboard/top-bar.tsx`

- [ ] **Step 1: Build sidebar component**

Create `src/components/dashboard/sidebar.tsx`:
- 56px wide collapsed icon sidebar
- Logo at top, navigation icons (lucide-react), user avatar at bottom
- Tooltip on hover for each icon
- Active page highlight with `--bg-active`
- Admin icon only visible if `profile.is_admin`
- Mobile: fixed bottom nav bar (< 768px)

Use `frontend-design` skill for distinctive sidebar design within these constraints.

- [ ] **Step 2: Build top bar component**

Create `src/components/dashboard/top-bar.tsx`:
- Page title (passed as prop)
- Quick status badges (Pinger active/inactive, Silently active/inactive)

- [ ] **Step 3: Create dashboard layout**

Create `src/app/dashboard/layout.tsx`:
```typescript
import { getCurrentUser } from '@/lib/auth'
import { createServerClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentUser()

  return (
    <div className="flex h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Create loading skeleton**

Create `src/app/dashboard/loading.tsx` with Skeleton components for instant perceived navigation.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: dashboard layout with icon sidebar and top bar"
```

---

### Task 7: Dashboard Home Page

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/components/dashboard/stat-cards.tsx`, `quick-settings.tsx`, `recent-activity.tsx`
- Create: `src/lib/actions/pinger.ts`, `src/lib/actions/silently.ts`

- [ ] **Step 1: Create Server Actions**

Create `src/lib/actions/pinger.ts`:
```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function togglePinger(isActive: boolean) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('pinger_settings').upsert({
    user_id: profile.id,
    is_active: isActive,
  })
  revalidatePath('/dashboard')
}

export async function updateCooldown(minutes: number) {
  const profile = await getCurrentUser()
  const supabase = await createServerClient()
  await supabase.from('pinger_settings').upsert({
    user_id: profile.id,
    cooldown_minutes: minutes,
  })
  revalidatePath('/dashboard')
}
```

Create `src/lib/actions/silently.ts` with similar pattern for `toggleAutostart`, `updateMinStock`, `updateSchedule`.

- [ ] **Step 2: Build stat cards (Server Component)**

Create `src/components/dashboard/stat-cards.tsx` — 4 cards showing: keyword count, match count (from notification_log), pinger status, today's matches. Pure Server Component, data passed as props.

- [ ] **Step 3: Build quick settings (Client Component)**

Create `src/components/dashboard/quick-settings.tsx` — Pinger toggle + cooldown, Autostart toggle + min stock + schedule display. Uses `useOptimistic` for instant UI updates. Calls Server Actions.

- [ ] **Step 4: Build recent activity (Server Component)**

Create `src/components/dashboard/recent-activity.tsx` — Table of last 10 notification_log entries.

- [ ] **Step 5: Assemble dashboard page**

Create `src/app/dashboard/page.tsx` — Server Component that parallel-fetches keywords count, pinger_settings, silently_settings, notification_log. Renders StatCards, QuickSettings, RecentActivity.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: dashboard home with stats, quick settings, recent activity"
```

---

### Task 8: Keywords Page

**Files:**
- Create: `src/app/dashboard/keywords/page.tsx`, `loading.tsx`
- Create: `src/components/dashboard/keyword-table.tsx`, `add-keyword-dialog.tsx`
- Create: `src/lib/actions/keywords.ts`

- [ ] **Step 1: Create keyword Server Actions**

Create `src/lib/actions/keywords.ts` with:
- `addKeywords(formData)` — parse comma-separated keywords, insert with restriction_type/channel_ids/category_id/max_price/internal_name
- `deleteKeywords(ids: string[])` — bulk delete by ID array
- `updateKeywordName(id, name)` — update internal_name for inline edit

Full implementation following spec section 8 patterns.

- [ ] **Step 2: Build keyword table**

Create `src/components/dashboard/keyword-table.tsx`:
- Client Component for search/filter/sort/bulk-select
- Columns: checkbox, keyword, internal name (inline editable), scope, max price, autostart status
- Search input filters client-side
- Bulk select + delete button

- [ ] **Step 3: Build add keyword dialog**

Create `src/components/dashboard/add-keyword-dialog.tsx`:
- shadcn Dialog with form
- Keyword input (comma-separated), internal name, scope selector (global/channels/category), conditional channel_ids/category_id inputs, max price, autostart toggle
- Form submission calls `addKeywords` Server Action

- [ ] **Step 4: Assemble keywords page**

Create `src/app/dashboard/keywords/page.tsx` — Server Component fetching all user keywords, renders table + add button.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: keywords page with CRUD, search, bulk operations"
```

---

### Task 9: Autostart Page

**Files:**
- Create: `src/app/dashboard/autostart/page.tsx`, `loading.tsx`
- Create: `src/components/dashboard/silently-config.tsx`, `schedule-config.tsx`, `keyword-autostart-list.tsx`

- [ ] **Step 1: Extend silently Server Actions**

Add to `src/lib/actions/silently.ts`:
- `setSilentlyKey(key)`, `removeSilentlyKey()`
- `updateSchedule(start, end)`, `resetSchedule()`
- `toggleKeywordAutostart(keyword, enabled)` — insert/delete from `autostart_disabled_keywords`

- [ ] **Step 2: Build silently config component**

Create `src/components/dashboard/silently-config.tsx` — masked API key input, show/hide toggle, connection toggle, remove button. Client Component.

- [ ] **Step 3: Build schedule config component**

Create `src/components/dashboard/schedule-config.tsx` — two time inputs (HH:MM), timezone display, reset button. Client Component.

- [ ] **Step 4: Build keyword autostart list**

Create `src/components/dashboard/keyword-autostart-list.tsx` — list of all user keywords with on/off switch per keyword. Client Component.

- [ ] **Step 5: Assemble autostart page**

Create `src/app/dashboard/autostart/page.tsx` — Server Component fetching silently_settings + keywords + autostart_disabled_keywords. Renders all config components.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: autostart page with Silently config, schedule, per-keyword control"
```

---

### Task 10: Notifications Page

**Files:**
- Create: `src/app/dashboard/notifications/page.tsx`, `loading.tsx`
- Create: `src/components/dashboard/pushover-config.tsx`, `notification-log.tsx`
- Create: `src/lib/actions/pushover.ts`

- [ ] **Step 1: Create pushover Server Actions**

Create `src/lib/actions/pushover.ts`:
- `setPushoverKey(key, priority)`, `removePushoverKey()`, `updatePriority(priority)`

- [ ] **Step 2: Build pushover config component**

Create `src/components/dashboard/pushover-config.tsx` — masked key input, priority radio group (Normal/High/Emergency), test notification button, remove button. Client Component.

- [ ] **Step 3: Build notification log component**

Create `src/components/dashboard/notification-log.tsx` — paginated table of notification_log entries. Filter by keyword (select), date range. Expandable rows showing message URL. Client Component for filters, data fetched via Server Action.

- [ ] **Step 4: Assemble notifications page with tabs**

Create `src/app/dashboard/notifications/page.tsx` — shadcn Tabs: "Pushover Settings" | "Notification Log". Server Component for initial data fetch.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: notifications page with Pushover config and activity log"
```

---

### Task 11: Settings Page

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`

- [ ] **Step 1: Build settings page**

Create `src/app/dashboard/settings/page.tsx`:
- User info section (avatar, username from profile — read-only)
- Pinger cooldown number input
- Danger zone: "Deactivate Pinger" button, "Remove All Keywords" button (both with confirmation Dialog)

Server Component for data, Client Component for interactive elements.

- [ ] **Step 2: Add danger zone Server Actions**

Add to `src/lib/actions/pinger.ts`:
- `removeAllKeywords()` — deletes all keywords for current user

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: settings page with user info and danger zone"
```

---

### Task 12: Admin Section

**Files:**
- Create: `src/app/dashboard/admin/layout.tsx`, `page.tsx`, `loading.tsx`
- Create: `src/app/dashboard/admin/users/page.tsx`, `[id]/page.tsx`
- Create: `src/app/dashboard/admin/admins/page.tsx`
- Create: `src/app/dashboard/admin/settings/page.tsx`
- Create: `src/app/dashboard/admin/import/page.tsx`
- Create: `src/components/dashboard/admin/*.tsx` (7 components)
- Create: `src/lib/actions/admin.ts`, `src/lib/actions/import.ts`

- [ ] **Step 1: Create admin layout with sub-navigation tabs**

Create `src/app/dashboard/admin/layout.tsx`:
- Calls `requireAdmin()` to guard access
- Renders shadcn Tabs for sub-navigation: Overview, Users, Admins, App Settings, Import

- [ ] **Step 2: Create admin Server Actions**

Create `src/lib/actions/admin.ts`:
- `grantAdmin(userId)` — validates user exists in profiles, sets is_admin=true
- `revokeAdmin(userId)` — sets is_admin=false, prevents self-revoke
- `updateAppSetting(key, value)` — updates app_settings row

- [ ] **Step 3: Build admin overview page**

Create `src/app/dashboard/admin/page.tsx` + components:
- `AdminStatCards` — system-wide counts (total users, keywords, active pingers, today's matches)
- `ActiveUsersTable` — users with pinger ON, their keyword count, silently status, last match time
- `SystemActivityFeed` — last 20 notification_log entries across all users

All Server Components with parallel data fetching.

- [ ] **Step 4: Build user management page**

Create `src/app/dashboard/admin/users/page.tsx` + `user-management-table.tsx`:
- Full user table with columns: avatar, username, keyword count, pinger status, pushover status, silently status, join date, admin badge
- Search + filter (by status) + sort
- Click row → navigate to `/dashboard/admin/users/[id]`

Server Component for data, Client Component for search/filter interactivity.

- [ ] **Step 5: Build user detail page**

Create `src/app/dashboard/admin/users/[id]/page.tsx` + `user-detail-sections.tsx`:
- Back button → `/dashboard/admin/users`
- User info section with grant/revoke admin button
- Pinger settings display (read-only)
- Full keyword table (read-only, with search)
- Pushover status (masked key, priority)
- Silently / autostart config (all fields read-only)
- Last 20 notification log entries

Server Component with parallel Promise.all() for all 7 queries (spec section 4.7.3).

- [ ] **Step 6: Build admin management page**

Create `src/app/dashboard/admin/admins/page.tsx` + `manage-admins.tsx`:
- "Add Admin" form: Discord User ID input + add button
- Validation: user must exist in profiles table
- Current admins table with remove buttons
- Cannot remove self (disabled + tooltip)

- [ ] **Step 7: Build app settings page**

Create `src/app/dashboard/admin/settings/page.tsx` + `app-settings-form.tsx`:
- Pushover Application Key (masked, show/edit)
- Silently API Key (masked, show/edit)
- Guild ID display

- [ ] **Step 8: Build data import page**

Create `src/app/dashboard/admin/import/page.tsx` + import components:
- `import-wizard.tsx` — 3-step wizard (Upload → Preview → Import)
- `import-file-upload.tsx` — file input per JSON type (8 files)
- `import-preview-table.tsx` — parsed data summary

Create `src/lib/actions/import.ts`:
- `parseImportFiles(formData)` — parses all JSON files, returns preview summary
- `executeImport(formData)` — full import logic per spec section 4.7.6:
  - Create placeholder profiles for all user IDs
  - Import keywords (preserve UUIDs)
  - Import pinger settings
  - Import cooldown durations
  - Import pushover keys
  - Import silently keys + merge min_stock + schedule
  - Import autostart disabled keywords
  - All upserts for idempotency

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: admin section with user management, import wizard, app settings"
```

---

### Task 13: Final Polish + Deploy

**Files:**
- Modify: various
- Create: `vercel.json` (if needed)

- [ ] **Step 1: Add loading.tsx skeletons for all route segments**

Ensure every dashboard route has a `loading.tsx` with appropriate Skeleton layout.

- [ ] **Step 2: Mobile responsiveness pass**

Verify all pages work on mobile:
- Sidebar → bottom nav (< 768px)
- Tables → horizontal scroll or card view
- Forms → full width
- Landing page → stacked layout

- [ ] **Step 3: Connect Vercel**

```bash
npx vercel link
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
npx vercel env add SUPABASE_SERVICE_ROLE_KEY
```

- [ ] **Step 4: Deploy to Vercel**

Use `mcp__7fb21ffd...deploy_to_vercel` or:
```bash
git push origin main
```
(Vercel auto-deploys on push if linked to GitHub)

- [ ] **Step 5: Set Discord OAuth redirect URL to production domain**

Update Supabase Dashboard → Auth → Discord provider → Redirect URL to production Vercel URL.

- [ ] **Step 6: Verify production deployment**

- Landing page loads, animations work
- Discord OAuth login flows to dashboard
- All dashboard pages render with data
- Admin section accessible only for admin users
- Import wizard works

- [ ] **Step 7: Final commit**

```bash
git add -A && git commit -m "feat: production deploy with Vercel"
```
