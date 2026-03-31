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

## Supabase
- Database migrations via Supabase MCP `apply_migration` tool
- Project ref: `ewsvttrxcqxgifiajvkt`
- Auth: Discord OAuth (Client ID: `1487428516629843969`)
- RLS enabled on all tables

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
- `docs/specs/` — Technical specification
