# CMO — Ascension Mode

> Discipline today. Freedom tomorrow. Lead like a CMO.

A premium, dark/gold AI coaching platform that operates as your private **CMO Professor + executive coach**. It teaches marketing, business strategy, P&L, leadership, AI systems, career growth, and lifestyle discipline — daily, with memory, with documents, with feedback.

Built with **Next.js 15 + TypeScript + Tailwind + Supabase (Postgres + pgvector + Storage + Auth) + OpenAI**.

---

## Modules

| Module | Status | What it does |
| --- | --- | --- |
| Dashboard | Live | Today's mission, progress, streak, current track, recent activity & documents, professor briefing |
| Professor | Live | Streaming chat with retrieval over your memories + documents, persistent conversations, async memory extraction |
| Coach | Live | Daily missions (auto-generated, idempotent per day), task creation, AI-graded submissions, reflections |
| Documents | Live | PDF / DOCX / XLSX / PPTX / TXT upload → parse → chunk → embed → summarize → key insights |
| Progress | Live | 8 skill scores (0-100), 12-week discipline heatmap, overall CMO Index ring |
| Settings | Live | Profile, persona summary used by the Professor, account stats, sign-out |
| Admin | Live (gated) | Set the Professor's name, voice, and avatar image. Visible only to the user matching `ADMIN_EMAIL`. |
| P&L Lab | Track shell | Curriculum and target outcomes ready; calculators in development |
| Strategy Lab | Track shell | Frameworks index ready; interactive workspaces in development |
| Lifestyle | Track shell | Curriculum and outcomes ready; tracking in development |
| Career | Track shell | Curriculum and outcomes ready; workspace in development |
| AI Tools | Track shell | Curriculum and outcomes ready; workshops in development |

---

## Quick start

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Sign up at https://supabase.com → New project.
2. From **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose to browser)

### 3. Apply the schema

The single migration creates all 14 tables, the `pgvector` extension, RLS policies, the `match_user_context` retrieval RPC, the `handle_new_user` trigger, the `cmo-docs` storage bucket with per-user policies, and the seed `learning_tracks` + `lessons`.

You have two options:

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push
```

**Option B — Paste into the SQL editor:**

Open `supabase/migrations/0001_init.sql`, copy the contents, and run them in your Supabase project's SQL editor.

### 4. Get an OpenAI key

Create one at https://platform.openai.com/api-keys. The app uses:

- `gpt-4o-mini` for chat, daily missions, scoring, summaries
- `text-embedding-3-small` (1536-dim) for memory + document retrieval

Set spending limits to taste.

### 5. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_EMBED_MODEL=text-embedding-3-small
```

### 6. Run

```bash
npm run dev
```

Open http://localhost:3000 → **Request access** → sign up with email + password → land on the dashboard with a freshly generated daily mission.

> If your Supabase project requires email confirmation (default), confirm via the email link first, then sign in.

---

## Architecture

```
┌────────────────────────────────────────────────────┐
│  Next.js 15 App Router (Server Components first)   │
│                                                    │
│  /(auth)         /login  /signup                   │
│  /(app)          /dashboard /professor /coach …    │
│  /api            /chat /tasks/score                │
│                  /documents/upload + /process      │
│                  /coach/daily-mission              │
└─────────┬──────────────────────────────┬───────────┘
          │ @supabase/ssr                │ ai SDK + openai
          ▼                              ▼
   ┌─────────────────┐            ┌─────────────────┐
   │ Supabase        │            │ OpenAI          │
   │ - Postgres + RLS│            │ - gpt-4o-mini   │
   │ - pgvector      │            │ - embeddings    │
   │ - Storage       │            └─────────────────┘
   │ - Auth          │
   └─────────────────┘
```

### Data tables

`profiles`, `memories` (vec), `documents`, `document_chunks` (vec), `tasks`, `task_submissions`, `learning_tracks`, `lessons`, `track_progress`, `skill_scores`, `daily_missions`, `weekly_reviews`, `reflections`, `chat_conversations`, `chat_messages`.

All user-owned tables are guarded by `auth.uid() = user_id` RLS policies. Storage objects in `cmo-docs` are scoped to `<user_id>/...` paths.

### AI flows

- **Professor chat** (`app/api/chat/route.ts`) — Streams with the Vercel AI SDK. On each user message: embed the query, call `match_user_context` to retrieve top-K user memories + document chunks, build a system prompt with profile + retrieval context, stream the response, persist both turns to `chat_messages`, and asynchronously extract durable memories with structured output.
- **Daily mission** (`lib/coach.ts`) — Composes profile + weakest 2 skills + recent reflections + current track + recent docs, calls `generateObject` with a `zod` schema, and inserts into `daily_missions` (unique per day).
- **Submission scoring** (`app/api/tasks/score/route.ts`) — Honest 0-100 score plus strengths/gaps/next-steps and per-skill deltas; deltas are applied via an exponential moving average (alpha 0.3) to `skill_scores`.
- **Document processing** (`app/api/documents/process/route.ts`) — Parses PDF/DOCX/XLSX/PPTX/TXT, chunks (~800 tokens, 100 overlap), batch-embeds, inserts to `document_chunks`, then summarizes + extracts key insights with structured output.

