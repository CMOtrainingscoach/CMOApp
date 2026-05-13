-- Ephemeral rounds for standalone P&L jargon matching practice.

create table if not exists public.pl_jargon_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_snapshot jsonb not null,
  defs_snapshot jsonb not null,
  correct_pairs jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists pl_jargon_rounds_user_exp_idx
  on public.pl_jargon_rounds (user_id, expires_at desc);

alter table public.pl_jargon_rounds enable row level security;

drop policy if exists "pl_jargon_rounds_self_select" on public.pl_jargon_rounds;
drop policy if exists "pl_jargon_rounds_self_insert" on public.pl_jargon_rounds;
drop policy if exists "pl_jargon_rounds_self_delete" on public.pl_jargon_rounds;

create policy "pl_jargon_rounds_self_select"
  on public.pl_jargon_rounds for select to authenticated
  using (auth.uid() = user_id);

create policy "pl_jargon_rounds_self_insert"
  on public.pl_jargon_rounds for insert to authenticated
  with check (auth.uid() = user_id);

create policy "pl_jargon_rounds_self_delete"
  on public.pl_jargon_rounds for delete to authenticated
  using (auth.uid() = user_id);
