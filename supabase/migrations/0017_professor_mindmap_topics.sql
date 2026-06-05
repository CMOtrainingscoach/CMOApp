-- Professor topic nodes for the unified Progress mindmap (short recap per conversation theme)

create table if not exists public.professor_mindmap_topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid references public.chat_conversations(id) on delete set null,
  title text not null,
  recap text not null,
  cluster_id text not null
    check (cluster_id in (
      'strategic_interests',
      'lifestyle_drivers',
      'authority_themes',
      'brand_signals',
      'knowledge_assets',
      'career_direction'
    )),
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists professor_mindmap_topics_user_updated_idx
  on public.professor_mindmap_topics (user_id, updated_at desc);

create index if not exists professor_mindmap_topics_embedding_idx
  on public.professor_mindmap_topics using ivfflat (embedding vector_cosine_ops) with (lists = 50);

alter table public.professor_mindmap_topics enable row level security;

drop policy if exists "professor_mindmap_topics select own" on public.professor_mindmap_topics;
create policy "professor_mindmap_topics select own"
  on public.professor_mindmap_topics
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "professor_mindmap_topics insert own" on public.professor_mindmap_topics;
create policy "professor_mindmap_topics insert own"
  on public.professor_mindmap_topics
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "professor_mindmap_topics update own" on public.professor_mindmap_topics;
create policy "professor_mindmap_topics update own"
  on public.professor_mindmap_topics
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "professor_mindmap_topics delete own" on public.professor_mindmap_topics;
create policy "professor_mindmap_topics delete own"
  on public.professor_mindmap_topics
  for delete
  to authenticated
  using (auth.uid() = user_id);
