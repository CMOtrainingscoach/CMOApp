-- Per-module toggle: when false, completing all lessons unlocks the next module (no graded assignment pass).

alter table public.strategy_modules
  add column if not exists assignment_required boolean not null default true;

comment on column public.strategy_modules.assignment_required is
  'When true, learners must pass this module''s graded assignment to unlock the next module. When false, completing all lessons is enough.';

create or replace function public.module_is_unlocked(
  p_user_id uuid,
  p_module_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_track uuid;
  v_ord int;
  v_prev uuid;
  v_pass boolean;
  v_assignment_required boolean;
begin
  select track_id, ord into v_track, v_ord
    from public.strategy_modules
   where id = p_module_id;

  if v_ord = 0 or v_ord is null then
    return true;
  end if;

  select id into v_prev
    from public.strategy_modules
   where track_id = v_track and ord = v_ord - 1
   limit 1;

  if v_prev is null then
    return true;
  end if;

  select coalesce(assignment_required, true)
    into v_assignment_required
    from public.strategy_modules
   where id = v_prev;

  if not v_assignment_required then
    select not exists (
      select 1
        from public.strategy_lessons l
       where l.module_id = v_prev
         and not exists (
           select 1
             from public.lesson_progress lp
            where lp.user_id = p_user_id
              and lp.lesson_id = l.id
              and lp.status = 'completed'
         )
    ) into v_pass;

    return coalesce(v_pass, false);
  end if;

  select exists (
    select 1
      from public.assignment_submissions s
      join public.assignment_reviews r on r.submission_id = s.id
      join public.module_assignments a on a.id = s.assignment_id
     where a.module_id = v_prev
       and s.user_id = p_user_id
       and r.verdict = 'pass'
  ) into v_pass;

  return coalesce(v_pass, false);
end$$;
