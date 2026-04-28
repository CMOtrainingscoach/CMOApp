-- =====================================================================
-- CMO Ascension Mode — first-login Professor onboarding
-- =====================================================================

-- Profiles: add onboarding state
alter table public.profiles
  add column if not exists onboarded_at timestamptz;

alter table public.profiles
  add column if not exists onboarding jsonb not null default '{}'::jsonb;

-- Chat conversations: add kind + metadata so we can track the
-- single onboarding conversation per user and which topics it has covered
alter table public.chat_conversations
  add column if not exists kind text not null default 'general';

alter table public.chat_conversations
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists chat_conv_user_kind_idx
  on public.chat_conversations(user_id, kind, updated_at desc);
