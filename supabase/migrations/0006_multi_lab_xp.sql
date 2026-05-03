-- =====================================================================
-- Multi-lab XP: per-lab level/rank + overall rollup
-- =====================================================================

-- ---------------------------------------------------------------------
-- strategy_tracks: which lab owns this curriculum (content partition)
-- ---------------------------------------------------------------------
alter table public.strategy_tracks
  add column if not exists lab_slug text;

update public.strategy_tracks set lab_slug = coalesce(lab_slug, 'strategy');

alter table public.strategy_tracks alter column lab_slug set not null;
alter table public.strategy_tracks alter column lab_slug set default 'strategy';

alter table public.strategy_tracks drop constraint if exists strategy_tracks_lab_slug_check;
alter table public.strategy_tracks
  add constraint strategy_tracks_lab_slug_check
  check (lab_slug in ('strategy', 'pl', 'lifestyle', 'career'));

create index if not exists strategy_tracks_lab_ord_idx on public.strategy_tracks (lab_slug, ord);

-- Existing seed upserts omit lab_slug → default fills; ensure backfill stays strategy
update public.strategy_tracks set lab_slug = 'strategy' where lab_slug is null;

-- ---------------------------------------------------------------------
-- xp_log: attribute each XP event to a lab (or 'shared' for cross-lab e.g. streak)
-- ---------------------------------------------------------------------
alter table public.xp_log add column if not exists lab_slug text;

update public.xp_log set lab_slug = coalesce(lab_slug, 'strategy');

alter table public.xp_log alter column lab_slug set not null;
alter table public.xp_log alter column lab_slug set default 'strategy';

alter table public.xp_log drop constraint if exists xp_log_lab_slug_check;
alter table public.xp_log
  add constraint xp_log_lab_slug_check
  check (lab_slug in ('strategy', 'pl', 'lifestyle', 'career', 'shared'));

create index if not exists xp_log_user_lab_idx on public.xp_log (user_id, lab_slug);

-- ---------------------------------------------------------------------
-- user_lab_level: per-user, per-lab totals (excluding only overall — same rank curve)
-- ---------------------------------------------------------------------
create table if not exists public.user_lab_level (
  user_id uuid not null references auth.users(id) on delete cascade,
  lab_slug text not null,
  total_xp int not null default 0,
  level int not null default 1,
  rank text not null default 'Initiate',
  updated_at timestamptz not null default now(),
  primary key (user_id, lab_slug),
  constraint user_lab_level_lab_slug_check
    check (lab_slug in ('strategy', 'pl', 'lifestyle', 'career', 'shared'))
);

create index if not exists user_lab_level_user_idx on public.user_lab_level (user_id);

alter table public.user_lab_level enable row level security;

drop policy if exists "user_lab_level_self" on public.user_lab_level;

create policy "user_lab_level_self" on public.user_lab_level
  for select to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Trigger: recompute THIS lab row + overall user_level
-- ---------------------------------------------------------------------
create or replace function public.handle_xp_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lab_total int;
  v_lab_level int;
  v_lab_rank  text;
  v_total int;
  v_level int;
  v_rank  text;
begin
  select coalesce(sum(xp_delta), 0) into v_lab_total
    from public.xp_log
   where user_id = new.user_id and lab_slug = new.lab_slug;

  v_lab_level := greatest(1, floor(v_lab_total::numeric / 100)::int + 1);
  v_lab_rank := public.compute_rank(v_lab_total);

  insert into public.user_lab_level (user_id, lab_slug, total_xp, level, rank, updated_at)
  values (new.user_id, new.lab_slug, v_lab_total, v_lab_level, v_lab_rank, now())
  on conflict (user_id, lab_slug) do update
    set total_xp = excluded.total_xp,
        level    = excluded.level,
        rank     = excluded.rank,
        updated_at = excluded.updated_at;

  select coalesce(sum(xp_delta), 0) into v_total
    from public.xp_log
   where user_id = new.user_id;

  v_level := greatest(1, floor(v_total::numeric / 100)::int + 1);
  v_rank := public.compute_rank(v_total);

  insert into public.user_level (user_id, total_xp, level, rank, updated_at)
  values (new.user_id, v_total, v_level, v_rank, now())
  on conflict (user_id) do update
    set total_xp = excluded.total_xp,
        level    = excluded.level,
        rank     = excluded.rank,
        updated_at = excluded.updated_at;

  return new;
end$$;

