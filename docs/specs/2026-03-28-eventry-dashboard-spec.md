# Eventry Dashboard — Technical Specification

**Date:** 2026-03-28
**Status:** Final
**Based on:** PRD.md + brainstorming session
**Design approach:** Original design crafted at build time via `frontend-design` skill, `21st.dev` MCP, and `shadcn/ui` theming — no external reference

---

## 1. Design System

### 1.1 Color Palette

```
Background:
  --bg-root:        #06060a        /* Deepest background */
  --bg-primary:     #0a0a12        /* Page background */
  --bg-secondary:   #0f0f18        /* Card/sidebar background */
  --bg-tertiary:    #141420        /* Elevated surfaces */
  --bg-hover:       rgba(192, 192, 192, 0.04)
  --bg-active:      rgba(192, 192, 192, 0.08)

Borders:
  --border-subtle:  rgba(192, 192, 192, 0.06)
  --border-default: rgba(192, 192, 192, 0.10)
  --border-strong:  rgba(192, 192, 192, 0.16)

Text:
  --text-primary:   #e8e8ec        /* Headings, primary content */
  --text-secondary: #9ca3af        /* Descriptions, labels */
  --text-tertiary:  #6b7280        /* Disabled, hints */
  --text-accent:    #c0c0c0        /* Chrome/silver accent text */

Accent (Chrome/Silver Metallic):
  --accent-start:   #8a8a8a        /* Gradient start */
  --accent-end:     #d4d4d4        /* Gradient end */
  --accent-glow:    rgba(192, 192, 192, 0.12)

Semantic:
  --success:        #4ade80
  --warning:        #fbbf24
  --error:          #f87171
  --info:           #7f8fa6
```

### 1.2 Typography

```
Font: Inter (variable weight, loaded via next/font/google — zero layout shift)
Fallback: system-ui, -apple-system, sans-serif

Scale:
  Hero heading:      48px / 700 / -0.02em tracking
  Page heading:      24px / 600 / -0.01em
  Section heading:   16px / 600
  Body:              14px / 400
  Small/Label:       12px / 500 / uppercase + 0.05em tracking
  Mono (data):       JetBrains Mono, 13px / 400
```

### 1.3 Component Primitives

All components from **shadcn/ui** with custom dark theme overrides. No custom component library. Key components:

| Component | Usage |
|-----------|-------|
| `Button` | Primary (silver gradient), secondary (ghost), destructive |
| `Card` | Glass card with `--bg-secondary` + `--border-subtle` |
| `Input` | Dark bg, subtle border, focus ring in silver |
| `Switch` | For toggles (pinger on/off, autostart) |
| `Select` | Dropdowns (priority, restriction type) |
| `Table` | Keyword list, notification log, admin user list |
| `Badge` | Status indicators (active/inactive, priority levels) |
| `Dialog` | Confirmations, add keyword modal |
| `Tooltip` | Sidebar icon labels, info hints |
| `Tabs` | Sub-navigation within pages |
| `Skeleton` | Loading states (never shown if perf strategy works) |

### 1.4 Design Approach

**The design will NOT follow a pre-defined reference.** Instead, it will be crafted at implementation time using the `frontend-design` skill, `21st.dev` component library (MCP), and `shadcn/ui` theming tools to create a distinctive, original design.

**Design constraints (what stays fixed):**
- Dark-mode-first with the Chrome/Silver Metallic palette defined above
- Collapsed icon sidebar (56px) layout as decided
- Hero animation + scroll reveals on landing page (Framer Motion)
- Inter font family

**Design freedom (decided at build time via MCPs/plugins):**
- Card styles, border treatments, surface effects
- Button designs, hover states, micro-interactions
- Landing page visual composition and animation choreography
- Dashboard component styling and visual hierarchy
- Spacing system, border-radius scale, shadow/glow usage
- Overall aesthetic and personality

**Anti-AI-Slop rules still apply:**
1. No gratuitous gradients everywhere — use sparingly with purpose
2. No uniform rounded-3xl on everything
3. No random decorative blur blobs
4. No icon soup — icons are functional
5. Real data density over empty inspirational states
6. Borders over drop shadows as default

---

## 2. Performance Architecture — Zero Loading Times

### 2.1 Strategy

| Technique | Where | Effect |
|-----------|-------|--------|
| React Server Components | All dashboard pages | Zero client JS for data-fetching components |
| Streaming SSR | Dashboard layout | Shell renders instantly, data streams in |
| `loading.tsx` with Skeleton | Each route segment | Instant perceived navigation |
| Parallel data fetching | Server components | `Promise.all()` for independent queries |
| Optimistic updates | All mutations (toggles, CRUD) | UI updates before server confirms |
| `next/link` prefetching | Sidebar navigation | Pages pre-loaded on hover |
| Static generation | Landing page | Built at deploy time, served from CDN edge |
| Route groups | `(landing)` vs `dashboard` | Landing page JS never loads in dashboard |
| `next/font` | Inter + JetBrains Mono | Font loaded at build time, zero CLS |
| Image optimization | Logo, avatars | `next/image` with `priority` on above-fold |

### 2.2 Data Fetching Pattern

```typescript
// Server Component — runs on server, zero client JS
async function DashboardPage() {
  const supabase = await createServerClient()

  // Parallel fetch — all queries run simultaneously
  const [keywords, settings, recentLog] = await Promise.all([
    supabase.from('keywords').select('*').eq('user_id', userId),
    supabase.from('pinger_settings').select('*').eq('user_id', userId).single(),
    supabase.from('notification_log').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(10),
  ])

  return <DashboardView keywords={keywords} settings={settings} log={recentLog} />
}
```

