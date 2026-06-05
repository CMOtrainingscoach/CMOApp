-- Chat transcript for Executive Identity Assessment (Professor-led interview).

alter table public.executive_identity_sessions
  add column if not exists conversation jsonb not null default '[]'::jsonb;

-- Drop phased wizard constraint; chat flows keep current_phase_index at 0.
alter table public.executive_identity_sessions
  drop constraint if exists executive_identity_sessions_current_phase_index_check;
