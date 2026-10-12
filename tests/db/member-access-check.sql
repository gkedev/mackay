-- Local-only test for 20261012010000_member_access.sql. Uses fictional
-- phones (+1555...) and rolls back. Expects a restored production copy with
-- both migrations applied and a mock auth.users(id, phone, phone_confirmed_at).
\set ON_ERROR_STOP 1
begin;
create function pg_temp.q(r text, uid uuid, sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', uid, 'role', r)::text, ''), true);
  execute format('set local role %I', r);
  begin
    execute sql into v;
  exception when insufficient_privilege then v := 'DENIED';
  end;
  reset role;
  return coalesce(v, 'NULL');
end $$;
create function pg_temp.expect(label text, got text, want text) returns void language plpgsql as $$
begin
  if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if;
  raise notice 'ok  %', label;
end $$;

-- Fixtures: A, B mapped (A organizer); C verified but not mapped; D mapped but unverified.
insert into auth.users(id, phone, phone_confirmed_at) values
 ('00000000-0000-0000-0000-00000000000a','15550000001',now()),
 ('00000000-0000-0000-0000-00000000000b','15550000002',now()),
 ('00000000-0000-0000-0000-00000000000c','15550000003',now()),
 ('00000000-0000-0000-0000-00000000000d','15550000004',null);
insert into public.player_phone_map(profile_key, phone_e164, is_organizer)
select profile_key, phone, org from (values
  ((select profile_key from public.profiles order by profile_key limit 1 offset 0), '+15550000001', true),
  ((select profile_key from public.profiles order by profile_key limit 1 offset 1), '+15550000002', false),
  ((select profile_key from public.profiles order by profile_key limit 1 offset 2), '+15550000004', false)) v(profile_key, phone, org);
create temp table k as select
  (select profile_key from public.profiles order by profile_key limit 1 offset 0) a,
  (select profile_key from public.profiles order by profile_key limit 1 offset 1) b;
grant select on k to anon, authenticated;
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
\set D '''00000000-0000-0000-0000-00000000000d'''

select pg_temp.expect('anon cannot read profiles', pg_temp.q('anon', null, 'select count(*)::text from public.profiles'), 'DENIED');
select pg_temp.expect('anon cannot call current_player_profile', pg_temp.q('anon', null, 'select name from public.current_player_profile()'), 'DENIED');
select pg_temp.expect('anon cannot claim', pg_temp.q('anon', null, 'select public.claim_profile(''x'')'), 'DENIED');
select pg_temp.expect('nobody reads phone map', pg_temp.q('authenticated', :A, 'select count(*)::text from public.player_phone_map'), 'DENIED');
select pg_temp.expect('internal helper not callable', pg_temp.q('authenticated', :A, 'select public.bb_verified_phone()'), 'DENIED');

select pg_temp.expect('unmapped verified user sees 0 profiles', pg_temp.q('authenticated', :C, 'select count(*)::text from public.profiles'), '0');
select pg_temp.expect('unmapped user has no profile', pg_temp.q('authenticated', :C, 'select name from public.current_player_profile()'), 'NULL');
select pg_temp.expect('unmapped user cannot claim', pg_temp.q('authenticated', :C, 'select public.claim_profile((select a from k))'), 'not_your_profile');
select pg_temp.expect('unverified phone sees 0 profiles', pg_temp.q('authenticated', :D, 'select count(*)::text from public.profiles'), '0');
select pg_temp.expect('unmapped user sees 0 weeks', pg_temp.q('authenticated', :C, 'select count(*)::text from public.weeks'), '0');

select pg_temp.expect('mapped player sees full roster', pg_temp.q('authenticated', :B, 'select count(*)::text from public.profiles'), (select count(*)::text from public.profiles));
select pg_temp.expect('mapped player gets their own profile', pg_temp.q('authenticated', :B, 'select profile_key from public.current_player_profile()'), (select b from k));
select pg_temp.expect('player cannot read auth link column', pg_temp.q('authenticated', :B, 'select count(auth_user_id)::text from public.profiles'), 'DENIED');
select pg_temp.expect('player cannot update profiles', pg_temp.q('authenticated', :B, 'update public.profiles set name = name returning 1'), 'DENIED');
select pg_temp.expect('cannot claim someone else''s photo', pg_temp.q('authenticated', :B, 'select public.claim_profile((select a from k))'), 'not_your_profile');
select pg_temp.expect('unclaimed member cannot book court', pg_temp.q('authenticated', :B, 'select public.claim_spot(''6:30'')'), 'profile_not_linked');
select pg_temp.expect('anon cannot list pool', pg_temp.q('anon', null, 'select count(*)::text from public.player_pool()'), 'DENIED');
select pg_temp.expect('non-member pool empty', pg_temp.q('authenticated', :C, 'select count(*)::text from public.player_pool()'), '0');
select pg_temp.expect('member pool lists everyone', pg_temp.q('authenticated', :B, 'select count(*)::text from public.player_pool()'), (select count(*)::text from public.profiles));
select pg_temp.expect('pool marks only my photo', pg_temp.q('authenticated', :B, 'select string_agg(profile_key, '','') from public.player_pool() where mine'), (select b from k));
select pg_temp.expect('claim own photo', pg_temp.q('authenticated', :B, 'select public.claim_profile((select b from k))'), 'ok');
select pg_temp.expect('claim is idempotent', pg_temp.q('authenticated', :B, 'select public.claim_profile((select b from k))'), 'ok');
select pg_temp.expect('claim bound to auth uid', (select auth_user_id::text from public.profiles where profile_key = (select b from k)), '00000000-0000-0000-0000-00000000000b');

-- Recycled number: B's phone now verified on another account -> no takeover.
update auth.users set phone = null where id = :B::uuid;
insert into auth.users(id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-0000000000e0','15550000002',now());
select pg_temp.expect('pool shows claimed', pg_temp.q('authenticated', :A, 'select claimed::text from public.player_pool() where profile_key = (select b from k)'), 'true');
select pg_temp.expect('recycled number cannot take over claimed profile', pg_temp.q('authenticated', '00000000-0000-0000-0000-0000000000e0', 'select public.claim_profile((select b from k))'), 'claimed_by_someone_else');
select pg_temp.expect('owner keeps access without phone (passkey account)', pg_temp.q('authenticated', :B, 'select profile_key from public.current_player_profile()'), (select b from k));

-- Courts.
select pg_temp.expect('non-organizer cannot create week', pg_temp.q('authenticated', :B, 'insert into public.weeks(event_date,courts,court_times) values (''t'',''1'',''[{"time":"6:30","spots":1}]'') returning 1'), 'DENIED');
select pg_temp.expect('organizer creates week', pg_temp.q('authenticated', :A, 'insert into public.weeks(event_date,courts,court_times) values (''t'',''1'',''[{"time":"6:30","spots":1}]'') returning ''ok'''), 'ok');
select pg_temp.expect('owner books court', pg_temp.q('authenticated', :B, 'select public.claim_spot(''6:30'')'), 'ok');
select pg_temp.expect('rebooking own spot ok', pg_temp.q('authenticated', :B, 'select public.claim_spot(''6:30'')'), 'ok');
select pg_temp.expect('organizer claims own photo', pg_temp.q('authenticated', :A, 'select public.claim_profile((select a from k))'), 'ok');
select pg_temp.expect('full court rejected', pg_temp.q('authenticated', :A, 'select public.claim_spot(''6:30'')'), 'full');
select pg_temp.expect('bad time rejected', pg_temp.q('authenticated', :A, 'select public.claim_spot(''9:99'')'), 'bad_time');
select pg_temp.expect('one profile per account', pg_temp.q('authenticated', :A, 'select public.claim_profile((select b from k))'), 'already_claimed_other');
select pg_temp.expect('release spot', pg_temp.q('authenticated', :B, 'select public.release_spot()::text'), '');
select pg_temp.expect('freed spot can be booked', pg_temp.q('authenticated', :A, 'select public.claim_spot(''6:30'')'), 'ok');
select pg_temp.expect('member sees participation', (pg_temp.q('authenticated', :B, 'select count(*)::text from public.participation()')::int > 0)::text, 'true');
select pg_temp.expect('non-member participation empty', pg_temp.q('authenticated', :C, 'select count(*)::text from public.participation()'), '0');
rollback;
select count(*) profiles, count(auth_user_id) owned, (select count(*) from public.player_phone_map) mapped from public.profiles;
