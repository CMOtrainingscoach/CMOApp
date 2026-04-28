-- =====================================================================
-- CMO Ascension Mode — admin / app settings
-- =====================================================================

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  professor_name text not null default 'AI CMO Professor',
  professor_avatar_url text,
  professor_persona text not null default
    'A senior partner at a top consulting firm coaching her best protégé.',
  professor_traits text[] not null default
    array['direct','strategic','challenging','premium'],
  professor_response_length text not null default 'medium',
  professor_language text not null default 'en',
  professor_extra_notes text,
  professor_system_prompt_override text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

alter table public.app_settings enable row level security;

drop policy if exists "app_settings read auth" on public.app_settings;
create policy "app_settings read auth" on public.app_settings
  for select using (auth.role() = 'authenticated');

-- Writes happen from server actions using the service role key, so we do
-- not expose any insert/update/delete policies to authenticated users.

-- =====================================================================
-- Public storage bucket for the Professor's avatar (and future public assets)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('cmo-public', 'cmo-public', true)
on conflict (id) do nothing;

drop policy if exists "cmo-public read all" on storage.objects;
create policy "cmo-public read all" on storage.objects
  for select using (bucket_id = 'cmo-public');

-- Writes/deletes restricted to service role (bypasses RLS), so no policy needed.