### 2.3 Mutation Pattern (Optimistic)

```typescript
// Client Component — only for interactive elements
function PingerToggle({ isActive }: { isActive: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(isActive)

  async function toggle() {
    setOptimistic(!optimistic)  // Instant UI update
    await updatePingerStatus(!optimistic)  // Server Action
  }

  return <Switch checked={optimistic} onCheckedChange={toggle} />
}
```

### 2.4 Supabase Connection

- **Server Components:** `@supabase/ssr` with `createServerClient()` — cookie-based auth
- **Client Components:** `createBrowserClient()` — only for real-time subscriptions (v2)
- **Bot:** `supabase-py` with service role key — direct DB access, bypasses RLS
- **Connection pooling:** Supabase's built-in pgBouncer via `.env` pooler URL

---

## 3. Landing Page

### 3.1 Structure

```
[Navbar]           — Fixed, transparent -> solid on scroll
[Hero Section]     — Full viewport, animated
[Features Grid]    — 3 feature cards, scroll-reveal
[How It Works]     — 3-step flow, scroll-reveal
[CTA Section]      — Final call-to-action
[Footer]           — Minimal
```

### 3.2 Navbar

- **Left:** Eventry logo (metallic E) + "Eventry" text
- **Right:** "Login with Discord" button (silver gradient)
- **Behavior:** `backdrop-blur-md` + `bg-opacity` transition from transparent to solid on scroll
- **Height:** 64px, `position: sticky`, `z-50`

### 3.3 Hero Section

- **Layout:** Centered, full viewport height (`100vh - 64px`)
- **Content:**
  - Intro badge/pill
  - Headline with gradient accent
  - Subheading
  - CTA buttons (primary + secondary)
- **Background:** The Eventry "E" logo rendered as a large, semi-transparent animated element behind the hero content. Subtle continuous animation (slow rotation, pulse, or parallax drift). Uses the logo from `public/logo.png` as an `<Image>` with low opacity (`0.04-0.08`) and CSS/Framer Motion animation. Must not distract from foreground content — atmospheric only.
- **Animations (Framer Motion):**
  - Logo background: slow ambient animation on load (scale pulse, gentle rotation, or floating drift)
  - Staggered entrance animations for all foreground elements
- **Visual design:** Determined at build time via `frontend-design` skill — no rigid reference. Must feel premium and distinctive.

### 3.4 Features Grid

- **Layout:** 3 columns on desktop, 1 column on mobile
- **Content:** 3 feature cards — Keyword Monitoring, Push Notifications, Auto-Start Tasks
- **Animation:** Scroll-reveal with stagger
- **Card design:** Determined at build time via `frontend-design` skill and `21st.dev` component MCP

### 3.5 How It Works

- **Layout:** 3 steps, horizontal on desktop, vertical on mobile
- **Steps:** Set Keywords → Get Notified → Auto-Start
- **Animation:** Sequential reveal on scroll

### 3.6 CTA Section

- **Content:** Final call-to-action heading + button
- **Animation:** Fade-in on scroll

### 3.7 Footer

- **Content:** "Built by Eventry" + current year
- **Minimal:** Single line, `--text-tertiary`

### 3.8 Animation Library

**Framer Motion** — chosen over CSS animations for:
- Scroll-triggered reveals via `useInView`
- Staggered children via `staggerChildren`
- `whileHover` / `whileTap` for buttons
- Layout animations for page transitions (dashboard)

```typescript
// Reusable scroll-reveal wrapper
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
```

---

## 4. Dashboard

### 4.1 Layout

```
┌──────┬────────────────────────────────┐
│ Icon │  Top Bar (page title + user)   │
│ Side │────────────────────────────────│
│ bar  │                                │
│      │  Page Content                  │
│ 56px │  (Server Component)            │
│      │                                │
│      │                                │
│      │                                │
└──────┴────────────────────────────────┘
```

**Sidebar (56px wide, collapsed):**
- Logo (E icon) at top
- Divider
- Navigation icons: Dashboard, Keywords, Autostart, Notifications, Settings
- Admin icon (only visible for admins, at bottom before avatar)
- User avatar at bottom (click -> dropdown: Profile, Logout)
- Hover on any icon -> Tooltip with label
- Active page: icon has `--bg-active` background + `--text-primary` color
- **Mobile (< 768px):** Sidebar becomes a fixed bottom navigation bar (5 icons max), admin icon in "more" menu

**Top Bar:**
- Page title (left)
- Quick status badges (right): Pinger active/inactive, Silently active/inactive
- User context preserved from sidebar

### 4.2 Dashboard Home (`/dashboard`)

**Server Component.** Parallel-fetches all user data.

```
┌─────────────────────────────────────────┐
│ Dashboard                    [badges]   │
├──────────┬──────────┬──────────┬────────┤
│ Keywords │ Matches  │ Pinger   │ Today  │
│   24     │  142     │ ● Active │  12    │
├──────────┴──────────┴──────────┴────────┤
│ Quick Settings                          │
│ ┌─────────────┐ ┌─────────────────────┐ │
│ │ Pinger [ON] │ │ Autostart [ON]      │ │
│ │ Cooldown: 5m│ │ Min Stock: 15       │ │
│ │             │ │ Schedule: 14-23 CEST│ │
│ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────┤
│ Recent Activity                         │
│ nike dunk    │ #monitors │ DM+Push │ 2m │
│ jordan 4     │ #restocks │ DM      │15m │
│ yeezy slide  │ #drops    │ DM+QT   │ 1h │
└─────────────────────────────────────────┘
```

