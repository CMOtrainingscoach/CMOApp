-- Allow image-based module completion rewards (public URL stored in content.image_url).
alter table public.module_rewards drop constraint if exists module_rewards_kind_check;

alter table public.module_rewards
  add constraint module_rewards_kind_check
  check (kind in ('letter', 'template', 'video', 'quote_card', 'image'));
