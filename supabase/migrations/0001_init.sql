-- =====================================================================
-- CMO Ascension Mode — initial schema
-- =====================================================================

create extension if not exists "vector";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'memory_kind') then
    create type memory_kind as enum (
      'career_goal','strength','weakness','reflection',
      'decision','insight','preference','ambition'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('uploaded','processing','ready','failed');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('pending','in_progress','completed','reviewed');
  end if;
  if not exists (select 1 from pg_type where typname = 'chat_role') then
    create type chat_role as enum ('user','assistant','system','tool');
  end if;
  if not exists (select 1 from pg_type where typname = 'skill_key') then
    create type skill_key as enum (
      'strategic_thinking','finance_pl','lead_gen','brand',
      'leadership','exec_comm','ai_marketing','lifestyle'
    );
  end if;
end$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  headline text default 'CMO IN THE MAKING',
  role text default 'CMO Ascension Track',
  persona_summary text,
  weekly_streak int not null default 0,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- learning_tracks (global, no RLS user filter)
-- ---------------------------------------------------------------------
create table if not exists public.learning_tracks (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  color text,
  lessons_count int not null default 0,
  ord int not null default 0
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.learning_tracks(id) on delete cascade,
  ord int not null default 0,
  title text not null,
  body text,
  type text not null default 'concept',
  estimated_minutes int not null default 15
);

-- ---------------------------------------------------------------------
-- track_progress
-- ---------------------------------------------------------------------
create table if not exists public.track_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.learning_tracks(id) on delete cascade,
  current_lesson_id uuid references public.lessons(id) on delete set null,
  percent int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, track_id)
);

-- ---------------------------------------------------------------------
-- skill_scores
-- ---------------------------------------------------------------------
create table if not exists public.skill_scores (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_key skill_key not null,
  score int not null default 50 check (score between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_key)
);

-- ---------------------------------------------------------------------
-- documents + chunks
-- ---------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_path text not null,
  mime_type text not null,
  size bigint not null default 0,
  status document_status not null default 'uploaded',
  summary text,
  key_insights jsonb,
  created_at timestamptz not null default now()
);
create index if not exists documents_user_idx on public.documents(user_id, created_at desc);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  tokens int not null default 0,
  embedding vector(1536)
);
create index if not exists document_chunks_doc_idx on public.document_chunks(document_id);
create index if not exists document_chunks_user_idx on public.document_chunks(user_id);
create index if not exists document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------
-- memories
-- ---------------------------------------------------------------------
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind memory_kind not null,
  content text not null,
  source_doc_id uuid references public.documents(id) on delete set null,
  source_msg_id uuid,
  embedding vector(1536),
  created_at timestamptz not null default now()
);
create index if not exists memories_user_idx on public.memories(user_id, created_at desc);
create index if not exists memories_embedding_idx
  on public.memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ---------------------------------------------------------------------
-- tasks + submissions
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  difficulty int not null default 3 check (difficulty between 1 and 5),
  deadline timestamptz,
  status task_status not null default 'pending',
  score int check (score between 0 and 100),
  feedback jsonb,
  source text not null default 'coach',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists tasks_user_idx on public.tasks(user_id, status, deadline);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  attachments jsonb,
  score int check (score between 0 and 100),
  ai_feedback jsonb,
  created_at timestamptz not null default now()
);
create index if not exists task_submissions_user_idx on public.task_submissions(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- daily_missions, weekly_reviews, reflections
-- ---------------------------------------------------------------------
create table if not exists public.daily_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  study_item text not null,
  task_item text not null,
  reflection_prompt text not null,
  lifestyle_item text not null,
  status text not null default 'active',
  progress_percent int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, mission_date)
);

create table if not exists public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  summary text,
  wins jsonb,
  gaps jsonb,
  next_focus jsonb,
  score_delta jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  response text not null,
  mood text,
  created_at timestamptz not null default now()
);
create index if not exists reflections_user_idx on public.reflections(user_id, created_at desc);

-- ---------------------------------------------------------------------
-- chat
-- ---------------------------------------------------------------------
create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_conv_user_idx on public.chat_conversations(user_id, updated_at desc);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role chat_role not null,
  content text not null,
  tokens int,
  created_at timestamptz not null default now()
);
create index if not exists chat_msg_conv_idx on public.chat_messages(conversation_id, created_at);

