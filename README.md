# CMO — Ascension Mode

> Discipline today. Freedom tomorrow. Lead like a CMO.

A premium, dark/gold AI coaching platform that operates as your private **CMO Professor + executive coach**. It teaches marketing, business strategy, P&L, leadership, AI systems, career growth, and lifestyle discipline — daily, with memory, with documents, with feedback.

Built with **Next.js 15 + TypeScript + Tailwind + Supabase (Postgres + pgvector + Storage + Auth) + OpenAI**.

---

## Modules

| Module | Status | What it does |
| --- | --- | --- |
| Onboarding | Live (first-login gate) | Chat-based interview where the Professor learns who you are across 7 topics. Right-rail checklist ticks off as topics are covered. Dashboard is locked until completion. |
| Dashboard | Live | Today's mission, progress, streak, current track, recent activity & documents, professor briefing |
| Professor | Live | Streaming chat with retrieval over your memories + documents, persistent conversations, async memory extraction |
| Coach | Live | Daily missions (auto-generated, idempotent per day), task creation, AI-graded submissions, reflections |
| Documents | Live | PDF / DOCX / XLSX / PPTX / TXT upload → parse → chunk → embed → summarize → key insights |
| Progress | Live | 8 skill scores (0-100), 12-week discipline heatmap, overall CMO Index ring |
| Settings | Live | Profile, persona summary used by the Professor, account stats, sign-out |
| Admin | Live (gated) | Set the Professor's name, voice, and avatar image. Visible only to the user matching `ADMIN_EMAIL`. |
| Strategy Lab | Live | Duolingo-style executive learning system: 12 tracks, AI-generated theory, mini-game challenges, end-of-module assignments graded by the Professor, XP / rank / streak progression, and reward unlocks. Positioning Strategy is the v1 fully-built track (4 modules × 5 lessons + 4 assignments + 4 rewards). |
| P&L Lab | Track shell | Curriculum and target outcomes ready; calculators in development |
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

SQL migrations live under `supabase/migrations/`. Apply them in order:

- `0001_init.sql` — 14 tables, `pgvector`, RLS, `match_user_context` RPC, `handle_new_user` trigger, `cmo-docs` storage bucket + policies, seed `learning_tracks` and `lessons`.
- `0002_admin.sql` — `app_settings` (single-row Professor config) + `cmo-public` storage bucket for the Professor avatar.
- `0003_onboarding.sql` — `profiles.onboarded_at`, `profiles.onboarding` (JSONB), `chat_conversations.kind` + `metadata` for the first-login interview.
- `0004_strategy_lab.sql` — Strategy Lab: 15 tables (`strategy_tracks`, `strategy_modules`, `strategy_lessons`, `lesson_minigames`, `lesson_questions`, `module_assignments`, `module_rewards`, `lesson_progress`, `lesson_theory_cache`, `assignment_submissions`, `assignment_reviews`, `xp_log`, `user_level`, `reward_unlocks`, `streak_tracking`), RLS, `compute_rank`, `handle_xp_log_insert` trigger, `module_is_unlocked` RPC, and seeds for 12 tracks plus the full Positioning Strategy curriculum.
- `0005_lesson_hero_image.sql` — Optional `strategy_lessons.hero_image_url` for per-lesson Professor hero images uploaded in the Strategy Lab admin.

You have two options:

**Option A — Supabase CLI (recommended):**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>
supabase db push
```

**Option B — Paste into the SQL editor:**

Open each `supabase/migrations/*.sql` in order and run them in your Supabase project's SQL editor.

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
- **Strategy Lab theory** (`lib/strategy/theory.ts`) — Per-user cached lesson body. On first access, retrieves user memories via `retrieveContext`, calls `generateText` with `STRATEGY_PROFESSOR_TEACHING_SYSTEM`, and stores the result in `lesson_theory_cache`.
- **Strategy Lab mini-game** (`lib/strategy/minigame.ts`) — Global cache. `generateObject` with a zod schema produces 4-6 questions per lesson (multiple choice / true-false / fill step / case scenario). Persisted to `lesson_questions`. `evaluateAnswer` validates submissions; case scenarios are graded against keyword targets stored on the question.
- **Strategy Lab grader** (`lib/strategy/grader.ts`) — Reviews end-of-module assignments. `generateObject` produces a structured review (score, strengths, weaknesses, required revisions, verdict, feedback markdown, skill deltas). Pass verdict (≥70 + no revisions) awards XP, unlocks rewards, and applies the deltas via the EMA path used by `lib/scorer.ts`.
- **XP / rank / streak** (`lib/strategy/xp.ts`) — Logs XP events, lets a Postgres trigger recompute total/level/rank, and bumps `streak_tracking` based on local-day cadence.

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
    pl-lab, lifestyle,
    career, ai-tools             TrackComingSoon shells
    strategy-lab/                Strategy Lab home + 12-track grid + rank header
      [trackSlug]                track detail (module path, locked/unlocked)
        [moduleId]/[lessonId]    lesson runner: theory → minigame → complete
        [moduleId]/assignment    end-of-module brief + submission
        [moduleId]/review        Professor's grade + verdict + reward unlock
        [moduleId]/reward        cinematic reward reveal
      progress                   XP dashboard, rank progression spine, recent XP
    admin/strategy               authoring CMS for tracks/modules/lessons/assignments/rewards
  (onboarding)/onboarding        first-login Professor interview (gated)
  api/
    chat                         streaming professor RAG
    onboarding/chat              streaming onboarding interview + tools
    onboarding/state             current topics_covered + onboarded flag
    coach/daily-mission          idempotent per day
    tasks/score                  AI evaluator + EMA skill update
    documents/upload             multipart → Supabase Storage
    documents/process            parse + embed + summarize
    strategy/lessons/[id]/theory      get-or-generate per-user lesson body
    strategy/lessons/[id]/minigame    get-or-generate questions
    strategy/lessons/[id]/answer      validate one answer + award XP
    strategy/lessons/[id]/complete    mark complete + lesson XP + bump streak
    strategy/assignments/[id]/submit  persist + grade synchronously
    strategy/rewards/[id]/view        mark a reward unlock as viewed
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
  onboarding/                    topics config, system prompt, tools
  strategy/{xp,theory,minigame,grader}.ts  Strategy Lab AI pipeline + XP/rank/streak
supabase/
  migrations/0001_init.sql           schema + RLS + RPC + trigger + storage + seed
  migrations/0002_admin.sql          app_settings + cmo-public storage bucket
  migrations/0003_onboarding.sql     onboarding columns on profiles + chat_conversations
  migrations/0004_strategy_lab.sql   Strategy Lab schema + RLS + XP trigger + RPC + curriculum seed
  migrations/0005_lesson_hero_image.sql  lesson hero portrait URL column
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

---

## Onboarding (first-login interview)

The first time a user logs in, the `(app)` layout sees `profiles.onboarded_at IS NULL` and redirects them to `/onboarding`. They can't reach the dashboard until the Professor has interviewed them across 7 topics:

1. Who you are
2. Living situation
3. Hobbies
4. Interests
5. Lifestyle
6. Marketing knowledge
7. Career goal & ambition

The interview runs as a streaming chat against [`app/api/onboarding/chat/route.ts`](app/api/onboarding/chat/route.ts) with two AI tools:

- `mark_topic_complete(topic_id)` — the Professor calls this the moment a topic is covered. The right-rail checklist ticks off in real time via the AI SDK's `StreamData` channel, and the topic is persisted to `chat_conversations.metadata.topics_covered` so refreshing the page resumes seamlessly.
- `complete_onboarding(payload)` — called once the last topic is wrapped. The handler ([`lib/onboarding/tools.ts`](lib/onboarding/tools.ts)) writes the structured profile to `profiles.onboarding` (JSONB), sets `profiles.onboarded_at`, then embeds and inserts per-topic memories so the Professor recalls them in every future chat. The page redirects to `/dashboard` automatically.

Topic config is a single source of truth in [`lib/onboarding/topics.ts`](lib/onboarding/topics.ts) — easy to add or reorder topics later. The system prompt for the interview lives in [`lib/onboarding/prompt.ts`](lib/onboarding/prompt.ts).

> The first user account that logs in after the migration runs will be redirected to `/onboarding` because their `onboarded_at` is `NULL`. This is expected and the way to test the full flow.

---

## Strategy Lab

The Strategy Lab is a Duolingo-style executive learning system designed to feel like an MBA elective taught by a partner at a top consulting firm. It is the most opinionated module in the platform.

### Structure

```
Track → 4 modules → 5 lessons each → end-of-module assignment → reward unlock
```

- **12 tracks** seeded in `0004_strategy_lab.sql` (Strategic Thinking, 5C, Porter, Positioning Strategy, ICP, Messaging, Lead Gen, GTM, Competitive Analysis, Growth Levers, Executive Decisions, Marketing OS).
- **Positioning Strategy** is the v1 fully-built track: 4 modules × 5 lessons + 4 graded assignments + 4 unlockable rewards. The other 11 are visible as "coming soon" cards with a teaser page.

### Lesson flow

1. **Theory** — Markdown rendered by `[components/strategy/theory-body.tsx](components/strategy/theory-body.tsx)`. The body is generated per user via `[lib/strategy/theory.ts](lib/strategy/theory.ts)` using the `STRATEGY_PROFESSOR_TEACHING_SYSTEM` prompt and the user's retrieved memories. Result is cached in `lesson_theory_cache (user_id, lesson_id)`.
2. **Mini-game** — 4-6 short questions across four kinds:
   - Multiple choice (4 options, plausible distractors)
   - True / false
   - Fill the missing step (ordered framework with one slot)
   - Case scenario (1-2 sentence executive scenario; user writes a short answer judged against keyword targets)
   Question generation is global (`lesson_questions` keyed by `lesson_id`); answer evaluation runs server-side at `POST /api/strategy/lessons/[id]/answer` with XP awarded per correct answer.
3. **Complete lesson** — `POST /api/strategy/lessons/[id]/complete` marks `lesson_progress`, awards lesson XP (+50) and a `minigame_perfect` bonus (+25) on a flawless run, and bumps the user's streak in `streak_tracking`. The runner then routes to the next lesson or the module assignment.

### End-of-module assignment

Each module ends with a real executive-level brief (e.g. "diagnose a positioning failure"). The user submits at `POST /api/strategy/assignments/[id]/submit`. The grader (`[lib/strategy/grader.ts](lib/strategy/grader.ts)`, prompt `STRATEGY_ASSIGNMENT_GRADER_SYSTEM`) returns a structured review:

- **score** (0-100)
- **strengths**, **weaknesses**, **required_revisions**
- **verdict** (`pass` if score ≥ 70 and no required revisions, else `revision`)
- **feedback_md** — a 150-300-word personal note from the Professor
- **skill_deltas** — applied via the same EMA path as Coach submissions

Pass unlocks the next module (via `module_is_unlocked` RPC), awards `+300` XP for the assignment + `+150` XP for module completion, and inserts rows into `reward_unlocks` for each `module_rewards` entry on that module.

### XP, rank, streak

Logged in `xp_log`. A trigger recomputes `user_level (total_xp, level, rank)` after every insert. Ranks scale with thresholds:

| Rank | XP threshold |
| --- | --- |
| Initiate | 0 |
| Strategist | 500 |
| Operator | 1,500 |
| Director | 3,500 |
| Growth Architect | 6,500 |
| CMO Candidate | 10,500 |
| Executive Operator | 16,000 |
| CMO Ascendant | 25,000 |

`streak_tracking` is bumped once per local day on lesson completion. Hitting a 7-day streak awards `+100` XP.

### Rewards

Module rewards are unlockable artifacts (kinds: `letter`, `template`, `quote_card`, `video`). They render in a cinematic reveal at `/strategy-lab/[trackSlug]/[moduleId]/reward` and carry a Professor-letter, a strategic worksheet, or a quote card. Video reward production is deferred.

### Authoring

`/admin/strategy` is the CMS. Pick a track, then edit:

- Modules — title, summary, description, XP, drag-style ordering via the order field.
- Lessons — title, learning objective, key points (one per line), minutes, XP, and an optional **lesson Professor image** (JPEG/PNG/WebP, stored in `cmo-public/strategy-lessons/...`, URL on `strategy_lessons.hero_image_url`) shown on the lesson theory and challenge screens. Each lesson exposes a **Regenerate caches** button that clears `lesson_theory_cache` (all users) and `lesson_questions` for that lesson, forcing a fresh AI run on next view.
- Assignment — title, prompt, rubric (JSON), success criteria, max score.
- Rewards — kind, title, description, content JSON.

All writes go through server actions in `[app/(app)/admin/strategy/actions.ts](app/(app)/admin/strategy/actions.ts)` using the service-role client.

---

## What's intentionally out of scope (for now)

- Stripe / subscriptions
- Real video reward content production (rewards are AI letters + templates + quote cards)
- Drag-and-drop matching mini-game type (kept to 4 simpler kinds for MVP)
- Notifications (UI badges only)
- Background job runner — document processing and assignment grading run inline in the request path
- Mobile-specific layouts beyond the responsive sidebar collapse

These can each be slotted in without touching the core. The data model already supports them.

---

## Tone of voice

The Professor speaks like a partner at a top consulting firm coaching their best protégé: direct, intelligent, premium, MBA-level, ruthless but constructive. No filler. No platitudes. Frameworks always anchored to a P&L line.

If the AI ever drifts off-tone, edit `lib/prompts.ts` and tighten it. The system prompt is the contract.
