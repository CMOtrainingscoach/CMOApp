-- Ephemeral rounds for Lifestyle Lab business scene matchup (Belgium vs international).

create table if not exists public.lifestyle_scene_match_rounds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scene text not null check (scene in ('belgium', 'international')),
  terms_snapshot jsonb not null,
  defs_snapshot jsonb not null,
  correct_pairs jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists lifestyle_scene_match_rounds_user_exp_idx
  on public.lifestyle_scene_match_rounds (user_id, expires_at desc);

alter table public.lifestyle_scene_match_rounds enable row level security;

drop policy if exists "lifestyle_scene_match_rounds_self_select"
  on public.lifestyle_scene_match_rounds;
drop policy if exists "lifestyle_scene_match_rounds_self_insert"
  on public.lifestyle_scene_match_rounds;
drop policy if exists "lifestyle_scene_match_rounds_self_delete"
  on public.lifestyle_scene_match_rounds;

create policy "lifestyle_scene_match_rounds_self_select"
  on public.lifestyle_scene_match_rounds for select to authenticated
  using (auth.uid() = user_id);

create policy "lifestyle_scene_match_rounds_self_insert"
  on public.lifestyle_scene_match_rounds for insert to authenticated
  with check (auth.uid() = user_id);

create policy "lifestyle_scene_match_rounds_self_delete"
  on public.lifestyle_scene_match_rounds for delete to authenticated
  using (auth.uid() = user_id);
