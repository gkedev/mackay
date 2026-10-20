-- Self-contained test for 20261020000000_multi_time_claims.sql on an empty
-- Postgres: builds a minimal mock of the claims schema (old per-week unique
-- constraint), applies the migration, and checks multi-time claims.
-- Run: psql -v ON_ERROR_STOP=1 -f tests/db/multi-time-claims-check.sql
\set ON_ERROR_STOP 1
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
drop schema if exists auth cascade; create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
drop table if exists public.claims, public.weeks, public.profiles cascade;
create table public.profiles (name text primary key, auth_user_id uuid unique);
create table public.weeks (id bigint generated always as identity primary key, court_times jsonb not null, created_at timestamptz not null default now());
create table public.claims (id bigint generated always as identity primary key,
  week_id bigint not null references public.weeks(id) on delete cascade, player text not null,
  court_time text not null, created_at timestamptz not null default now(), unique (week_id, player));
create or replace function public.bb_owned_player_name() returns text language sql stable security definer set search_path = '' as $$
  select p.name from public.profiles p where p.auth_user_id = (select auth.uid()) $$;
insert into public.profiles values ('Tyler', '00000000-0000-0000-0000-00000000000a'), ('Ann', '00000000-0000-0000-0000-00000000000b');
insert into public.weeks (court_times) values ('[{"time":"6:00","spots":2},{"time":"7:30","spots":1}]');
-- A pre-existing claim from before the migration survives it.
insert into public.claims (week_id, player, court_time) values (1, 'Ann', '6:00');

\i supabase/migrations/20261020000000_multi_time_claims.sql
\i supabase/migrations/20261020000000_multi_time_claims.sql

create function pg_temp.q(uid text, sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('test.uid', coalesce(uid, ''), true);
  set local role authenticated;
  begin execute sql into v; exception when insufficient_privilege then v := 'DENIED'; end;
  reset role;
  return coalesce(v, 'NULL');
end $$;
create function pg_temp.expect(label text, got text, want text) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
  raise notice 'ok  %', label;
end $$;
create function pg_temp.mine(p text) returns text language sql as $$
  select coalesce(string_agg(court_time, ',' order by court_time), '') from public.claims where player = p $$;
\set T '''00000000-0000-0000-0000-00000000000a'''
\set A '''00000000-0000-0000-0000-00000000000b'''

begin;
select pg_temp.expect('old claim kept', pg_temp.mine('Ann'), '6:00');
select pg_temp.expect('claim 6:00', pg_temp.q(:T, 'select public.claim_spot(''6:00'')'), 'ok');
select pg_temp.expect('claim 7:30 same night', pg_temp.q(:T, 'select public.claim_spot(''7:30'')'), 'ok');
select pg_temp.expect('both spots held', pg_temp.mine('Tyler'), '6:00,7:30');
select pg_temp.expect('re-claim is idempotent', pg_temp.q(:T, 'select public.claim_spot(''6:00'')'), 'ok');
select pg_temp.expect('no duplicate row', (select count(*)::text from public.claims where player = 'Tyler'), '2');
select pg_temp.expect('full time rejected', pg_temp.q(:A, 'select public.claim_spot(''7:30'')'), 'full');
select pg_temp.expect('bad time rejected', pg_temp.q(:T, 'select public.claim_spot(''9:99'')'), 'bad_time');
select pg_temp.expect('unlinked user rejected', pg_temp.q('00000000-0000-0000-0000-00000000000c', 'select public.claim_spot(''6:00'')'), 'profile_not_linked');
select pg_temp.expect('release one time', pg_temp.q(:T, 'select public.release_spot(''7:30'')::text'), '');
select pg_temp.expect('other time kept', pg_temp.mine('Tyler'), '6:00');
select pg_temp.expect('freed spot bookable', pg_temp.q(:A, 'select public.claim_spot(''7:30'')'), 'ok');
select pg_temp.expect('no-arg release clears all (old app)', pg_temp.q(:A, 'select public.release_spot()::text'), '');
select pg_temp.expect('Ann has none', pg_temp.mine('Ann'), '');
select pg_temp.expect('Tyler untouched', pg_temp.mine('Tyler'), '6:00');
reset role;
set local role anon;
do $$ begin perform public.claim_spot('6:00'); raise exception 'FAIL anon could call claim_spot';
exception when insufficient_privilege then raise notice 'ok  anon cannot claim'; end $$;
do $$ begin perform public.release_spot(); raise exception 'FAIL anon could call release_spot';
exception when insufficient_privilege then raise notice 'ok  anon cannot release'; end $$;
rollback;