-- =====================================================================
-- Vector retrieval RPC: union memories + document chunks for a user
-- =====================================================================
create or replace function public.match_user_context(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 8
)
returns table (
  source text,
  ref_id uuid,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  with mem as (
    select 'memory'::text as source, id as ref_id, content,
           1 - (embedding <=> p_query_embedding) as similarity
    from public.memories
    where user_id = p_user_id and embedding is not null
    order by embedding <=> p_query_embedding
    limit p_match_count
  ),
  chunks as (
    select 'document'::text as source, id as ref_id, content,
           1 - (embedding <=> p_query_embedding) as similarity
    from public.document_chunks
    where user_id = p_user_id and embedding is not null
    order by embedding <=> p_query_embedding
    limit p_match_count
  )
  select * from mem
  union all
  select * from chunks
  order by similarity desc
  limit p_match_count;
$$;

revoke all on function public.match_user_context(uuid, vector, int) from public;
grant execute on function public.match_user_context(uuid, vector, int) to authenticated, service_role;

-- =====================================================================
-- Trigger: seed profile, default skill scores, and today's daily mission
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  k skill_key;
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  for k in select unnest(enum_range(null::skill_key)) loop
    insert into public.skill_scores (user_id, skill_key, score)
    values (new.id, k, 50)
    on conflict (user_id, skill_key) do nothing;
  end loop;

  insert into public.daily_missions (
    user_id, mission_date, study_item, task_item, reflection_prompt, lifestyle_item
  ) values (
    new.id,
    current_date,
    'Study: P&L basics — Gross Margin vs Contribution Margin.',
    'Task: Rewrite one current strategy in financial language (revenue, GM, payback).',
    'Reflection: What business lever did you actually move today?',
    'Lifestyle: Train, 30 minutes deep work, no scattered execution.'
  ) on conflict (user_id, mission_date) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security
-- =====================================================================

alter table public.profiles            enable row level security;
alter table public.memories            enable row level security;
alter table public.documents           enable row level security;
alter table public.document_chunks     enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_submissions    enable row level security;
alter table public.learning_tracks     enable row level security;
alter table public.lessons             enable row level security;
alter table public.track_progress      enable row level security;
alter table public.skill_scores        enable row level security;
alter table public.daily_missions      enable row level security;
alter table public.weekly_reviews      enable row level security;
alter table public.reflections         enable row level security;
alter table public.chat_conversations  enable row level security;
alter table public.chat_messages       enable row level security;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- helper: define a generic per-user policy for tables with user_id
do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'memories','documents','document_chunks','tasks','task_submissions',
      'track_progress','skill_scores','daily_missions','weekly_reviews',
      'reflections','chat_conversations','chat_messages'
    ])
  loop
    execute format('drop policy if exists "%1$s self all" on public.%1$s', t);
    execute format(
      'create policy "%1$s self all" on public.%1$s
         for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end$$;

-- learning_tracks + lessons: read for any authenticated user
drop policy if exists "tracks read all" on public.learning_tracks;
create policy "tracks read all" on public.learning_tracks
  for select using (auth.role() = 'authenticated');
drop policy if exists "lessons read all" on public.lessons;
create policy "lessons read all" on public.lessons
  for select using (auth.role() = 'authenticated');

-- =====================================================================
-- Storage bucket for documents
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('cmo-docs', 'cmo-docs', false)
on conflict (id) do nothing;

drop policy if exists "cmo-docs read own" on storage.objects;
create policy "cmo-docs read own" on storage.objects
  for select using (
    bucket_id = 'cmo-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "cmo-docs insert own" on storage.objects;
create policy "cmo-docs insert own" on storage.objects
  for insert with check (
    bucket_id = 'cmo-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "cmo-docs delete own" on storage.objects;
create policy "cmo-docs delete own" on storage.objects
  for delete using (
    bucket_id = 'cmo-docs'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- =====================================================================
-- Seed: learning tracks + lessons
-- =====================================================================
insert into public.learning_tracks (id, slug, title, description, color, lessons_count, ord) values
  ('11111111-1111-1111-1111-111111111111', 'pl-business-finance', 'P&L and Business Finance',
   'Master the language of business, unit economics, and how marketing drives real profit.',
   '#D4AF37', 8, 1),
  ('22222222-2222-2222-2222-222222222222', 'strategic-thinking', 'Strategic Thinking for CMOs',
   'Frameworks for strategy, positioning, and competitive analysis at the executive level.',
   '#E8C66E', 6, 2),
  ('33333333-3333-3333-3333-333333333333', 'lead-gen-engine', 'The Lead Generation Engine',
   'Build a measurable, repeatable demand engine — pipeline, conversion, payback.',
   '#B8941F', 6, 3),
  ('44444444-4444-4444-4444-444444444444', 'executive-communication', 'Executive Communication',
   'Translate strategy into financial impact. Write and present like a CMO.',
   '#8B6F2F', 5, 4),
  ('55555555-5555-5555-5555-555555555555', 'leadership-and-team', 'Leadership and Team Building',
   'Hire, lead, and scale a marketing organization that compounds.',
   '#A8893E', 5, 5)
on conflict (id) do nothing;

insert into public.lessons (id, track_id, ord, title, body, type, estimated_minutes) values
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',1,'Unit Economics 101','Understand CAC, LTV, Payback Period.','concept',20),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',2,'Gross Margin vs Contribution Margin','The difference and why CMOs must know both.','concept',25),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',3,'Marketing ROI in P&L Terms','Move beyond MQLs into financial impact.','concept',20),
  (gen_random_uuid(),'11111111-1111-1111-1111-111111111111',4,'Pricing as a Growth Lever','How pricing decisions reshape margin and CAC.','concept',25),
  (gen_random_uuid(),'22222222-2222-2222-2222-222222222222',1,'5C Analysis','Customer, Company, Competition, Collaborators, Context.','concept',20),
  (gen_random_uuid(),'22222222-2222-2222-2222-222222222222',2,'Porter Five Forces','Industry structure and where the profit pools are.','concept',25),
  (gen_random_uuid(),'33333333-3333-3333-3333-333333333333',1,'ICP and Buyer Persona','Define who you sell to with surgical precision.','concept',20),
  (gen_random_uuid(),'33333333-3333-3333-3333-333333333333',2,'Bowtie Funnel','Pipeline coverage, conversion, and expansion.','concept',25),
  (gen_random_uuid(),'44444444-4444-4444-4444-444444444444',1,'The CMO Memo','One page. Decision, options, recommendation, P&L impact.','concept',20),
  (gen_random_uuid(),'55555555-5555-5555-5555-555555555555',1,'Hiring the First Marketing Team','Roles, sequencing, and accountability.','concept',25)
on conflict do nothing;
