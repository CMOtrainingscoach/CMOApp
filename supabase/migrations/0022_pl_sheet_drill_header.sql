-- Optional hero image for P&L sheet drill (/pl-lab/pl-sheet-drill).

alter table public.app_settings
  add column if not exists pl_sheet_drill_header_image_url text;

comment on column public.app_settings.pl_sheet_drill_header_image_url is
  'Banner image URL (public bucket) shown at top of /pl-lab/pl-sheet-drill; uploaded from admin.';