**Components:**
- `StatCards` — 4 metric cards in a row (Server Component)
- `QuickSettings` — Pinger + Autostart toggles (Client Component for switches)
- `RecentActivity` — Last 10 notifications (Server Component, streamed)

### 4.3 Keywords Page (`/dashboard/keywords`)

```
┌─────────────────────────────────────────┐
│ Keywords                  [+ Add]       │
├─────────────────────────────────────────┤
│ Search: [____________]  Filter: [All ▾] │
├─────────────────────────────────────────┤
│ ☐ │ Keyword    │ Name      │ Scope    │ │
│───│────────────│───────────│──────────│ │
│ ☐ │ nike dunk  │ Nike Dunk │ Global   │ │
│ ☐ │ jordan 4   │ J4 Retro  │ #restock │ │
│ ☐ │ yeezy      │ —         │ Cat: EU  │ │
├─────────────────────────────────────────┤
│ [Delete Selected]     Showing 1-20 / 24 │
└─────────────────────────────────────────┘
```

**Add Keyword Dialog (shadcn Dialog):**
- Keyword input (supports comma-separated batch)
- Internal name (optional)
- Scope selector: Global / Specific Channels / Category
  - Channel IDs input (if channels selected)
  - Category ID input (if category selected)
- Max price input (optional, number)
- Autostart toggle for this keyword (default: on)

**Table features:**
- Search/filter client-side (data already loaded)
- Sort by keyword, name, created date
- Bulk select + delete
- Inline edit for internal name (click to edit)
- Autostart status badge per keyword

### 4.4 Autostart Page (`/dashboard/autostart`)

```
┌─────────────────────────────────────────┐
│ Autostart                               │
├─────────────────────────────────────────┤
│ Silently Integration                    │
│ ┌─────────────────────────────────────┐ │
│ │ API Key: [••••••••••]  [Show/Hide] │ │
│ │ Status: ● Connected      [Toggle]  │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Filters                                 │
│ ┌─────────────────────────────────────┐ │
│ │ Min Stock:  [15    ]               │ │
│ │ Max Price per Keyword (see below)   │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Schedule                                │
│ ┌─────────────────────────────────────┐ │
│ │ Active Window: [14:00] to [23:00]  │ │
│ │ Timezone: CEST                      │ │
│ │ Type: Daytime                       │ │
│ │                    [Reset to 24/7]  │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ Keyword Autostart Control               │
│ ┌──────────────┬──────────┐             │
│ │ nike dunk    │ [ON]     │             │
│ │ jordan 4     │ [OFF] ⛔ │             │
│ │ yeezy slide  │ [ON]     │             │
│ └──────────────┴──────────┘             │
└─────────────────────────────────────────┘
```

**Components:**
- `SilentlyConfig` — API key input (masked), connection toggle (Client Component)
- `AutostartFilters` — Min stock number input (Client Component)
- `ScheduleConfig` — Two time pickers + reset button (Client Component)
- `KeywordAutostartList` — Toggle per keyword (Client Component, reads keywords via prop)

### 4.5 Notifications Page (`/dashboard/notifications`)

**Tabs:** Pushover Settings | Notification Log

**Pushover Settings Tab:**
- User key input (masked)
- Priority selector: Radio group (Normal / High / Emergency)
- Test notification button
- Remove key button (destructive)

**Notification Log Tab:**
- Table: Timestamp, Keyword, Channel, Actions (DM/Push/QT icons), Stock
- Filter by keyword (select), date range (date picker)
- Pagination (20 per page)
- Click row -> expand with full details (message URL link)

### 4.6 Settings Page (`/dashboard/settings`)

- Discord account info (avatar, username — read-only from OAuth)
- Pinger cooldown setting (number input, minutes)
- Danger zone: Deactivate pinger, remove all keywords (confirmation dialog)

### 4.7 Admin Section (`/dashboard/admin/*`)

**Only visible to users where `profiles.is_admin = true`.** Full management center with sub-navigation.

**Admin Sub-Navigation (Tabs at top of admin area):**

| Tab | Route | Description |
|-----|-------|-------------|
| Overview | `/dashboard/admin` | System stats + activity feed |
| Users | `/dashboard/admin/users` | Full user list with all details |
| User Detail | `/dashboard/admin/users/[id]` | Single user deep-dive (full page) |
| Admins | `/dashboard/admin/admins` | Admin assignment + list |
| App Settings | `/dashboard/admin/settings` | Global keys + config |
| Data Import | `/dashboard/admin/import` | Import bot JSON files |

#### 4.7.1 Admin Overview (`/dashboard/admin`)

```
┌─────────────────────────────────────────────┐
│ Admin Overview                              │
├───────────┬───────────┬───────────┬─────────┤
│ Total     │ Total     │ Active    │ Matches │
│ Users     │ Keywords  │ Pingers   │ Today   │
│   12      │   186     │   8       │   63    │
├───────────┴───────────┴───────────┴─────────┤
│ Active Users (Pinger ON)                    │
│ ┌─────────┬──────┬──────────┬─────────────┐ │
│ │ User    │ KWs  │ Silently │ Last Match  │ │
│ │ Basti   │ 24   │ ● ON     │ 2 min ago   │ │
│ │ Max     │ 18   │ ● ON     │ 15 min ago  │ │
│ │ Leon    │ 31   │ ● OFF    │ 1h ago      │ │
│ └─────────┴──────┴──────────┴─────────────┘ │
├─────────────────────────────────────────────┤
│ Recent System Activity (all users)          │
│ Basti    │ nike dunk  │ DM+Push+QT │ 2m    │
│ Max      │ jordan 4   │ DM+Push    │ 15m   │
│ Leon     │ yeezy      │ DM         │ 1h    │
│ Basti    │ new balance│ DM+QT      │ 2h    │
└─────────────────────────────────────────────┘
```

