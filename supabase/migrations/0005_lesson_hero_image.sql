-- Optional per-lesson portrait / hero image (Strategy Lab), shown on the lesson page.

alter table public.strategy_lessons
  add column if not exists hero_image_url text;

comment on column public.strategy_lessons.hero_image_url is
  'Public URL (e.g. Supabase Storage) for this lesson''s Professor/hero image.';
