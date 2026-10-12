-- BB Player — lock down anonymous access on the existing production tables.
--
-- Production still has the prototype policies: anyone holding the public
-- (anon) key can read and UPDATE profiles, insert weeks, and call the
-- security-definer claim/release functions with any player name.
--
-- After this migration only server-side roles (postgres/service_role) can
-- read or write public tables. Member access comes back in a later migration
-- that requires SMS-verified Supabase Auth + an approved phone mapping, and
-- binds profile claims to auth.uid().
--
-- Data is not modified: profiles (names, photo paths, claim status), weeks
-- and claims are preserved. The transaction aborts if the profile/photo
-- fingerprint changes.

begin;

create temp table _bb_before on commit drop as
select count(*) as profiles,
       count(*) filter (where photo is not null and photo <> '') as photos,
       md5(coalesce(string_agg(profile_key || '|' || name || '|' || photo || '|' || coalesce(claimed_at::text, ''), ',' order by profile_key), '')) as fingerprint
from public.profiles;

do $$
declare b record;
begin
  select * into b from _bb_before;
  if b.profiles < 24 or b.photos <> b.profiles then
    raise exception 'Abort: expected >= 24 profiles all with photos, found % profiles / % photos', b.profiles, b.photos;
  end if;
end $$;

-- 1. Remove the open prototype policies.
drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_write on public.profiles;
drop policy if exists weeks_read     on public.weeks;
drop policy if exists weeks_write    on public.weeks;
drop policy if exists claims_read    on public.claims;

-- 2. RLS stays on (no policies = deny for anon/authenticated).
alter table public.profiles enable row level security;
alter table public.weeks    enable row level security;
alter table public.claims   enable row level security;

-- 3. Revoke direct table/sequence privileges from client roles.
--    `authenticated` is revoked too: until membership checks exist, any
--    signed-in account must not see or change the roster.
revoke all on public.profiles, public.weeks, public.claims from anon, authenticated, public;
revoke all on sequence public.profiles_id_seq, public.weeks_id_seq, public.claims_id_seq from anon, authenticated, public;

-- 4. Revoke the name-trusting RPCs from everyone except server roles.
revoke all on function public.claim_spot(text, text) from anon, authenticated, public;
revoke all on function public.release_spot(text)     from anon, authenticated, public;
revoke all on function public.participation()        from anon, authenticated, public;

-- 5. Stop Supabase's default privileges from re-opening new public objects
--    to anon. New objects must grant access explicitly.
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon, public;

-- 6. Verify data is untouched.
do $$
declare b record; a record;
begin
  select * into b from _bb_before;
  select count(*) as profiles,
         count(*) filter (where photo is not null and photo <> '') as photos,
         md5(coalesce(string_agg(profile_key || '|' || name || '|' || photo || '|' || coalesce(claimed_at::text, ''), ',' order by profile_key), '')) as fingerprint
    into a from public.profiles;
  if a.profiles <> b.profiles or a.photos <> b.photos or a.fingerprint <> b.fingerprint then
    raise exception 'Abort: profile/photo data changed during lockdown';
  end if;
  raise notice 'Lockdown OK: % profiles, % photos, fingerprint %', a.profiles, a.photos, a.fingerprint;
end $$;

commit;