-- ---------------------------------------------------------------------
-- Backfill user_lab_level from existing xp_log rows
-- ---------------------------------------------------------------------
insert into public.user_lab_level (user_id, lab_slug, total_xp, level, rank, updated_at)
select l.user_id, l.lab_slug,
       sum(l.xp_delta)::int as total_xp,
       greatest(1, floor(sum(l.xp_delta)::numeric / 100)::int + 1) as lvl,
       public.compute_rank(sum(l.xp_delta)::int) as rnk,
       now()
from public.xp_log l
group by l.user_id, l.lab_slug
on conflict (user_id, lab_slug) do update
  set total_xp = excluded.total_xp,
      level = excluded.level,
      rank = excluded.rank,
      updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------
-- Starter P&L track (minimal v1 curriculum)
-- ---------------------------------------------------------------------
insert into public.strategy_tracks (
  slug, title, tagline, description, color, ord,
  total_modules, total_xp, is_active, lab_slug
)
values (
  'pl-business-finance',
  'Business Finance Foundations',
  'Speak CFO. Decide with numbers.',
  'Unit economics, margin architecture, and how marketing choices flow into the P&L — the same rails as Strategy Lab.',
  '#3FB982',
  1,
  1,
  200,
  true,
  'pl'
)
on conflict (slug) do update set
  title = excluded.title,
  tagline = excluded.tagline,
  description = excluded.description,
  color = excluded.color,
  ord = excluded.ord,
  is_active = excluded.is_active,
  lab_slug = excluded.lab_slug;

do $$
declare
  v_tid uuid;
  v_mid uuid;
begin
  select id into v_tid from public.strategy_tracks where slug = 'pl-business-finance' limit 1;
  if v_tid is null then return; end if;

  insert into public.strategy_modules (
    track_id, ord, title, summary, description, xp_reward
  )
  values (
    v_tid,
    0,
    'Unit Economics 101',
    'CAC, LTV, payback in practice.',
    'Turn abstract finance vocabulary into defendable ratios you can pitch to finance.',
    150
  )
  on conflict do nothing
  returning id into v_mid;

  if v_mid is null then
    select id into v_mid from public.strategy_modules where track_id = v_tid and ord = 0;
  end if;

  if v_mid is null then return; end if;

  if not exists (
    select 1 from public.strategy_lessons where module_id = v_mid and ord = 0
  ) then
    insert into public.strategy_lessons (
      module_id, ord, title, learning_objective, key_points, estimated_minutes, xp_reward
    )
    values (
      v_mid,
      0,
      'CAC, LTV, and payback period',
      'You will quantify acquisition efficiency and retention economics for a realistic GTM snapshot.',
      '["Calculate CAC from sales & marketing spend and new customers","Define LTV using margin, not vanity revenue","Explain payback period and why CFOs obsess over it"]'::jsonb,
      12,
      50
    );
  end if;

  insert into public.module_assignments (module_id, title, prompt, rubric, success_criteria, max_score)
  select v_mid,
    'Unit economics sanity check',
    'Using a fictional B2B SaaS with $450k/month S&M and 180 net new logos, compute approximate CAC, justify an LTV proxy using 24-month gross margin (state assumptions), and state payback months. Submit: formulas, worked numbers in a table, and one paragraph for the CFO tying marketing spend to runway risk.',
    '{"cac":"Clearly defines numerator (S&M attributable to logos) and denominator (new logos).","ltv_proxy":"Uses margin—not revenue—and states retention / lifetime assumptions explicitly.","payback":"Shows months to recover CAC from gross profit per logo.","cfo_bridge":"Paragraph speaks in risk, runway, or efficiency—not vanity metrics."}'::jsonb,
    '["CAC calculation with labeled inputs","LTV proxy with stated margin and lifetime assumptions","Payback expressed in months","CFO-facing paragraph linking spend to runway or efficiency risk"]'::jsonb,
    100
  where not exists (select 1 from public.module_assignments a where a.module_id = v_mid);

  insert into public.module_rewards (module_id, ord, kind, title, description, content)
  select
    v_mid,
    0,
    'letter',
    'Letter from your Professor',
    'A short acknowledgement of your first P&L Lab module.',
    '{"placeholder":true,"intent":"finance-first congratulation tied to ratios"}'::jsonb
  where not exists (select 1 from public.module_rewards r where r.module_id = v_mid and r.ord = 0);

end$$;

update public.strategy_tracks
set total_modules = (
  select count(*)::int from public.strategy_modules m where m.track_id = strategy_tracks.id
),
total_xp = coalesce(
  (
    select sum(m.xp_reward)::int + coalesce(sum(l.xp_reward), 0)::int
    from public.strategy_modules m
    left join public.strategy_lessons l on l.module_id = m.id
    where m.track_id = strategy_tracks.id
  ), 200)
where slug = 'pl-business-finance';
