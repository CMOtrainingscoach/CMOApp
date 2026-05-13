-- =====================================================================
-- Configurable XP levels 0–100 (Initiate … Visionary CMO)
-- =====================================================================

create table if not exists public.xp_level_config (
  level smallint not null primary key check (level between 0 and 100),
  rank_title text not null,
  min_total_xp integer not null check (min_total_xp >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint xp_level_config_min_xp_unique unique (min_total_xp)
);

create index if not exists xp_level_config_min_xp_desc_idx on public.xp_level_config (min_total_xp desc);

comment on table public.xp_level_config is
  'Admin-editable thresholds: inclusive min_total_xp for each learner level number 0–100; rank_title is displayed as rank.';

-- ---------------------------------------------------------------------
-- Resolve (level_number, rank_title) from total accumulated XP.
-- Thresholds apply at min_total_xp (user reaches level N once total_xp >= that row''s xp).
-- ---------------------------------------------------------------------

create or replace function public.xp_level_for_total(p_total_xp int)
returns table (out_level int, out_rank text)
language sql
stable
security definer
set search_path = public
as $$
  select c.level::int, c.rank_title::text
  from public.xp_level_config c
  where c.min_total_xp <= greatest(0, coalesce(p_total_xp, 0))
  order by c.min_total_xp desc
  limit 1
$$;

-- ---------------------------------------------------------------------
-- RLS + policies (readable by authenticated; admin writes via service role OR admin email)
-- ---------------------------------------------------------------------

alter table public.xp_level_config enable row level security;

drop policy if exists "xp_level_config_read_authenticated" on public.xp_level_config;
create policy "xp_level_config_read_authenticated"
  on public.xp_level_config for select to authenticated using (true);

-- No INSERT/UPDATE/DELETE for anon/authenticated; server actions use service role client.

-- ---------------------------------------------------------------------
-- Seed: quadratic XP curve toward ~550k at level 100, named bands 0→100.
-- Threshold at level k: ROUND(550000 * POWER(k / 100.0, 2))::int
-- ---------------------------------------------------------------------

insert into public.xp_level_config (level, rank_title, min_total_xp)
select
  n,
  (
    case
      when n = 0 then 'Initiate'
      when n = 1 then 'Novice apprentice'
      when n <= 4 then 'Foundations cadet'
      when n <= 9 then 'Practitioner in training'
      when n <= 14 then 'Tactical contributor'
      when n <= 19 then 'Operational specialist'
      when n <= 24 then 'Cross-functional collaborator'
      when n <= 29 then 'Growth analyst'
      when n <= 34 then 'Strategy associate'
      when n <= 39 then 'Integrated marketer'
      when n <= 44 then 'Program lead'
      when n <= 49 then 'Commercial partner'
      when n <= 54 then 'Brand & demand architect'
      when n <= 59 then 'Portfolio owner'
      when n <= 64 then 'Growth director'
      when n <= 69 then 'Revenue-aligned leader'
      when n <= 74 then 'Enterprise strategist'
      when n <= 79 then 'Chief-of-staff calibre lead'
      when n <= 84 then 'Chief marketing strategist'
      when n <= 89 then 'CMO-eligible executive'
      when n <= 95 then 'Chief marketing executor'
      when n <= 99 then 'Chief marketing ascendancy'
      else 'Visionary CMO'
    end || ' · Lv ' || lpad(n::text, 2, '0')
  ),
  ROUND(550000.0 * POWER(n / 100.0, 2))::int
from generate_series(0, 100) as n(n)
on conflict (level) do update
  set rank_title = excluded.rank_title,
      min_total_xp = excluded.min_total_xp,
      updated_at = now();

-- Keep level 0 at exactly zero XP boundary
update public.xp_level_config set min_total_xp = 0 where level = 0;

-- ---------------------------------------------------------------------
-- Recompute learner rank/level columns from configurable table (global + per lab)
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

  select out_level, out_rank into strict v_lab_level, v_lab_rank
    from public.xp_level_for_total(v_lab_total);

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

  select out_level, out_rank into strict v_level, v_rank
    from public.xp_level_for_total(v_total);

  insert into public.user_level (user_id, total_xp, level, rank, updated_at)
  values (new.user_id, v_total, v_level, v_rank, now())
  on conflict (user_id) do update
    set total_xp = excluded.total_xp,
        level    = excluded.level,
        rank     = excluded.rank,
        updated_at = excluded.updated_at;

  return new;
end$$;

-- Backfill current learner rows against new thresholds
-- (Avoid `UPDATE ... FROM lateral f(ul.col)` — Postgres does not allow the
-- updated table alias inside that LATERAL position; use a derived subquery.)

update public.user_lab_level ul
set level = computed.out_level,
    rank = computed.out_rank,
    updated_at = now()
from (
  select
    ul_inner.user_id,
    ul_inner.lab_slug,
    v.out_level,
    v.out_rank
  from public.user_lab_level ul_inner
  cross join lateral public.xp_level_for_total(ul_inner.total_xp) as v
) as computed
where ul.user_id = computed.user_id
  and ul.lab_slug = computed.lab_slug;

update public.user_level u
set level = computed.out_level,
    rank = computed.out_rank,
    updated_at = now()
from (
  select
    u_inner.user_id,
    v.out_level,
    v.out_rank
  from public.user_level u_inner
  cross join lateral public.xp_level_for_total(u_inner.total_xp) as v
) as computed
where u.user_id = computed.user_id;

-- ---------------------------------------------------------------------
-- Recompute all snapshots (call from admin after editing thresholds).
-- ---------------------------------------------------------------------

create or replace function public.refresh_xp_level_snapshots()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_lab_level ul
  set level = computed.out_level,
      rank = computed.out_rank,
      updated_at = now()
  from (
    select
      ul_inner.user_id,
      ul_inner.lab_slug,
      v.out_level,
      v.out_rank
    from public.user_lab_level ul_inner
    cross join lateral public.xp_level_for_total(ul_inner.total_xp) as v
  ) as computed
  where ul.user_id = computed.user_id
    and ul.lab_slug = computed.lab_slug;

  update public.user_level u
  set level = computed.out_level,
      rank = computed.out_rank,
      updated_at = now()
  from (
    select
      u_inner.user_id,
      v.out_level,
      v.out_rank
    from public.user_level u_inner
    cross join lateral public.xp_level_for_total(u_inner.total_xp) as v
  ) as computed
  where u.user_id = computed.user_id;
end$$;

revoke execute on function public.refresh_xp_level_snapshots() from anon;
revoke execute on function public.refresh_xp_level_snapshots() from authenticated;
grant execute on function public.refresh_xp_level_snapshots() to service_role;
