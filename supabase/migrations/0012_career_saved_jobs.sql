-- Tracked job listings from Career → Belgium scan ("Interested")

create table if not exists public.career_saved_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_url text not null,
  url_key text not null,
  title text not null,
  source_domain text,
  posted_at timestamptz,
  listing_snippet text,
  resume_quote text,
  stars smallint not null check (stars between 1 and 5),
  professor_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, url_key)
);

create index if not exists career_saved_jobs_user_created_idx
  on public.career_saved_jobs (user_id, created_at desc);

alter table public.career_saved_jobs enable row level security;

drop policy if exists "career_saved_jobs select own" on public.career_saved_jobs;
create policy "career_saved_jobs select own"
  on public.career_saved_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "career_saved_jobs insert own" on public.career_saved_jobs;
create policy "career_saved_jobs insert own"
  on public.career_saved_jobs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "career_saved_jobs update own" on public.career_saved_jobs;
create policy "career_saved_jobs update own"
  on public.career_saved_jobs
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "career_saved_jobs delete own" on public.career_saved_jobs;
create policy "career_saved_jobs delete own"
  on public.career_saved_jobs
  for delete
  to authenticated
  using (auth.uid() = user_id);
