-- =====================================================================
-- CMO Ascension Mode — Strategy Lab learning system
-- =====================================================================

-- ---------------------------------------------------------------------
-- Global content tables
-- ---------------------------------------------------------------------

create table if not exists public.strategy_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  tagline text,
  description text,
  color text,
  ord int not null default 0,
  total_modules int not null default 0,
  total_xp int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists strategy_tracks_ord_idx on public.strategy_tracks(ord);

create table if not exists public.strategy_modules (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.strategy_tracks(id) on delete cascade,
  ord int not null default 0,
  title text not null,
  summary text,
  description text,
  xp_reward int not null default 150,
  prerequisite_module_id uuid references public.strategy_modules(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists strategy_modules_track_idx on public.strategy_modules(track_id, ord);

create table if not exists public.strategy_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.strategy_modules(id) on delete cascade,
  ord int not null default 0,
  title text not null,
  learning_objective text,
  key_points jsonb not null default '[]'::jsonb,
  estimated_minutes int not null default 8,
  xp_reward int not null default 50,
  created_at timestamptz not null default now()
);
create index if not exists strategy_lessons_module_idx on public.strategy_lessons(module_id, ord);

create table if not exists public.lesson_minigames (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.strategy_lessons(id) on delete cascade,
  status text not null default 'pending',
  generated_at timestamptz
);

create table if not exists public.lesson_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.strategy_lessons(id) on delete cascade,
  minigame_id uuid not null references public.lesson_minigames(id) on delete cascade,
  ord int not null default 0,
  kind text not null check (kind in ('multiple_choice','true_false','fill_step','case_scenario')),
  prompt text not null,
  payload jsonb not null default '{}'::jsonb,
  correct jsonb not null default '{}'::jsonb,
  explanation text,
  xp int not null default 5
);
create index if not exists lesson_questions_lesson_idx on public.lesson_questions(lesson_id, ord);

create table if not exists public.module_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null unique references public.strategy_modules(id) on delete cascade,
  title text not null,
  prompt text not null,
  rubric jsonb not null default '{}'::jsonb,
  success_criteria jsonb not null default '[]'::jsonb,
  max_score int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.module_rewards (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.strategy_modules(id) on delete cascade,
  ord int not null default 0,
  kind text not null check (kind in ('letter','template','video','quote_card')),
  title text not null,
  description text,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists module_rewards_module_idx on public.module_rewards(module_id, ord);

-- ---------------------------------------------------------------------
-- Per-user state tables
-- ---------------------------------------------------------------------

create table if not exists public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.strategy_lessons(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  best_score int not null default 0,
  attempts int not null default 0,
  completed_at timestamptz,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id, last_seen_at desc);

create table if not exists public.lesson_theory_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.strategy_lessons(id) on delete cascade,
  body_md text not null,
  generated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.module_assignments(id) on delete cascade,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('submitted','graded')),
  created_at timestamptz not null default now()
);
create index if not exists assignment_submissions_user_idx on public.assignment_submissions(user_id, created_at desc);
create index if not exists assignment_submissions_assignment_idx on public.assignment_submissions(assignment_id, created_at desc);

create table if not exists public.assignment_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.assignment_submissions(id) on delete cascade,
  score int not null default 0 check (score between 0 and 100),
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  required_revisions jsonb not null default '[]'::jsonb,
  verdict text not null check (verdict in ('pass','revision')),
  feedback_md text,
  created_at timestamptz not null default now()
);

create table if not exists public.xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  source_ref_id uuid,
  xp_delta int not null,
  created_at timestamptz not null default now()
);
create index if not exists xp_log_user_idx on public.xp_log(user_id, created_at desc);