**Components:**
- `AdminStatCards` — 4 system-wide metrics (Server Component)
- `ActiveUsersTable` — Users with pinger ON, sorted by last activity (Server Component)
- `SystemActivityFeed` — Last 20 notifications across ALL users (Server Component, streamed)

#### 4.7.2 User Management (`/dashboard/admin/users`)

```
┌─────────────────────────────────────────────────────────────┐
│ Users                                                       │
├─────────────────────────────────────────────────────────────┤
│ Search: [____________]  Filter: [All ▾] [Pinger ▾] [Sort ▾]│
├─────────────────────────────────────────────────────────────┤
│ Avatar │ Username │ KWs │ Pinger │ Pushover│ Silently│Joined│
│────────│──────────│─────│────────│─────────│─────────│──────│
│ 🟢     │ Basti    │ 24  │ Active │ ● P2    │ ● ON    │Jan 12│
│ 🔴     │ Max      │ 18  │ Off    │ ● P1    │ ● OFF   │Feb 03│
│ 🟢     │ Leon     │ 31  │ Active │ —       │ ● ON    │Mar 01│
│ 🟢     │ Sarah    │  9  │ Active │ ● P0    │ —       │Mar 15│
├─────────────────────────────────────────────────────────────┤
│ Click any row → opens full user detail page                 │
│                                        Showing 1-20 of 12  │
└─────────────────────────────────────────────────────────────┘
```

**Table columns:**
- Avatar + online indicator (green dot if pinger active)
- Discord username
- Keyword count
- Pinger status (Active/Off badge)
- Pushover status (configured + priority level, or "—")
- Silently status (ON/OFF, or "—" if no key)
- Join date
- Admin badge (if admin)

**Filters:**
- Search by username
- Filter by: All / Pinger Active / Pinger Off / Has Pushover / Has Silently / Admins Only
- Sort by: Username / Keyword Count / Join Date / Last Activity

#### 4.7.3 User Detail Page (`/dashboard/admin/users/[id]`)

**Full-page view of a single user's complete configuration.** Not a dialog — a dedicated page with back navigation.

```
┌─────────────────────────────────────────────────────┐
│ ← Back to Users          Basti         [Admin 🛡️]  │
├─────────────────────────────────────────────────────┤
│ User Info                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Avatar  Basti#1234                              │ │
│ │ Discord ID: 123456789012345678                  │ │
│ │ Joined: January 12, 2026                        │ │
│ │ Admin: Yes [Revoke]   /   No [Grant Admin]      │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Pinger Settings                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Status:   ● Active                              │ │
│ │ Cooldown: 5 minutes                             │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Keywords (24)                              [Search] │
│ ┌──────────────┬───────────┬─────────┬───────────┐ │
│ │ Keyword      │ Name      │ Scope   │ Autostart │ │
│ │ nike dunk    │ Nike Dunk │ Global  │ ● ON      │ │
│ │ jordan 4     │ J4 Retro  │ #restock│ ⛔ OFF    │ │
│ │ yeezy slide  │ —         │ Cat: EU │ ● ON      │ │
│ │ new balance  │ NB 550    │ Global  │ ● ON      │ │
│ │ ...          │           │         │           │ │
│ └──────────────┴───────────┴─────────┴───────────┘ │
├─────────────────────────────────────────────────────┤
│ Pushover                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Status:   ● Configured                          │ │
│ │ Key:      ••••••••a7d3                           │ │
│ │ Priority: 2 (Emergency)                         │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Silently / Autostart                                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Status:    ● Active                              │ │
│ │ Key:       ••••••••f9d2                           │ │
│ │ Min Stock: 15                                    │ │
│ │ Schedule:  14:00 – 23:00 CEST (daytime)         │ │
│ │ Disabled KWs: jordan 4                          │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ Recent Notifications (last 20)                      │
│ ┌──────────────┬──────────┬────────────┬──────────┐ │
│ │ Time         │ Keyword  │ Channel    │ Actions  │ │
│ │ 2m ago       │ nike dunk│ #monitors  │ DM+P+QT  │ │
│ │ 15m ago      │ jordan 4 │ #restocks  │ DM+Push  │ │
│ │ 1h ago       │ yeezy    │ #drops     │ DM       │ │
│ └──────────────┴──────────┴────────────┴──────────┘ │
└─────────────────────────────────────────────────────┘
```

**Sections on user detail page:**
1. **User Info** — Avatar, username, Discord ID, join date, admin status with grant/revoke button
2. **Pinger Settings** — Active/inactive, cooldown minutes (read-only display)
3. **Keywords** — Full keyword table with search, showing: keyword, internal name, scope, max price, autostart status
4. **Pushover** — Configuration status, masked key (last 4 chars visible), priority level
5. **Silently / Autostart** — Active status, masked key, min stock, schedule window, disabled keywords list
6. **Recent Notifications** — Last 20 notification log entries for this user with timestamp, keyword, channel, actions taken

**All data is read-only for the admin.** Admin cannot edit user settings — only view them. Exception: admin can grant/revoke admin status.

**Data fetching:** Single parallel fetch on server:
```typescript
async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient()
  const userId = params.id

  const [profile, keywords, pinger, pushover, silently, disabledKws, recentLog] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('keywords').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('pinger_settings').select('*').eq('user_id', userId).single(),
      supabase.from('pushover_settings').select('*').eq('user_id', userId).single(),
      supabase.from('silently_settings').select('*').eq('user_id', userId).single(),
      supabase.from('autostart_disabled_keywords').select('*').eq('user_id', userId),
      supabase.from('notification_log').select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(20),
    ])

  // ... render all sections
}
```

