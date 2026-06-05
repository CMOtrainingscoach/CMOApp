-- Executive Identity Assessment sessions, answers, and AI-generated artifacts

create table if not exists public.executive_identity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_bank_version int not null default 1,
  current_phase_index int not null default 0 check (current_phase_index between 0 and 7),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'generating', 'completed', 'failed')),
  answers jsonb not null default '[]'::jsonb,
  executive_identity_profile jsonb,
  final_report jsonb,
  brainmap jsonb,
  ui_state jsonb,
  generation_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists executive_identity_sessions_user_updated_idx
  on public.executive_identity_sessions (user_id, updated_at desc);

alter table public.executive_identity_sessions enable row level security;

drop policy if exists "executive_identity_sessions select own" on public.executive_identity_sessions;
create policy "executive_identity_sessions select own"
  on public.executive_identity_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "executive_identity_sessions insert own" on public.executive_identity_sessions;
create policy "executive_identity_sessions insert own"
  on public.executive_identity_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "executive_identity_sessions update own" on public.executive_identity_sessions;
create policy "executive_identity_sessions update own"
  on public.executive_identity_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "executive_identity_sessions delete own" on public.executive_identity_sessions;
create policy "executive_identity_sessions delete own"
  on public.executive_identity_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);
