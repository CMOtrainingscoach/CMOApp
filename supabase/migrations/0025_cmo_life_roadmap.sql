-- CMO Life: global learner roadmap (milestones + per-user progress)

create table if not exists public.cmo_life_milestones (
  id uuid primary key default gen_random_uuid(),
  sort_order int not null,
  title text not null,
  description text,
  milestone_kind text not null
    check (milestone_kind in ('lesson', 'custom')),
  lesson_id uuid references public.strategy_lessons (id) on delete set null,
  custom_detail text,
  reward_text text,
  reward_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cmo_life_milestones_lesson_ck check (
    (milestone_kind = 'lesson' and lesson_id is not null)
    or (milestone_kind = 'custom' and lesson_id is null)
  )
);

create unique index if not exists cmo_life_milestones_sort_order_uidx
  on public.cmo_life_milestones (sort_order);

create index if not exists cmo_life_milestones_active_sort_idx
  on public.cmo_life_milestones (is_active, sort_order);

create table if not exists public.user_cmo_life_milestone_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_id uuid not null references public.cmo_life_milestones (id) on delete cascade,
  completed_at timestamptz,
  completion_source text not null default 'user_self'
    check (completion_source in ('lesson_auto', 'user_self', 'admin')),
  primary key (user_id, milestone_id)
);

create index if not exists user_cmo_life_milestone_progress_user_idx
  on public.user_cmo_life_milestone_progress (user_id);

create index if not exists user_cmo_life_milestone_progress_milestone_idx
  on public.user_cmo_life_milestone_progress (milestone_id);

alter table public.cmo_life_milestones enable row level security;
alter table public.user_cmo_life_milestone_progress enable row level security;

drop policy if exists "cmo_life_milestones select active" on public.cmo_life_milestones;
create policy "cmo_life_milestones select active"
  on public.cmo_life_milestones
  for select
  to authenticated
  using (is_active = true);

-- Learners manage their own progress rows; admins use service role.
drop policy if exists "user_cmo_life_milestone_progress select own" on public.user_cmo_life_milestone_progress;
create policy "user_cmo_life_milestone_progress select own"
  on public.user_cmo_life_milestone_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_cmo_life_milestone_progress insert own" on public.user_cmo_life_milestone_progress;
create policy "user_cmo_life_milestone_progress insert own"
  on public.user_cmo_life_milestone_progress
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_cmo_life_milestone_progress update own" on public.user_cmo_life_milestone_progress;
create policy "user_cmo_life_milestone_progress update own"
  on public.user_cmo_life_milestone_progress
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_cmo_life_milestone_progress delete own" on public.user_cmo_life_milestone_progress;
create policy "user_cmo_life_milestone_progress delete own"
  on public.user_cmo_life_milestone_progress
  for delete
  to authenticated
  using (auth.uid() = user_id);
