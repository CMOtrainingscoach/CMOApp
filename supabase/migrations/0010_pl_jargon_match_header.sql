-- Optional hero image for standalone P&L jargon matchup (/pl-lab/jargon-match).

alter table public.app_settings
  add column if not exists pl_jargon_match_header_image_url text;

comment on column public.app_settings.pl_jargon_match_header_image_url is
  'Banner image URL (public bucket) shown at top of /pl-lab/jargon-match; uploaded from admin.';
