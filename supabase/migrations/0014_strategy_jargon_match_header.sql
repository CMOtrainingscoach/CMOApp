-- Optional hero image for Strategy Lab marketing jargon matchup (/strategy-lab/jargon-match).

alter table public.app_settings
  add column if not exists strategy_jargon_match_header_image_url text;

comment on column public.app_settings.strategy_jargon_match_header_image_url is
  'Banner image URL (public bucket) shown at top of /strategy-lab/jargon-match; uploaded from admin.';