#### 4.7.4 Admin Management (`/dashboard/admin/admins`)

```
┌─────────────────────────────────────────────┐
│ Manage Admins                               │
├─────────────────────────────────────────────┤
│ Add Admin                                   │
│ ┌─────────────────────────────────────────┐ │
│ │ Discord User ID: [________________] [+]│ │
│ │ (User must have logged in at least once)│ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Current Admins                              │
│ ┌────────┬────────────┬───────────┬───────┐ │
│ │ Avatar │ Username   │ Discord ID│       │ │
│ │ ●      │ Basti      │ 12345...  │[Remove│ │
│ │ ●      │ Max        │ 98765...  │[Remove│ │
│ └────────┴────────────┴───────────┴───────┘ │
└─────────────────────────────────────────────┘
```

**Admin Assignment Flow:**
1. Admin enters Discord User ID in input field
2. System validates the ID exists in `profiles` table (user must have logged in at least once)
3. If not found: error message "User has not logged in yet"
4. If found: sets `is_admin = true` on that profile, optimistic UI update
5. Admin appears in "Current Admins" table
6. Remove button: confirmation dialog, then sets `is_admin = false`
7. Cannot remove yourself as admin (button disabled + tooltip)

#### 4.7.5 App Settings (`/dashboard/admin/settings`)

```
┌─────────────────────────────────────────────┐
│ App Settings                                │
├─────────────────────────────────────────────┤
│ Pushover Application Key                    │
│ ┌─────────────────────────────────────────┐ │
│ │ Current: ••••••••••qd  [Show] [Edit]   │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Silently API Key                            │
│ ┌─────────────────────────────────────────┐ │
│ │ Current: ••••••••••d3  [Show] [Edit]   │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│ Discord Server                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Guild ID: 1341267240540180542           │ │
│ │ Target Categories: 4 configured         │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### 4.7.6 Data Import (`/dashboard/admin/import`)

**Purpose:** One-time migration of existing bot JSON files into Supabase so users keep all their keywords, settings, and configurations.

```
┌───────────────────────────────────────────────────────┐
│ Import Bot Data                                       │
├───────────────────────────────────────────────────────┤
│ Import all user data from the existing Discord bot    │
│ JSON files. Users keep their keywords and settings.   │
│                                                       │
│ ⚠ This creates placeholder profiles for users who     │
│   haven't logged in yet. Their data will be linked    │
│   automatically on first Discord OAuth login.         │
├───────────────────────────────────────────────────────┤
│ Step 1: Upload JSON Files                             │
│ ┌───────────────────────────────────────────────────┐ │
│ │ keywords.json         [Choose File] ✅ loaded     │ │
│ │ pinger_status.json    [Choose File] ✅ loaded     │ │
│ │ cooldowns.json        [Choose File] ✅ loaded     │ │
│ │ pushover_keys.json    [Choose File] ○ optional    │ │
│ │ silently_keys.json    [Choose File] ○ optional    │ │
│ │ min_stock.json        [Choose File] ○ optional    │ │
│ │ autostart_schedule.json [Choose File] ○ optional  │ │
│ │ autostart_disabled_keywords.json [Choose] ○ opt.  │ │
│ └───────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────┤
│ Step 2: Preview                          [Parse All]  │
│ ┌───────────────────────────────────────────────────┐ │
│ │ Found:                                            │ │
│ │  • 12 users                                       │ │
│ │  • 186 keywords total                             │ │
│ │  • 8 pinger configs                               │ │
│ │  • 6 pushover configs                             │ │
│ │  • 5 silently configs                             │ │
│ │  • 3 autostart schedules                          │ │
│ │  • 2 users with disabled keywords                 │ │
│ │                                                   │ │
│ │ ┌─────────┬──────┬────────┬─────────┬──────────┐  │ │
│ │ │ User ID │ KWs  │ Pinger │ Pushover│ Silently │  │ │
│ │ │ 12345.. │ 24   │ Active │ P2      │ Active   │  │ │
│ │ │ 98765.. │ 18   │ Off    │ P1      │ Off      │  │ │
│ │ │ ...     │      │        │         │          │  │ │
│ │ └─────────┴──────┴────────┴─────────┴──────────┘  │ │
│ └───────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────┤
│ Step 3: Import                                        │
│ ┌───────────────────────────────────────────────────┐ │
│ │ [⚠ This will overwrite existing data] [Import All]│ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Import Progress:                                      │
│ ████████████████████░░░░ 78% — Importing keywords...  │
│                                                       │
│ ✅ 12 profiles created                                │
│ ✅ 186 keywords imported                              │
│ ✅ 8 pinger settings imported                         │
│ ⏳ Importing pushover settings...                     │
└───────────────────────────────────────────────────────┘
```

**JSON Format Reference (from existing bot):**

```typescript
// keywords.json
{
  "discord_user_id": [
    {
      "id": "uuid-string",
      "keyword": "nike dunk",
      "category_id": "1344768296372797614",     // optional
      "channel_ids": ["1341277169191489628"],    // optional
      "internal_name": "Nike Dunk Low"           // optional
    }
  ]
}

// pinger_status.json
{ "discord_user_id": true }

// cooldowns.json
{ "duration": { "discord_user_id": 5 }, "active": {} }

// pushover_keys.json
{ "discord_user_id": { "key": "user_key_here", "priority": 0 } }

// silently_keys.json
{ "discord_user_id": { "key": "user_key_here", "active": true } }

