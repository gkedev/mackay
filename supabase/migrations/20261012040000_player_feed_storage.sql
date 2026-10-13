-- BB Player FEED: private photo storage (matches Broken Bodies Staging).
-- Photos live in a private bucket; only the server (service role, inside the
-- Cloudflare Worker) reads/writes them and the posts table. Browsers get
-- short-lived signed URLs from the Worker after a member check.
-- Profile photos are separate app assets and are never touched here.

-- 1. Private bucket: 4 MB per photo, JPEG only (the client converts first;
--    the Worker strips metadata before upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('player-feed', 'player-feed', false, 4194304, array['image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg'];

-- 2. Belt and braces: browser roles can never touch player-feed objects,
--    even if a permissive storage policy is added later.
drop policy if exists player_feed_private_boundary on storage.objects;
create policy player_feed_private_boundary on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'player-feed') with check (bucket_id <> 'player-feed');

-- 3. Posts table: server-only.
create table if not exists public.player_photo_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null check (char_length(original_name) between 1 and 120),
  caption text not null default '' check (char_length(caption) <= 280),
  width integer not null check (width between 1 and 8192),
  height integer not null check (height between 1 and 8192),
  created_at timestamptz not null default now(),
  constraint photo_owner_path check (storage_path ~ ('^' || user_id::text || '/[0-9a-f-]{36}[.]jpg$')),
  constraint photo_pixel_limit check (width::bigint * height <= 40000000)
);
create index if not exists player_photo_posts_newest on public.player_photo_posts (created_at desc, id desc);
alter table public.player_photo_posts enable row level security;
revoke all on public.player_photo_posts from anon, authenticated, public;
grant select, insert, update, delete on public.player_photo_posts to service_role;
