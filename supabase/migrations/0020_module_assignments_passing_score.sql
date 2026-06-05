-- Minimum score (out of max_score) required for assignment verdict "pass"
alter table public.module_assignments
  add column if not exists passing_score int;

update public.module_assignments
set passing_score = 80
where passing_score is null;

alter table public.module_assignments
  alter column passing_score set not null,
  alter column passing_score set default 80;

alter table public.module_assignments
  drop constraint if exists module_assignments_passing_score_bounds;

alter table public.module_assignments
  add constraint module_assignments_passing_score_bounds
  check (passing_score >= 1 and passing_score <= max_score);