create table if not exists public.user_level (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_xp int not null default 0,
  level int not null default 1,
  rank text not null default 'Initiate',
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_unlocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.module_rewards(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  viewed_at timestamptz,
  unique (user_id, reward_id)
);
create index if not exists reward_unlocks_user_idx on public.reward_unlocks(user_id, unlocked_at desc);

create table if not exists public.streak_tracking (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  last_active_date date,
  weekly_goal int not null default 5,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- XP rank computation
-- ---------------------------------------------------------------------

create or replace function public.compute_rank(total_xp int)
returns text
language sql
immutable
as $$
  select case
    when total_xp >= 25000 then 'CMO Ascendant'
    when total_xp >= 16000 then 'Executive Operator'
    when total_xp >= 10500 then 'CMO Candidate'
    when total_xp >= 6500  then 'Growth Architect'
    when total_xp >= 3500  then 'Director'
    when total_xp >= 1500  then 'Operator'
    when total_xp >= 500   then 'Strategist'
    else 'Initiate'
  end
$$;

create or replace function public.handle_xp_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_level int;
  v_rank  text;
begin
  select coalesce(sum(xp_delta),0) into v_total
    from public.xp_log
   where user_id = new.user_id;

  v_level := greatest(1, floor(v_total::numeric / 100)::int + 1);
  v_rank  := public.compute_rank(v_total);

  insert into public.user_level (user_id, total_xp, level, rank, updated_at)
  values (new.user_id, v_total, v_level, v_rank, now())
  on conflict (user_id) do update
    set total_xp = excluded.total_xp,
        level    = excluded.level,
        rank     = excluded.rank,
        updated_at = excluded.updated_at;

  return new;
end$$;

drop trigger if exists xp_log_after_insert on public.xp_log;
create trigger xp_log_after_insert
after insert on public.xp_log
for each row execute function public.handle_xp_log_insert();

-- ---------------------------------------------------------------------
-- Module unlock RPC
-- ---------------------------------------------------------------------

create or replace function public.module_is_unlocked(
  p_user_id uuid,
  p_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_track uuid;
  v_ord int;
  v_prev uuid;
  v_pass boolean;
begin
  select track_id, ord into v_track, v_ord
    from public.strategy_modules
   where id = p_module_id;

  if v_ord = 0 or v_ord is null then
    return true;
  end if;

  select id into v_prev
    from public.strategy_modules
   where track_id = v_track and ord = v_ord - 1
   limit 1;

  if v_prev is null then
    return true;
  end if;

  select exists (
    select 1
      from public.assignment_submissions s
      join public.assignment_reviews r on r.submission_id = s.id
      join public.module_assignments a on a.id = s.assignment_id
     where a.module_id = v_prev
       and s.user_id = p_user_id
       and r.verdict = 'pass'
  ) into v_pass;

  return coalesce(v_pass, false);
end$$;

revoke all on function public.module_is_unlocked(uuid, uuid) from public;
grant execute on function public.module_is_unlocked(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

-- Global content: enable RLS, allow read for authenticated, writes via service role only
alter table public.strategy_tracks      enable row level security;
alter table public.strategy_modules     enable row level security;
alter table public.strategy_lessons     enable row level security;
alter table public.lesson_minigames     enable row level security;
alter table public.lesson_questions     enable row level security;
alter table public.module_assignments   enable row level security;
alter table public.module_rewards       enable row level security;

drop policy if exists "tracks_read"      on public.strategy_tracks;
drop policy if exists "modules_read"     on public.strategy_modules;
drop policy if exists "lessons_read"     on public.strategy_lessons;
drop policy if exists "minigames_read"   on public.lesson_minigames;
drop policy if exists "questions_read"   on public.lesson_questions;
drop policy if exists "assignments_read" on public.module_assignments;
drop policy if exists "rewards_read"     on public.module_rewards;

create policy "tracks_read"      on public.strategy_tracks      for select to authenticated using (true);
create policy "modules_read"     on public.strategy_modules     for select to authenticated using (true);
create policy "lessons_read"     on public.strategy_lessons     for select to authenticated using (true);
create policy "minigames_read"   on public.lesson_minigames     for select to authenticated using (true);
create policy "questions_read"   on public.lesson_questions     for select to authenticated using (true);
create policy "assignments_read" on public.module_assignments   for select to authenticated using (true);
create policy "rewards_read"     on public.module_rewards       for select to authenticated using (true);

-- Per-user
alter table public.lesson_progress         enable row level security;
alter table public.lesson_theory_cache     enable row level security;
alter table public.assignment_submissions  enable row level security;
alter table public.assignment_reviews      enable row level security;
alter table public.xp_log                  enable row level security;
alter table public.user_level              enable row level security;
alter table public.reward_unlocks          enable row level security;
alter table public.streak_tracking         enable row level security;

drop policy if exists "lesson_progress_self"     on public.lesson_progress;
drop policy if exists "lesson_theory_cache_self" on public.lesson_theory_cache;
drop policy if exists "submissions_self"         on public.assignment_submissions;
drop policy if exists "reviews_self"             on public.assignment_reviews;
drop policy if exists "xp_log_self"              on public.xp_log;
drop policy if exists "user_level_self"          on public.user_level;
drop policy if exists "reward_unlocks_self"      on public.reward_unlocks;
drop policy if exists "streak_self"              on public.streak_tracking;

create policy "lesson_progress_self"     on public.lesson_progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "lesson_theory_cache_self" on public.lesson_theory_cache
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "submissions_self"         on public.assignment_submissions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reviews_self"             on public.assignment_reviews
  for select to authenticated using (
    exists (
      select 1 from public.assignment_submissions s
       where s.id = assignment_reviews.submission_id and s.user_id = auth.uid()
    )
  );

create policy "xp_log_self"              on public.xp_log
  for select to authenticated using (auth.uid() = user_id);

create policy "user_level_self"          on public.user_level
  for select to authenticated using (auth.uid() = user_id);

create policy "reward_unlocks_self"      on public.reward_unlocks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "streak_self"              on public.streak_tracking
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- Seed: 12 strategy tracks
-- =====================================================================

insert into public.strategy_tracks (slug, title, tagline, description, color, ord, is_active)
values
  ('strategic-thinking',     'Strategic Thinking',         'See the system, not the symptom.',           'Train the muscle of pattern recognition, second-order effects, and pre-mortem reasoning.', '#D4AF37',  1, true),
  ('5c-analysis',            '5C Analysis',                'Customer, Company, Competition, Collaborators, Context.', 'Master the 5C frame to diagnose any market in under an hour.', '#C7A03A',  2, false),
  ('porter-five-forces',     'Porter Five Forces',         'Industry structure decides the profit pool.','Use Porter to read industries the way a partner at a top consulting firm does.', '#B8932A',  3, false),
  ('positioning-strategy',   'Positioning Strategy',       'Own a clear, defensible space in the buyer''s mind.', 'From definition to operationalization: the full executive treatment of positioning.', '#E8C66E',  4, true),
  ('icp-buyer-persona',      'Buyer Persona & ICP',        'Define who you sell to with measurable filters.', 'Move past demographic personas to ICPs that filter pipeline.', '#A8852C',  5, false),
  ('messaging-framework',    'Messaging Framework',        'Translate strategy into language that converts.', 'From positioning to messaging architecture, value pillars, and pitch.', '#A07E2A',  6, false),
  ('lead-generation',        'Lead Generation Systems',    'Engineer demand, do not chase it.',           'Build lead gen as a system: ICP, channels, offers, attribution.', '#987729',  7, false),
  ('go-to-market',           'Go-To-Market Strategy',      'A motion that maps to revenue, not activity.','Segmentation, motion, proof points, and launch sequencing.', '#8F7028',  8, false),
  ('competitive-analysis',   'Competitive Analysis',       'Read competitors like a strategist, not a stalker.','Frameworks for choosing where to fight and where to refuse.', '#876927',  9, false),
  ('growth-levers',          'Growth Lever Identification','Find the one lever that moves the P&L.',      'Identify, validate, and prioritise growth levers like an operator.', '#7F6126', 10, false),
  ('executive-decisions',    'Executive Decision Making',  'Decide under ambiguity, defend under pressure.','Decision frames, escalation, asymmetric bets, and reversible vs not.', '#775A25', 11, false),
  ('marketing-os',           'Marketing Operating Systems','The org, the cadence, the rituals.',          'Build a marketing OS that compounds: planning, reviews, attribution, governance.', '#6F5224', 12, false)
on conflict (slug) do update
  set title = excluded.title,
      tagline = excluded.tagline,
      description = excluded.description,
      color = excluded.color,
      ord = excluded.ord,
      is_active = excluded.is_active;

-- =====================================================================
-- Seed: Positioning Strategy track — 4 modules x 5 lessons + assignments + rewards
-- =====================================================================

do $$
declare
  v_track uuid;
  v_m1 uuid; v_m2 uuid; v_m3 uuid; v_m4 uuid;
  v_lesson uuid;
begin
  select id into v_track from public.strategy_tracks where slug = 'positioning-strategy';
  if v_track is null then return; end if;

  -- ===== MODULE 1: Foundations of Positioning =====
  insert into public.strategy_modules (track_id, ord, title, summary, description, xp_reward)
  values (v_track, 0, 'Foundations of Positioning',
          'Why positioning is the highest-leverage decision a CMO makes.',
          'Define what positioning is and is not. See it as the upstream choice that decides which fights you can win.', 150)
  on conflict do nothing
  returning id into v_m1;
  if v_m1 is null then
    select id into v_m1 from public.strategy_modules where track_id = v_track and ord = 0;
  end if;

  insert into public.strategy_lessons (module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward) values
    (v_m1, 0, 'What Positioning Actually Means',
     'Distinguish positioning from messaging, branding, and tactics, and why CMOs confuse them.',
     '["Positioning is a deliberate choice of where to compete and how to be perceived.","It is upstream of messaging, brand, product, and pricing.","Definition: the meaningful and defensible space the brand occupies in the buyer''s mind, relative to alternatives.","STP framing: Segmentation, Targeting, Positioning.","Positioning is a decision, not a description."]'::jsonb, 8, 50),
    (v_m1, 1, 'Perception vs Product',
     'Why what the buyer believes outranks what the product is, and how to close the gap.',
     '["The market punishes you for what it perceives, not what is true on a spec sheet.","Three perception layers: function, identity, status.","Mismatch between product reality and buyer perception is positioning debt.","Closing the gap = product change OR perception change OR both.","Use Jobs-to-be-Done to surface the perception that actually drives buying."]'::jsonb, 8, 50),
    (v_m1, 2, 'Competitive Mental Availability',
     'Why being remembered at the moment of need beats being slightly better in features.',
     '["Mental availability (Byron Sharp / Ehrenberg-Bass): the probability your brand comes to mind in a buying situation.","Distinctive brand assets carry the position; logo, color, voice, tagline, ritual.","Category entry points (CEPs): the trigger contexts buyers actually have.","Positioning must attach the brand to specific CEPs, not generic claims.","Salience compounds; obscurity is the enemy."]'::jsonb, 9, 50),
    (v_m1, 3, 'Category Creation',
     'When to compete in an existing category and when to create a new one.',
     '["Category design (Play Bigger): when your truth doesn''t fit existing buckets.","Three category postures: dominate, differentiate, redefine.","Category creation is a 3-7 year commitment, not a campaign.","Premature category creation is the most common positioning mistake.","Test: would the analyst report you actually want even exist today?"]'::jsonb, 9, 50),
    (v_m1, 4, 'Positioning Failure Analysis',
     'A diagnostic toolkit for spotting broken positioning.',
     '["Symptoms of failure: pipeline plateau, win rates falling, discounting rising, sales motions sprawling.","Six failure modes: vague, copy-paste, internal-out, feature-list, audience-confused, undefended.","Run a positioning post-mortem: target / frame / value / proof / why-now.","Map customer language vs. company language; gaps reveal failure.","Bad positioning is rarely a marketing problem alone — fix product or pricing if needed."]'::jsonb, 10, 50);

  insert into public.module_assignments (module_id, title, prompt, rubric, success_criteria, max_score)
  values (v_m1, 'Diagnose a Positioning Failure',
    'Choose a real B2B company you know well (or your own). Diagnose its positioning using the failure-mode framework. Output: 1) one-sentence current position (as the market perceives it), 2) which of the six failure modes apply and the evidence, 3) the strategic cost in P&L language (revenue, CAC, retention), 4) one sentence proposing a sharper position, 5) why now.',
    '{"clarity":"One-sentence current position is concrete, falsifiable, and matches market evidence (not internal copy).","framework":"Names at least one of the six failure modes and explicitly cites evidence.","financial":"States the cost in P&L terms (revenue, CAC, payback, retention) — not vague impact.","proposed_position":"New position is specific, defensible, and different from current; not a slogan.","why_now":"Cites a concrete catalyst (market shift, regulation, competitor move, product change)."}'::jsonb,
    '["Names current position in one falsifiable sentence","Cites at least one failure mode with evidence","Quantifies cost in P&L language","Proposes a sharper, defensible position","Justifies timing with a concrete catalyst"]'::jsonb, 100)
  on conflict (module_id) do nothing;

  insert into public.module_rewards (module_id, ord, kind, title, description, content)
  values (v_m1, 0, 'letter', 'Letter from your Professor',
    'A short personal letter acknowledging the work behind Module 1.',
    '{"placeholder":true,"intent":"AI-generated personalised letter on unlock"}'::jsonb)
  on conflict do nothing;

  -- ===== MODULE 2: The Positioning Statement =====
  insert into public.strategy_modules (track_id, ord, title, summary, description, xp_reward, prerequisite_module_id)
  values (v_track, 1, 'The Positioning Statement',
          'How to write a positioning statement that survives a board challenge.',
          'Anatomy, sharpening, testing, and segment-adaptation of the positioning statement.', 150, v_m1)
  on conflict do nothing
  returning id into v_m2;
  if v_m2 is null then
    select id into v_m2 from public.strategy_modules where track_id = v_track and ord = 1;
  end if;

  insert into public.strategy_lessons (module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward) values
    (v_m2, 0, 'Anatomy of a Positioning Statement',
     'Break down the canonical positioning statement so you can write one in 20 minutes.',
     '["Canonical form: For [target], who [need], [brand] is the [frame] that [unique value], because [proof].","Each element is non-negotiable; missing one breaks the statement.","Target ≠ everyone; specificity is leverage.","Frame of reference is a strategic choice, not a category lookup.","Proof is concrete, not aspirational."]'::jsonb, 9, 50),
    (v_m2, 1, 'Target / Frame / Value / Proof',
     'Pressure-test each element against real evidence.',
     '["Target test: can you name three actual companies / personas that fit?","Frame test: does the buyer use this category word?","Value test: is it both meaningful AND ownable?","Proof test: is the evidence verifiable and durable?","Rewriting one element changes the others; iterate as a system."]'::jsonb, 9, 50),
    (v_m2, 2, 'Sharpening the Wedge',
     'Find the smallest specific claim that opens the largest market.',
     '["A wedge is a narrow entry into a broader strategy.","Three wedge types: persona wedge, problem wedge, channel wedge.","Wedge ≠ niche; the wedge is the door, not the room.","Sharpen by removing words, not adding them.","Test the wedge with a sales cold open: would a busy buyer keep listening?"]'::jsonb, 9, 50),
    (v_m2, 3, 'Testing Positioning',
     'Validate positioning with cheap, fast experiments before betting the plan.',
     '["Test methods: message-market fit (LinkedIn / paid copy), sales call A/B, analyst feedback, win/loss interviews.","North star: lift in qualified pipeline per dollar of spend.","Avoid survey-only validation; preference questions lie.","Triangulate behavior, money, and language.","Decide in advance what would falsify the positioning."]'::jsonb, 9, 50),
    (v_m2, 4, 'Adapting per Segment',
     'Hold the core position while flexing the framing per buyer segment.',
     '["Position once, message many.","Anchor: 1 core position, N segment-specific framings.","Segment lever 1: change frame of reference, not value.","Segment lever 2: change proof points, not target.","Drift signal: if the core position changes per segment, you have multiple positions, not one."]'::jsonb, 10, 50);

  insert into public.module_assignments (module_id, title, prompt, rubric, success_criteria, max_score)
  values (v_m2, 'Write a Positioning Statement',
    'Write a board-ready positioning statement for your company (or one you choose). Submit: 1) the full canonical statement, 2) the wedge in one sentence, 3) two segment-specific framings, 4) three proof points, 5) the falsification test you would run in the next 30 days.',
    '{"completeness":"Statement contains target, need, frame, value, and proof — none generic.","specificity":"Target is named (companies / personas), frame uses the buyer''s actual word, proof is verifiable.","wedge":"Wedge is narrower than the position and obviously a door into a bigger play.","segment_framings":"Two distinct framings that flex frame/proof but preserve core value.","falsification":"Names a measurable test with a pass/fail threshold inside 30 days."}'::jsonb,
    '["Full canonical statement with all 5 elements","Wedge sentence is specific and falsifiable","Two segment framings preserve core value","Three concrete, verifiable proof points","Stated 30-day falsification test with threshold"]'::jsonb, 100)
  on conflict (module_id) do nothing;

  insert into public.module_rewards (module_id, ord, kind, title, description, content)
  values (v_m2, 0, 'template', 'Positioning Statement Worksheet',
    'A printable executive worksheet for writing positioning statements at speed.',
    '{"placeholder":true,"sections":["Target","Frame","Value","Proof","Wedge","Falsification test"]}'::jsonb)
  on conflict do nothing;

  -- ===== MODULE 3: Differentiation & Category =====
  insert into public.strategy_modules (track_id, ord, title, summary, description, xp_reward, prerequisite_module_id)
  values (v_track, 2, 'Differentiation & Category',
          'Decide where to fight and how to defend.',
          'Competitive maps, category design, points of parity vs difference, frame of reference, defending the position.', 150, v_m2)
  on conflict do nothing
  returning id into v_m3;
  if v_m3 is null then
    select id into v_m3 from public.strategy_modules where track_id = v_track and ord = 2;
  end if;

  insert into public.strategy_lessons (module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward) values
    (v_m3, 0, 'Competitive Maps',
     'Read a market the way a strategist reads a chessboard.',
     '["A competitive map is a 2D plot of the dimensions buyers actually trade off.","Choose dimensions from buyer language, not internal feature lists.","Empty quadrants are not opportunities by default — verify demand.","Map at category, sub-category, and use-case levels.","The map is a decision tool; if it doesn''t change a decision, redo it."]'::jsonb, 9, 50),
    (v_m3, 1, 'Category Design',
     'When to design a category and when to fight inside one.',
     '["Category design is choosing the language the market will use.","Three modes: own the existing, sub-segment, or invent.","Owning = pricing power, gravitational pull, defensibility.","Inventing = years, capital, and a real point of view.","Most companies should fight inside a clear category before inventing one."]'::jsonb, 9, 50),
    (v_m3, 2, 'Points of Parity vs Difference',
     'Win by being meaningfully different on what matters and adequate on the rest.',
     '["Points of parity (POPs): table stakes that must be met to even be considered.","Points of difference (PODs): what you stake and defend.","Test: would a customer notice if your POD disappeared? If not, it''s a POP.","POD must be desirable (buyer cares), deliverable (you can do it), and differentiating (others don''t).","Stop competing on features that are POPs."]'::jsonb, 9, 50),
    (v_m3, 3, 'Frame of Reference',
     'The frame is a strategic choice that determines the comparison set and the buying budget.',
     '["Frame = the category bucket you ask the buyer to compare you in.","Same product, different frame = different value capture.","Frame too narrow: you cap your TAM. Frame too broad: you compete with giants.","Frame migration is allowed and sometimes necessary.","Always pressure-test the frame with three real buyers."]'::jsonb, 9, 50),
    (v_m3, 4, 'Defending Position',
     'Positioning that cannot be defended is a slogan, not a strategy.',
     '["Defensibility comes from: data, distribution, network, switching costs, expertise, ritual.","Audit defensibility against named competitors, not abstractions.","If your only defense is being faster, expect to be out-shipped.","Defense includes pricing, packaging, and partnerships, not just product.","Re-audit defensibility quarterly; markets move."]'::jsonb, 10, 50);

  insert into public.module_assignments (module_id, title, prompt, rubric, success_criteria, max_score)
  values (v_m3, 'Map and Defend Your Position',
    'Build a 2x2 competitive map for your market on dimensions buyers actually use. Place 6+ competitors and your brand. Then: 1) name your POPs and PODs (3 each), 2) name your frame of reference and defend the choice, 3) identify the single biggest defensibility gap and the 90-day move to close it.',
    '{"map_quality":"Dimensions are buyer-language, plot is honest (not flattering).","competitors":"At least 6 competitors placed with rationale.","pops_pods":"POPs and PODs are each specific and pass the would-customer-notice test.","frame_choice":"Frame is justified vs alternatives; trade-offs explicit.","defensibility":"One sharp gap + a concrete 90-day plan with named owner and metric."}'::jsonb,
    '["2x2 map with buyer-language axes","6+ competitors placed with rationale","3 POPs and 3 PODs each","Frame of reference defended","90-day defensibility plan with metric"]'::jsonb, 100)
  on conflict (module_id) do nothing;

  insert into public.module_rewards (module_id, ord, kind, title, description, content)
  values (v_m3, 0, 'quote_card', 'Strategist''s Discipline',
    'A quote card to anchor the discipline of choosing where not to play.',
    '{"placeholder":true,"quote":"Strategy is the discipline of choosing where not to play.","attribution":"After Michael Porter"}'::jsonb)
  on conflict do nothing;

  -- ===== MODULE 4: Operationalizing Positioning =====
  insert into public.strategy_modules (track_id, ord, title, summary, description, xp_reward, prerequisite_module_id)
  values (v_track, 3, 'Operationalizing Positioning',
          'Translate positioning into product, sales, marketing, and the P&L.',
          'Messaging, sales enablement, brand tracking, audits, and the board pitch.', 150, v_m3)
  on conflict do nothing
  returning id into v_m4;
  if v_m4 is null then
    select id into v_m4 from public.strategy_modules where track_id = v_track and ord = 3;
  end if;

  insert into public.strategy_lessons (module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward) values
    (v_m4, 0, 'Translating to Messaging',
     'Convert positioning into a messaging hierarchy without losing the spine.',
     '["Messaging hierarchy: position → value pillars → proof points → proof assets.","One position, three pillars, three proofs per pillar — keep it tight.","Avoid feature-as-pillar; pillars are buyer outcomes.","Voice and tone are separate from messaging architecture.","Test messaging by reading it back to a real buyer; if they restate it correctly, it works."]'::jsonb, 9, 50),
    (v_m4, 1, 'Positioning in Sales Enablement',
     'Make sales the system of record for positioning truth.',
     '["Reps need 4 things: ICP definition, opening pitch, objection handling, competitor positioning.","Pitch must be 90 seconds and survivable in a hallway.","Build a one-page sales narrative, not a 30-slide deck.","Positioning truth lives in the call recording, not the slide.","Read 5 calls a quarter; positioning drift shows up in language first."]'::jsonb, 9, 50),
    (v_m4, 2, 'Brand Tracking',
     'Measure whether the position is taking root in the market''s mind.',
     '["Track unaided awareness, aided awareness, and association on key attributes.","Set baselines, then track quarterly with the same panel.","Combine brand tracking with category-entry-point measurement.","Brand tracking is a leading indicator of pipeline; treat it that way.","Brand budget without tracking is a guess."]'::jsonb, 9, 50),
    (v_m4, 3, 'Positioning Audits',
     'Run a positioning audit like an internal consulting engagement.',
     '["Inputs: customer interviews, win/loss, sales calls, competitor pages, analyst notes, internal copy.","Outputs: current position vs intended position, gap analysis, three biggest moves.","Run every 6-12 months or after a major market shift.","Involve product and sales; positioning audits without them fail to land.","End with a decision document, not a deck."]'::jsonb, 9, 50),
    (v_m4, 4, 'Board-level Pitch',
     'Defend positioning to a board in 5 slides without diluting it.',
     '["Slide 1: market truth (what is changing).","Slide 2: chosen position in one sentence.","Slide 3: proof of traction (numbers, not anecdotes).","Slide 4: defensibility (why this stays ours).","Slide 5: the 90-day strategic move."]'::jsonb, 10, 50);

  insert into public.module_assignments (module_id, title, prompt, rubric, success_criteria, max_score)
  values (v_m4, 'Operationalization Brief',
    'Produce a board-ready operationalization brief for your positioning. Submit: 1) messaging hierarchy (position, 3 pillars, 3 proofs each), 2) the 90-second sales narrative verbatim, 3) brand tracking plan with 3 KPIs and baseline plan, 4) the 5-slide board pitch outline, 5) the 90-day operating plan owner-by-owner.',
    '{"hierarchy":"Position, 3 pillars, 3 proofs per pillar — buyer outcomes, not features.","sales_narrative":"90 seconds, hallway-survivable, ends with a clear next step.","brand_kpis":"3 KPIs with measurable baselines and tracking method.","board_pitch":"5 slides exactly; each slide''s job is explicit; numbers, not anecdotes.","operating_plan":"Each item has owner, deadline, success metric — no orphan tasks."}'::jsonb,
    '["Messaging hierarchy with 3 pillars and 9 proofs","90-second sales narrative","Brand tracking plan with 3 KPIs","5-slide board pitch outline","90-day plan with owners + metrics"]'::jsonb, 100)
  on conflict (module_id) do nothing;

  insert into public.module_rewards (module_id, ord, kind, title, description, content)
  values (v_m4, 0, 'letter', 'Track Completion Letter',
    'A personal letter from the Professor on completing the Positioning Strategy track.',
    '{"placeholder":true,"intent":"AI-generated track-completion letter that references the user''s journey"}'::jsonb)
  on conflict do nothing;

  -- ===== Update track totals =====
  update public.strategy_tracks
     set total_modules = 4,
         total_xp = 4 * 150 + 20 * 50
   where id = v_track;
end$$;
