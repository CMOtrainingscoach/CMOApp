-- Professor-defined subclusters under the six Executive Identity pillar anchors.

create table if not exists public.professor_mindmap_clusters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  anchor_cluster_id text not null
    check (anchor_cluster_id in (
      'strategic_interests',
      'lifestyle_drivers',
      'authority_themes',
      'brand_signals',
      'knowledge_assets',
      'career_direction'
    )),
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professor_mindmap_clusters_user_slug unique (user_id, slug)
);

create index if not exists professor_mindmap_clusters_user_anchor_idx
  on public.professor_mindmap_clusters (user_id, anchor_cluster_id, updated_at desc);

alter table public.professor_mindmap_topics
  add column if not exists professor_cluster_id uuid
    references public.professor_mindmap_clusters(id) on delete set null;

alter table public.professor_mindmap_topics
  add column if not exists anchor_link_note text;

create index if not exists professor_mindmap_topics_professor_cluster_idx
  on public.professor_mindmap_topics (user_id, professor_cluster_id);

alter table public.professor_mindmap_clusters enable row level security;

drop policy if exists "professor_mindmap_clusters select own" on public.professor_mindmap_clusters;
create policy "professor_mindmap_clusters select own"
  on public.professor_mindmap_clusters
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "professor_mindmap_clusters insert own" on public.professor_mindmap_clusters;
create policy "professor_mindmap_clusters insert own"
  on public.professor_mindmap_clusters
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "professor_mindmap_clusters update own" on public.professor_mindmap_clusters;
create policy "professor_mindmap_clusters update own"
  on public.professor_mindmap_clusters
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "professor_mindmap_clusters delete own" on public.professor_mindmap_clusters;
create policy "professor_mindmap_clusters delete own"
  on public.professor_mindmap_clusters
  for delete
  to authenticated
  using (auth.uid() = user_id);
