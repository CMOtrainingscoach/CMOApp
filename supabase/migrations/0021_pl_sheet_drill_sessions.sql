-- P&L sheet drill practice: one scenario + question per session, max 3 graded attempts.

create table if not exists public.pl_sheet_drill_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  scenario_id text not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),
  attempts_used int not null default 0 check (attempts_used >= 0 and attempts_used <= 3),
  xp_awarded boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pl_sheet_drill_sessions_user_exp_idx
  on public.pl_sheet_drill_sessions (user_id, expires_at desc);

alter table public.pl_sheet_drill_sessions enable row level security;

drop policy if exists "pl_sheet_drill_sessions_self_select" on public.pl_sheet_drill_sessions;
drop policy if exists "pl_sheet_drill_sessions_self_insert" on public.pl_sheet_drill_sessions;
drop policy if exists "pl_sheet_drill_sessions_self_update" on public.pl_sheet_drill_sessions;
drop policy if exists "pl_sheet_drill_sessions_self_delete" on public.pl_sheet_drill_sessions;

create policy "pl_sheet_drill_sessions_self_select"
  on public.pl_sheet_drill_sessions for select to authenticated
  using (auth.uid() = user_id);

create policy "pl_sheet_drill_sessions_self_insert"
  on public.pl_sheet_drill_sessions for insert to authenticated
  with check (auth.uid() = user_id);

create policy "pl_sheet_drill_sessions_self_update"
  on public.pl_sheet_drill_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "pl_sheet_drill_sessions_self_delete"
  on public.pl_sheet_drill_sessions for delete to authenticated
  using (auth.uid() = user_id);
