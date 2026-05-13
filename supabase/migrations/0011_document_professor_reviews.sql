-- Document Professor reviews (per-user, per-document streamed feedback persisted)

create table if not exists public.document_professor_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  review_angle text not null,
  feedback text not null,
  opening_question text,
  created_at timestamptz not null default now()
);

create index if not exists document_professor_reviews_doc_created_idx
  on public.document_professor_reviews (document_id, created_at desc);

create index if not exists document_professor_reviews_user_created_idx
  on public.document_professor_reviews (user_id, created_at desc);

alter table public.document_professor_reviews enable row level security;

drop policy if exists "document_professor_reviews select own"
  on public.document_professor_reviews;
create policy "document_professor_reviews select own"
  on public.document_professor_reviews
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "document_professor_reviews insert own"
  on public.document_professor_reviews;
create policy "document_professor_reviews insert own"
  on public.document_professor_reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);
