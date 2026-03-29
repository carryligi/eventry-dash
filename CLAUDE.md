# Eventry Dashboard

## Project
- **Stack:** Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Supabase + Vercel
- **Supabase Project ID:** `ewsvttrxcqxgifiajvkt`
- **Vercel Project:** `eventry-dash` (Team: `team_PuOQRJE5OnWEqalHlZAAWnok`)
- **GitHub:** `carryligi/eventry-dash`
- **Production URL:** https://eventry-dash.vercel.app

## Deploy Process
To deploy changes to production:
```bash
# 1. Build locally to catch errors
npm run build

# 2. Commit changes
git add -A && git commit -m "description"

# 3. Push to GitHub
git push origin main

# 4. Deploy to Vercel production
npx vercel --prod
```

Or use the `/deploy` slash command which does all of the above automatically.

## Supabase
- Database migrations via Supabase MCP `apply_migration` tool
- Project ref: `ewsvttrxcqxgifiajvkt`
- Auth: Discord OAuth (Client ID: `1487428516629843969`)
- RLS enabled on all tables

## Key Directories
- `src/app/` — Next.js App Router pages
- `src/components/` — React components (ui/, landing/, dashboard/)
- `src/lib/` — Utilities, Supabase clients, server actions, auth helpers
- `src/types/` — TypeScript types
- `docs/specs/` — Technical specification
