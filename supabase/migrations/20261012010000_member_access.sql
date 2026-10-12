-- BB Player — member-only access for SMS-verified players.
--
-- Flow: organizer privately maps an approved phone to an existing profile ->
-- player verifies by SMS (Supabase Auth + Twilio Verify) -> verified, mapped
-- players see the roster/photo pool -> player picks their own photo, which
-- atomically binds the profile to auth.uid() -> later sign-ins use a Supabase
-- passkey on the same account (membership follows the account, not the JWT).
--
-- Requires 20261012000000_lock_down_anonymous_access.sql. Nothing is granted
-- to anon. Existing profiles, photo paths, claimed_at values, weeks and
-- claims are preserved; the transaction aborts if the profile/photo
-- fingerprint changes.

begin;

create temp table _bb_before on commit drop as
select count(*) as profiles,
       md5(coalesce(string_agg(profile_key || '|' || name || '|' || photo || '|' || coalesce(claimed_at::text, ''), ',' order by profile_key), '')) as fingerprint
from public.profiles;

-- 1. Ownership: one Supabase user per profile.
alter table public.profiles add column if not exists auth_user_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_auth_user_id_key') then
    alter table public.profiles add constraint profiles_auth_user_id_key unique (auth_user_id);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_auth_user_id_fkey') then
    alter table public.profiles add constraint profiles_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete set null;
  end if;
end $$;

-- 2. Private phone map (no client access at all; managed server-side).
create table if not exists public.player_phone_map (
  profile_key text primary key references public.profiles(profile_key) on delete cascade,
  phone_e164 text not null unique check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  is_organizer boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.player_phone_map enable row level security;
revoke all on public.player_phone_map from anon, authenticated, public;
drop policy if exists player_phone_map_self_read on public.player_phone_map;

-- 3. Helpers (security definer, fixed search_path, not callable by anon).
-- Caller's verified phone in E.164, from auth.users (works for SMS and passkey sessions).
create or replace function public.bb_verified_phone()
returns text language sql stable security definer set search_path = '' as $$
  select '+' || regexp_replace(u.phone, '\D', '', 'g')
  from auth.users u
  where u.id = (select auth.uid()) and u.phone is not null and u.phone <> ''
    and u.phone_confirmed_at is not null
$$;

-- Profile key mapped to the caller's verified phone.
create or replace function public.bb_mapped_profile_key()
returns text language sql stable security definer set search_path = '' as $$
  select m.profile_key from public.player_phone_map m
  where m.phone_e164 = public.bb_verified_phone()
$$;

-- Member = owns a profile, or has a verified phone on the approved map.
create or replace function public.bb_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    exists (select 1 from public.profiles p where p.auth_user_id = (select auth.uid()))
    or public.bb_mapped_profile_key() is not null)
$$;

create or replace function public.bb_is_organizer()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.player_phone_map m
    left join public.profiles p on p.profile_key = m.profile_key
    where m.is_organizer
      and (m.phone_e164 = public.bb_verified_phone() or p.auth_user_id = (select auth.uid())))
$$;

-- Name of the profile owned by the caller (used for court claims).
create or replace function public.bb_owned_player_name()
returns text language sql stable security definer set search_path = '' as $$
  select p.name from public.profiles p where p.auth_user_id = (select auth.uid())
$$;

-- 4. Member reads.
revoke all on public.profiles from anon, authenticated, public;
grant select (profile_key, name, photo) on public.profiles to authenticated;
drop policy if exists profiles_group_read on public.profiles;
drop policy if exists profiles_member_read on public.profiles;
create policy profiles_member_read on public.profiles
  for select to authenticated using ((select public.bb_is_member()));

revoke all on public.weeks from anon, authenticated, public;
grant select (id, event_date, courts, court_times, created_at) on public.weeks to authenticated;
grant insert (event_date, courts, court_times) on public.weeks to authenticated;
drop policy if exists weeks_group_read on public.weeks;
drop policy if exists weeks_member_read on public.weeks;
drop policy if exists weeks_organizer_insert on public.weeks;
create policy weeks_member_read on public.weeks
  for select to authenticated using ((select public.bb_is_member()));
create policy weeks_organizer_insert on public.weeks
  for insert to authenticated with check ((select public.bb_is_organizer()));

revoke all on public.claims from anon, authenticated, public;
grant select (id, week_id, player, court_time, created_at) on public.claims to authenticated;
drop policy if exists claims_group_read on public.claims;
drop policy if exists claims_member_read on public.claims;
create policy claims_member_read on public.claims
  for select to authenticated using ((select public.bb_is_member()));

-- 5. Profile RPCs (names match the staging app).
-- The caller's profile: owned one, else the one mapped to their verified phone.
create or replace function public.current_player_profile()
returns table(profile_key text, name text, photo text, claimed boolean)
language sql stable security definer set search_path = '' as $$
  select p.profile_key, p.name, p.photo, p.auth_user_id is not null
  from public.profiles p
  where p.auth_user_id = (select auth.uid())
     or (p.profile_key = public.bb_mapped_profile_key()
         and (p.auth_user_id is null or p.auth_user_id = (select auth.uid())))
  order by (p.auth_user_id = (select auth.uid())) desc nulls last
  limit 1