---

## Project layout

```
app/
  (auth)/login, /signup          split-layout auth pages
  (app)/                         sidebar+topbar shell
    dashboard                    9-card live dashboard
    professor                    streaming chat + conversation rail
    coach                        daily mission + tasks + reflections
    documents                    drag-drop, parse, summarize
    progress                     skill grid + 12-week heatmap
    settings                     profile + privacy + stats
    pl-lab, strategy-lab,
    lifestyle, career, ai-tools  TrackComingSoon shells
  api/
    chat                         streaming professor RAG
    coach/daily-mission          idempotent per day
    tasks/score                  AI evaluator + EMA skill update
    documents/upload             multipart → Supabase Storage
    documents/process            parse + embed + summarize
components/
  ui/                            Card, Button, Input, ProgressRing, SkillBar, …
  shell/                         Sidebar, Topbar, TrackComingSoon
  dashboard/                     each dashboard card as its own component
lib/
  supabase/{server,client,middleware}.ts
  openai.ts                      lazy-instantiated OpenAI + AI SDK provider
  embeddings.ts                  embed, embedMany, chunkText
  memory.ts                      retrieveContext + extractAndStoreMemories
  coach.ts                       ensureTodayMission + briefings
  scorer.ts                      evaluateSubmission + applySkillDeltas
  prompts.ts                     all system prompts in one place
  parsers.ts                     pdf/docx/xlsx/pptx text extraction
  utils.ts                       cn, formatBytes, timeAgo, initials
supabase/
  migrations/0001_init.sql       schema + RLS + RPC + trigger + storage + seed
types/
  database.ts                    SkillKey, MemoryKind, labels, helpers
middleware.ts                    auth gating via @supabase/ssr
```

---

## Design system

Tailwind tokens in `tailwind.config.ts`:

- Background: `#0A0A0A` primary, `#141414` elevated, `#1A1A1A` card
- Gold scale: `#FBF5DD → #D4AF37 → #2E2408`
- Bronze: `#8B6F2F`
- Border: `rgba(212,175,55,0.12)` subtle, `rgba(212,175,55,0.30)` accent
- Fonts: Playfair Display (display), Inter (body), JetBrains Mono (numerals)

Reusable utilities in `app/globals.css`: `card-premium`, `btn-gold`, `skill-bar-track/fill`, `gold-text`, `gold-divider`, `badge-gold/muted/success/warning`.

---

## Scripts

```bash
npm run dev         # local development
npm run build       # production build
npm run start       # start the production server
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
```

---

## Admin

A single user — the email set in `ADMIN_EMAIL` (defaults to `hardwig@gmail.com`) — gets access to `/admin`. Everyone else is silently redirected to `/dashboard`.

The admin panel lets you:

- **Identity & avatar** — set the Professor's display name and upload a portrait (JPEG/PNG/WebP up to 2 MB). The image is stored in the `cmo-public` Supabase Storage bucket and used on the dashboard portrait, the chat header, and every assistant message bubble.
- **Tone of voice (structured)** — persona blurb, voice-trait chips (direct, ruthless, witty, …), response length (short/medium/long), language, and free-text style notes. These compile into the Professor's system prompt at runtime via `[lib/professor-config.ts](lib/professor-config.ts)` `buildProfessorSystemPrompt`.
- **Tone of voice (advanced)** — an optional raw system-prompt override textarea. If non-empty, it fully replaces the structured prompt. Use carefully.
- **Live preview** — toggle the compiled system prompt before saving to see exactly what `gpt-4o-mini` will receive.

Settings are read-only for non-admins and writes are done from server actions using the service-role key (`SUPABASE_SERVICE_ROLE_KEY`). Changes are applied instantly: the server actions call `revalidatePath` on `/dashboard`, `/professor`, and `/admin`.

Surface points:

- Sidebar shows an **Admin** entry only when the current user is the admin (`[components/shell/sidebar.tsx](components/shell/sidebar.tsx)`).
- `/settings` shows an **Open Admin Panel** card with the same gate (`[app/(app)/settings/page.tsx](app/(app)/settings/page.tsx)`).
- The page itself calls `requireAdmin()` from `[lib/admin.ts](lib/admin.ts)` for hard server-side gating.

To change the admin: update `ADMIN_EMAIL` in `.env.local` and restart the dev server.

## What's intentionally out of scope (for now)

- Stripe / subscriptions
- Real lessons inside P&L Lab and Strategy Lab (track shells only)
- Notifications (UI badges only)
- Background job runner — document processing runs inline in the request path
- Mobile-specific layouts beyond the responsive sidebar collapse

These can each be slotted in without touching the core. The data model already supports them.

---

## Tone of voice

The Professor speaks like a partner at a top consulting firm coaching their best protégé: direct, intelligent, premium, MBA-level, ruthless but constructive. No filler. No platitudes. Frameworks always anchored to a P&L line.

If the AI ever drifts off-tone, edit `lib/prompts.ts` and tighten it. The system prompt is the contract.
