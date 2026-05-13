# Forking this repo as a new product template (post-MVP)

This app is structured so you can **copy the framework** (Next.js shell, Supabase auth, labs, Coach, Documents, XP, admin CMS) into a **new GitHub repo** and attach a **fresh Supabase project** plus **your own curriculum**, without rewriting core mechanics.

Brand chrome is partly driven by environment variables — see **`lib/site-config.ts`** and **`.env.example`**.

---

## 1. When MVP is “done”: freeze a template snapshot

Recommended workflow:

| Step | Action |
|------|--------|
| A | Tag the repo, e.g. `git tag template-v1` after MVP ships. |
| B | Either **duplicate the repo** in GitHub (“Use this template”), or branch `template/main` you never merge messy experiments into. |
| C | In the **new repo**, rename `package.json` `name` and update `README.md` top-level blurbs for the new product. |

Keep **schema migrations** (`supabase/migrations/*.sql`). Treat **heavy CMO-specific seed data** separately (see §4).

---

## 2. New project checklist (minimal)

1. **Clone / generate** from template → new folder & remote.
2. **Copy** `.env.example` → `.env.local`; fill Supabase keys, OpenAI, `ADMIN_EMAIL`.
3. **Set product strings** for the fork:
   - `NEXT_PUBLIC_APP_NAME` — full product title  
   - `NEXT_PUBLIC_APP_MARK` — short monogram word (sidebar)  
   - `NEXT_PUBLIC_APP_DESCRIPTION` — meta / sharing  
   - `NEXT_PUBLIC_APP_URL` — production URL when deployed  
4. **Create** a new Supabase project; run migrations in order (SQL editor or `supabase db push`).
5. **Deploy** Vercel (or other); set **all** Production env vars, including **`SUPABASE_SERVICE_ROLE_KEY`** (labs/admin need it).

---

## 3. What is “framework” vs “vertical content”

**Mostly reusable (framework)**

- Auth, onboarding, layout, middleware pattern  
- Lab **routing pattern** (`strategy-lab`, `pl-lab`, shared `LabTrackDetailPage`, etc.)  
- Lessons, assignments, Coach tasks, Documents, XP pipeline  
- Admin CMS pattern for tracks/modules/lessons  

**Usually product-specific (change per fork)**

| Area | Typical action |
|------|----------------|
| **`lib/strategy/lab-routes.ts`** (`STRATEGY_LAB`, `PL_LAB`, paths, headlines) | Duplicate/adjust bundles for each “school” / track family, or later drive from DB. |
| **`components/shell/sidebar.tsx`** (`NAV` items, labels, routes) | Add/remove sections for your vertical or neutral “Courses A / B”. |
| **`supabase/migrations` after baseline** | New project: run migrations for **schema only**; add **tenant-specific seeds** separately or via admin UI. |
| **`lib/prompts.ts`** & grader personas | Rewrite for Sales / Tai Chi / etc. |
| **`app/` route segments** (`/strategy-lab`, `/pl-lab`) | For a radically different IA, rename routes and labs in `lab_slug` consistently (DB constraint allows `strategy`, `pl`, …). |
| Assets | Replace monogram/logo in `components/ui/monogram` or swap for your own component. |

---

## 4. Seeds vs schema

**Do ship in template:** numbered migrations through current schema (tables, RLS, indexes).

**Be careful copying into a fork:**

- Bulk `INSERT`s of **strategy tracks, lessons, modules** tied to “CMO” — either omit from template or move to **`supabase/seed.sql`** optional script you document as “demo only”.
- For **Sales** or **Tai Chi**, you normally start with empty tracks and build curriculum in **admin** or a dedicated seed file.

---

## 5. Scaling to multiple products later

Instead of copying the folder repeatedly, teams often evolve to:

- **Monorepo** (`packages/core`, `apps/sales-school`, `apps/tai-chi`) — shared UI + domain packages.  
- **Single deploy + tenancy** (`org_id` on rows) — more engineering, one codebase.

Neither is required for MVP; **template fork + env + new DB** is the simplest first step.

---

## 6. Optional hardening backlog (incremental)

- Centralize **`NAV`** and lab bundles in `@/lib/navigation-config` or YAML.  
- Move lab **copy** (`homeHeadline`, etc.) closer to CMS or locale files.  
- Parameterize Professor/Coach prompts with `NEXT_PUBLIC_EDUCATOR_PERSONA` or DB.  

This doc is the roadmap; ship MVP first, then fork with the checklist above.
