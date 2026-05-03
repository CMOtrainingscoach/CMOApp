-- =====================================================================
-- Module reading lists (books), task metadata, completion idempotency
-- =====================================================================

create table if not exists public.strategy_module_books (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.strategy_modules(id) on delete cascade,
  ord int not null default 0,
  title text not null,
  author text,
  url text,
  notes text,
  xp_reward int not null default 25 check (xp_reward >= 0 and xp_reward <= 500),
  created_at timestamptz not null default now()
);

create index if not exists strategy_module_books_module_ord_idx
  on public.strategy_module_books (module_id, ord);

alter table public.tasks
  add column if not exists metadata jsonb;

create table if not exists public.user_module_book_read_completion (
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.strategy_module_books(id) on delete cascade,
  xp_awarded int not null default 0,
  completed_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

create index if not exists user_module_book_read_completion_book_idx
  on public.user_module_book_read_completion (book_id);

-- RLS
alter table public.strategy_module_books enable row level security;

drop policy if exists "strategy_module_books_read" on public.strategy_module_books;
create policy "strategy_module_books_read" on public.strategy_module_books
  for select to authenticated using (true);

alter table public.user_module_book_read_completion enable row level security;

drop policy if exists "user_module_book_read_self" on public.user_module_book_read_completion;
create policy "user_module_book_read_self" on public.user_module_book_read_completion
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "user_module_book_read_insert" on public.user_module_book_read_completion;
create policy "user_module_book_read_insert" on public.user_module_book_read_completion
  for insert to authenticated with check (auth.uid() = user_id);
