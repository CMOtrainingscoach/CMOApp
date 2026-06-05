-- One Professor hint per sheet-drill session (stored when used).

alter table public.pl_sheet_drill_sessions
  add column if not exists hint_md text;

comment on column public.pl_sheet_drill_sessions.hint_md is
  'Optional single Professor hint (Markdown) for this session; once set, no further hints.';