// min_stock.json
{ "discord_user_id": 15 }

// autostart_schedule.json
{ "discord_user_id": { "start": "14.00", "end": "23.00" } }

// autostart_disabled_keywords.json
{ "discord_user_id": ["nike dunk", "jordan 4"] }
```

**Import Logic (Server Action):**

```typescript
// src/lib/actions/import.ts
'use server'

export async function importBotData(formData: FormData) {
  const supabase = await createServerClient()

  // 1. Parse all uploaded JSON files
  const keywordsFile = formData.get('keywords') as File | null
  const pingerFile = formData.get('pinger_status') as File | null
  // ... etc for all 8 files

  // 2. Extract all unique user IDs across all files
  const allUserIds = new Set<string>()
  // collect from each parsed file...

  // 3. Create placeholder profiles for users who haven't logged in
  for (const userId of allUserIds) {
    await supabase.from('profiles').upsert({
      id: userId,
      discord_username: `User ${userId.slice(-4)}`,  // placeholder
      is_admin: false,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  // 4. Import keywords (with existing UUIDs preserved)
  if (keywordsJson) {
    for (const [userId, keywords] of Object.entries(keywordsJson)) {
      const rows = keywords.map(kw => ({
        id: kw.id,                    // preserve original UUID
        user_id: userId,
        keyword: kw.keyword,
        internal_name: kw.internal_name || null,
        restriction_type: kw.category_id ? 'category'
                        : kw.channel_ids ? 'channels'
                        : 'global',
        category_id: kw.category_id || null,
        channel_ids: kw.channel_ids || null,
        max_price: null,
      }))
      await supabase.from('keywords').upsert(rows, { onConflict: 'id' })
    }
  }

  // 5. Import pinger settings
  // 6. Import cooldown durations
  // 7. Import pushover keys
  // 8. Import silently keys + active status
  // 9. Import min_stock into silently_settings
  // 10. Import autostart schedules into silently_settings
  // 11. Import autostart disabled keywords
  //
  // Each step: upsert to handle re-imports safely
}
```

**Key behaviors:**
- **Placeholder profiles:** Users who haven't logged in yet get a placeholder profile with their Discord ID. On first OAuth login, the profile is updated with their real username and avatar.
- **Idempotent:** Import can be run multiple times safely (upsert with `onConflict`). Re-importing overwrites existing data.
- **Preserves keyword UUIDs:** The bot's existing keyword IDs are kept so active cooldowns referencing those IDs still work.
- **Schedule format conversion:** Bot uses `"14.00"` format, DB uses `TIME` type. Import converts `"14.00"` → `14:00:00`.
- **Merged settings:** `min_stock`, `autostart_schedule`, and `silently_keys` all map to the single `silently_settings` table. Import merges them.

**Admin route + component files:**

Added to project structure:
```
│   │   │       ├── import/
│   │   │           └── page.tsx           # Data import wizard
```

Added to components:
```
│   │   │   ├── admin/
│   │   │   │   ├── import-wizard.tsx          # Multi-step import UI
│   │   │   │   ├── import-file-upload.tsx      # File upload row per JSON
│   │   │   │   ├── import-preview-table.tsx    # Preview parsed data
```

---

## 5. Database Schema

### 5.1 Complete SQL

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,                    -- Discord user ID
  discord_username TEXT NOT NULL,
  discord_discriminator TEXT,
  discord_avatar TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KEYWORDS
-- ============================================================
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  internal_name TEXT,
  restriction_type TEXT NOT NULL DEFAULT 'global'
    CHECK (restriction_type IN ('global', 'channels', 'category')),
  channel_ids TEXT[],
  category_id TEXT,
  max_price DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_keywords_user_id ON keywords(user_id);
CREATE INDEX idx_keywords_keyword ON keywords(keyword);

-- Prevent duplicate keyword + same restriction for same user
CREATE UNIQUE INDEX idx_keywords_unique ON keywords(
  user_id, keyword,
  COALESCE(restriction_type, 'global'),
  COALESCE(category_id, ''),
  COALESCE(array_to_string(channel_ids, ','), '')
);

-- ============================================================
-- PINGER SETTINGS
-- ============================================================
CREATE TABLE pinger_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  cooldown_minutes INTEGER NOT NULL DEFAULT 0 CHECK (cooldown_minutes >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ACTIVE COOLDOWNS (managed by bot)
-- ============================================================
CREATE TABLE active_cooldowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cooldowns_user ON active_cooldowns(user_id);
CREATE INDEX idx_cooldowns_expires ON active_cooldowns(expires_at);

-- ============================================================
-- PUSHOVER SETTINGS
-- ============================================================
CREATE TABLE pushover_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SILENTLY SETTINGS
-- ============================================================
CREATE TABLE silently_settings (
  user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  user_key TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  min_stock INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  schedule_start TIME,
  schedule_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AUTOSTART DISABLED KEYWORDS
-- ============================================================
CREATE TABLE autostart_disabled_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, keyword)
);

CREATE INDEX idx_autostart_disabled_user ON autostart_disabled_keywords(user_id);

-- ============================================================
-- NOTIFICATION LOG (written by bot, read-only for users)
-- ============================================================
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
  keyword_text TEXT NOT NULL,
  channel_id TEXT,
  channel_name TEXT,
  message_url TEXT,
  dm_sent BOOLEAN NOT NULL DEFAULT false,
  pushover_sent BOOLEAN NOT NULL DEFAULT false,
  silently_triggered BOOLEAN NOT NULL DEFAULT false,
  silently_success BOOLEAN,
  stock_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);

-- ============================================================
-- APP SETTINGS (admin-managed globals)
-- ============================================================
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Initial settings
INSERT INTO app_settings (key, value) VALUES
  ('pushover_app_key', ''),
  ('silently_api_key', ''),
  ('guild_id', '');

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_keywords_updated_at BEFORE UPDATE ON keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pinger_updated_at BEFORE UPDATE ON pinger_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_pushover_updated_at BEFORE UPDATE ON pushover_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_silently_updated_at BEFORE UPDATE ON silently_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 5.2 Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinger_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE pushover_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE silently_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE autostart_disabled_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Helper: extract Discord user ID from Supabase auth
CREATE OR REPLACE FUNCTION auth_discord_id()
RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'provider_id')::TEXT;
$$ LANGUAGE sql STABLE;

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth_discord_id() AND is_admin = true
  );
$$ LANGUAGE sql STABLE;

-- PROFILES
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (id = auth_discord_id());
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth_discord_id());
CREATE POLICY "Admins read all profiles" ON profiles
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins update admin status" ON profiles
  FOR UPDATE USING (is_admin());

-- KEYWORDS
CREATE POLICY "Users CRUD own keywords" ON keywords
  FOR ALL USING (user_id = auth_discord_id());
CREATE POLICY "Admins read all keywords" ON keywords
  FOR SELECT USING (is_admin());

-- PINGER SETTINGS
CREATE POLICY "Users CRUD own pinger" ON pinger_settings
  FOR ALL USING (user_id = auth_discord_id());

-- ACTIVE COOLDOWNS
CREATE POLICY "Users read own cooldowns" ON active_cooldowns
  FOR SELECT USING (user_id = auth_discord_id());

-- PUSHOVER SETTINGS
CREATE POLICY "Users CRUD own pushover" ON pushover_settings
  FOR ALL USING (user_id = auth_discord_id());

-- SILENTLY SETTINGS
CREATE POLICY "Users CRUD own silently" ON silently_settings
  FOR ALL USING (user_id = auth_discord_id());

-- AUTOSTART DISABLED KEYWORDS
CREATE POLICY "Users CRUD own disabled kws" ON autostart_disabled_keywords
  FOR ALL USING (user_id = auth_discord_id());

-- NOTIFICATION LOG
CREATE POLICY "Users read own logs" ON notification_log
  FOR SELECT USING (user_id = auth_discord_id());
CREATE POLICY "Admins read all logs" ON notification_log
  FOR SELECT USING (is_admin());

-- APP SETTINGS
CREATE POLICY "All authenticated read app settings" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins write app settings" ON app_settings
  FOR UPDATE USING (is_admin());
```

---

## 6. Authentication Flow

### 6.1 Discord OAuth via Supabase

```
1. User clicks "Login with Discord"
2. Redirect to Supabase Auth → Discord OAuth consent
3. Discord returns auth code to Supabase
4. Supabase creates session + JWT with Discord metadata
5. Redirect to /auth/callback
6. Callback route:
   a. Extract Discord user ID, username, avatar from JWT metadata
   b. UPSERT into profiles table
   c. Initialize default rows in pinger_settings, silently_settings (if first login)
   d. Redirect to /dashboard
```

### 6.2 Auth Callback Implementation

```typescript
// src/app/auth/callback/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.exchangeCodeForSession(code!)

  // Upsert profile from Discord metadata
  const meta = session.user.user_metadata
  await supabase.from('profiles').upsert({
    id: meta.provider_id,           // Discord user ID
    discord_username: meta.full_name,
    discord_avatar: meta.avatar_url,
  })

  // Initialize settings if first login
  await supabase.from('pinger_settings').upsert(
    { user_id: meta.provider_id },
    { onConflict: 'user_id', ignoreDuplicates: true }
  )

  return redirect('/dashboard')
}
```

### 6.3 Middleware (Auth Guard)

```typescript
// src/middleware.ts (Next.js middleware — lives in src/ since project uses src/ dir)
export async function middleware(request: NextRequest) {
  const supabase = createMiddlewareClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/dashboard/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.user_metadata.provider_id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
}
```

---

## 7. Project Structure

```
eventry-dash/
├── public/
│   ├── logo.png                         # Eventry metallic E logo
│   └── favicon.ico
├── src/
│   ├── app/
│   │   ├── (landing)/
│   │   │   ├── page.tsx                 # Landing page (static)
│   │   │   └── layout.tsx               # Landing layout (no sidebar)
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts             # OAuth callback handler
│   │   ├── dashboard/
│   │   │   ├── layout.tsx               # Sidebar + top bar + auth guard
│   │   │   ├── loading.tsx              # Skeleton for dashboard
│   │   │   ├── page.tsx                 # Dashboard home
│   │   │   ├── keywords/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── autostart/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── notifications/
│   │   │   │   ├── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── admin/
│   │   │       ├── layout.tsx             # Admin sub-nav tabs + admin guard
│   │   │       ├── page.tsx               # Admin overview (stats + activity)
│   │   │       ├── loading.tsx
│   │   │       ├── users/
│   │   │       │   ├── page.tsx           # User list table
│   │   │       │   ├── loading.tsx
│   │   │       │   └── [id]/
│   │   │       │       ├── page.tsx       # User detail deep-dive
│   │   │       │       └── loading.tsx
│   │   │       ├── admins/
│   │   │       │   └── page.tsx           # Admin assignment
│   │   │       ├── settings/
│   │   │       │   └── page.tsx           # App settings (keys, guild)
│   │   │       └── import/
│   │   │           └── page.tsx           # Data import wizard
│   │   ├── layout.tsx                   # Root layout (fonts, metadata)
│   │   └── globals.css                  # Tailwind + CSS custom properties
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives
│   │   ├── landing/
│   │   │   ├── hero.tsx
│   │   │   ├── features.tsx
│   │   │   ├── how-it-works.tsx
│   │   │   ├── cta-section.tsx
│   │   │   └── navbar.tsx
│   │   ├── dashboard/
│   │   │   ├── sidebar.tsx
│   │   │   ├── top-bar.tsx
│   │   │   ├── stat-cards.tsx
│   │   │   ├── quick-settings.tsx
│   │   │   ├── recent-activity.tsx
│   │   │   ├── keyword-table.tsx
│   │   │   ├── add-keyword-dialog.tsx
│   │   │   ├── silently-config.tsx
│   │   │   ├── schedule-config.tsx
│   │   │   ├── pushover-config.tsx
│   │   │   ├── notification-log.tsx
│   │   │   ├── admin/
│   │   │   │   ├── admin-stat-cards.tsx        # System-wide metrics
│   │   │   │   ├── active-users-table.tsx      # Users with pinger on
│   │   │   │   ├── system-activity-feed.tsx    # Cross-user notification feed
│   │   │   │   ├── user-management-table.tsx   # Full user list with filters
│   │   │   │   ├── user-detail-sections.tsx    # All sections for user detail page
│   │   │   │   ├── manage-admins.tsx           # Add/remove admin form + list
│   │   │   │   ├── app-settings-form.tsx       # Pushover/Silently key management
│   │   │   │   ├── import-wizard.tsx          # Multi-step import UI
│   │   │   │   ├── import-file-upload.tsx     # File upload per JSON type
│   │   │   │   └── import-preview-table.tsx   # Preview parsed data before import
│   │   └── shared/
│   │       ├── logo.tsx
│   │       ├── reveal.tsx               # Framer Motion scroll reveal
│   │       └── masked-input.tsx         # For API keys
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts               # createBrowserClient
│   │   │   ├── server.ts               # createServerClient
│   │   │   └── middleware.ts            # createMiddlewareClient
│   │   ├── actions/                     # Server Actions
│   │   │   ├── keywords.ts
│   │   │   ├── pinger.ts
│   │   │   ├── pushover.ts
│   │   │   ├── silently.ts
│   │   │   └── admin.ts
│   │   ├── utils.ts                     # cn() helper, formatters
│   │   └── constants.ts                 # Route paths, config
│   ├── hooks/
│   │   ├── use-user.ts                  # Current user hook
│   │   └── use-optimistic-mutation.ts   # Optimistic update wrapper
│   └── types/
│       ├── database.ts                  # Supabase generated types
│       └── index.ts                     # Shared types
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql       # Full schema from section 5
├── .env.local                           # Supabase URL, keys, Discord OAuth
├── .gitignore
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── PRD.md
└── docs/
    └── specs/
        └── 2026-03-28-eventry-dashboard-spec.md
```

---

## 8. Server Actions

All mutations use Next.js Server Actions for type-safe, zero-API-endpoint data mutation:

```typescript
// src/lib/actions/keywords.ts
'use server'

export async function addKeywords(formData: FormData) {
  const supabase = await createServerClient()
  const userId = await getCurrentUserId()

  const rawKeywords = formData.get('keywords') as string
  const keywords = rawKeywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
  const restrictionType = formData.get('restriction_type') as string
  const internalName = formData.get('internal_name') as string | null
  const maxPrice = formData.get('max_price') as string | null

  const rows = keywords.map(keyword => ({
    user_id: userId,
    keyword,
    internal_name: internalName || null,
    restriction_type: restrictionType,
    channel_ids: restrictionType === 'channels' ? parseChannelIds(formData) : null,
    category_id: restrictionType === 'category' ? formData.get('category_id') : null,
    max_price: maxPrice ? parseFloat(maxPrice) : null,
  }))

  const { error } = await supabase.from('keywords').insert(rows)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard')
}

export async function deleteKeywords(keywordIds: string[]) {
  const supabase = await createServerClient()
  const { error } = await supabase.from('keywords').delete().in('id', keywordIds)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/keywords')
  revalidatePath('/dashboard')
}
```

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Server-side only

# Discord OAuth (configured in Supabase dashboard)
# No env vars needed — Supabase handles the OAuth flow

# App
NEXT_PUBLIC_APP_URL=https://eventry.vercel.app
```

---

## 10. Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0.5",
    "framer-motion": "^11",
    "lucide-react": "^0.400",
    "class-variance-authority": "^0.7",
    "clsx": "^2",
    "tailwind-merge": "^2"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

shadcn/ui components installed via CLI: `npx shadcn@latest add button card dialog input select switch table badge tooltip tabs skeleton`

---

## 11. Verification Plan

1. **Landing page:** Visit `/` — hero animation plays, scroll reveals work, "Login with Discord" redirects to OAuth
2. **Auth flow:** Complete Discord OAuth → redirected to `/dashboard` with profile created
3. **Dashboard:** All stat cards load, toggles work with optimistic updates
4. **Keywords:** Add single + batch keywords, verify in table, delete, edit internal name
5. **Autostart:** Set Silently key, toggle autostart, set schedule + min stock, disable keyword
6. **Notifications:** Set Pushover key, change priority, view notification log with pagination
7. **Admin:** Only visible for `is_admin=true` users, add/remove admins by Discord ID, view user configs
8. **Performance:** Lighthouse score > 90, no visible loading spinners on navigation
9. **Mobile:** All pages responsive, sidebar collapses to bottom nav or hamburger