$$;

-- Claim a photo from the pool. Only the profile mapped to the caller's
-- verified phone can be claimed; an owned profile is never reassigned.
create or replace function public.claim_profile(p_profile_key text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_owner uuid;
begin
  if v_uid is null then return 'not_signed_in'; end if;
  if exists (select 1 from public.profiles where auth_user_id = v_uid and profile_key <> p_profile_key) then
    return 'already_claimed_other';
  end if;
  select auth_user_id into v_owner from public.profiles where profile_key = p_profile_key for update;
  if not found then return 'no_such_profile'; end if;
  if v_owner = v_uid then return 'ok'; end if;
  if v_owner is not null then return 'claimed_by_someone_else'; end if;
  if public.bb_mapped_profile_key() is distinct from p_profile_key then return 'not_your_profile'; end if;
  update public.profiles set auth_user_id = v_uid, claimed_at = now() where profile_key = p_profile_key;
  return 'ok';
end $$;

drop function if exists public.claim_current_player_profile();
create function public.claim_current_player_profile()
returns table(profile_key text, name text, photo text)
language plpgsql security definer set search_path = '' as $$
declare v_key text;
begin
  select coalesce(
    (select p.profile_key from public.profiles p where p.auth_user_id = (select auth.uid())),
    public.bb_mapped_profile_key()) into v_key;
  if v_key is null or public.claim_profile(v_key) <> 'ok' then return; end if;
  return query select p.profile_key, p.name, p.photo from public.profiles p where p.profile_key = v_key;
end $$;

-- 6. Court spots: player comes from the owned profile; the week row is
-- locked so concurrent claims cannot exceed capacity.
drop function if exists public.claim_spot(text, text);
drop function if exists public.release_spot(text);

create or replace function public.claim_spot(p_court_time text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_week_id bigint;
  v_court_times jsonb;
  v_player text := public.bb_owned_player_name();
  v_capacity int;
  v_taken int;
begin
  if v_player is null then return 'profile_not_linked'; end if;
  select w.id, w.court_times into v_week_id, v_court_times
  from public.weeks w order by w.created_at desc, w.id desc limit 1 for update;
  if v_week_id is null then return 'no_week'; end if;
  select sum((item->>'spots')::int) into v_capacity
  from jsonb_array_elements(v_court_times) item where item->>'time' = p_court_time;
  if v_capacity is null then return 'bad_time'; end if;
  select count(*) into v_taken from public.claims c
  where c.week_id = v_week_id and c.court_time = p_court_time and c.player <> v_player;
  if v_taken >= v_capacity then return 'full'; end if;
  insert into public.claims (week_id, player, court_time)
  values (v_week_id, v_player, p_court_time)
  on conflict (week_id, player) do update set court_time = excluded.court_time;
  return 'ok';
end $$;

create or replace function public.release_spot()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_player text := public.bb_owned_player_name();
  v_week_id bigint;
begin
  if v_player is null then return; end if;
  select w.id into v_week_id from public.weeks w order by w.created_at desc, w.id desc limit 1;
  delete from public.claims c where c.week_id = v_week_id and c.player = v_player;
end $$;

create or replace function public.participation()
returns table(player text, games bigint)
language sql stable security definer set search_path = '' as $$
  select c.player, count(*)::bigint from public.claims c
  where public.bb_is_member()
  group by c.player order by 2 desc, 1 asc
$$;

-- 7. Function privileges: authenticated only; internals not callable.
revoke all on function public.bb_verified_phone(), public.bb_mapped_profile_key(),
  public.bb_owned_player_name() from public, anon, authenticated;
revoke all on function public.bb_is_member(), public.bb_is_organizer() from public, anon;
grant execute on function public.bb_is_member(), public.bb_is_organizer() to authenticated;
revoke all on function public.current_player_profile(), public.claim_profile(text),
  public.claim_current_player_profile(), public.claim_spot(text), public.release_spot(),
  public.participation() from public, anon;
grant execute on function public.current_player_profile(), public.claim_profile(text),
  public.claim_current_player_profile(), public.claim_spot(text), public.release_spot(),
  public.participation() to authenticated;

-- 8. Verify existing data is untouched.
do $$
declare b record; a record;
begin
  select * into b from _bb_before;
  select count(*) as profiles,
         md5(coalesce(string_agg(profile_key || '|' || name || '|' || photo || '|' || coalesce(claimed_at::text, ''), ',' order by profile_key), '')) as fingerprint
    into a from public.profiles;
  if a.profiles <> b.profiles or a.fingerprint <> b.fingerprint then
    raise exception 'Abort: profile/photo data changed';
  end if;
  raise notice 'Member access OK: % profiles, fingerprint %', a.profiles, a.fingerprint;
end $$;

commit;
