\set ON_ERROR_STOP 1
begin;
create function pg_temp.q(r text, uid uuid, sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', uid, 'role', r)::text, ''), true);
  execute format('set local role %I', r);
  begin execute sql into v; exception when insufficient_privilege then v := 'DENIED'; when others then v := 'ERR ' || sqlstate || ' ' || sqlerrm; end;
  reset role; return coalesce(v, 'NULL');
end $$;
create function pg_temp.expect(label text, got text, want text) returns void language plpgsql as $$
begin if got not like want then raise exception 'FAIL %: got %, want %', label, got, want; end if; raise notice 'ok  %', label; end $$;
insert into auth.users(id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','15550000011',now()),('00000000-0000-0000-0000-0000000000b1','15550000012',now());
insert into public.player_phone_map(profile_key, phone_e164, is_organizer) values
 ((select profile_key from public.profiles order by profile_key limit 1), '+15550000011', true),
 ((select profile_key from public.profiles order by profile_key limit 1 offset 1), '+15550000012', false);
update public.profiles set auth_user_id='00000000-0000-0000-0000-0000000000b1' where profile_key=(select profile_key from public.profiles order by profile_key limit 1 offset 1);
\set O '''00000000-0000-0000-0000-0000000000a1'''
\set P '''00000000-0000-0000-0000-0000000000b1'''
\set T1 '''[{"time":"6:00 PM","spots":4},{"time":"6:00 PM","spots":4},{"time":"7:30 PM","spots":4}]'''
select pg_temp.expect('anon cannot save', pg_temp.q('anon', null, $$select public.save_week('2030-10-21','x','[{"time":"6:00 PM","spots":4}]')::text$$), 'DENIED');
select pg_temp.expect('player cannot save', pg_temp.q('authenticated', :P, $$select public.save_week('2030-10-21','x','[{"time":"6:00 PM","spots":4}]')->>'result'$$), 'not_organizer');
select pg_temp.expect('direct insert blocked', pg_temp.q('authenticated', :O, $$insert into public.weeks(event_date,courts) values ('x','x') returning 'x'$$), 'DENIED');
select pg_temp.expect('new date creates week', pg_temp.q('authenticated', :O, format('select public.save_week(%L,%L,%L)->>''result''', '2030-10-21', 'Crocker Amazon', :T1)), 'created');
select pg_temp.expect('label formatted', (select event_date from public.weeks order by created_at desc, id desc limit 1), 'Monday, October 21');
select pg_temp.expect('player claims 7:30', pg_temp.q('authenticated', :P, $$select public.claim_spot('7:30 PM')$$), 'ok');
select pg_temp.expect('re-save same date updates', pg_temp.q('authenticated', :O, format('select public.save_week(%L,%L,%L)->>''result''', '2030-10-21', 'Crocker Amazon · Courts 1–3', :T1)), 'updated');
select pg_temp.expect('claim kept after re-save', (select count(*)::text from public.claims where week_id=(select id from public.weeks order by created_at desc, id desc limit 1)), '1');
select pg_temp.expect('removing claimed time blocked', pg_temp.q('authenticated', :O, $$select public.save_week('2030-10-21','x','[{"time":"6:00 PM","spots":4}]')->>'result'$$), 'claims_conflict');
select pg_temp.expect('conflict names player', pg_temp.q('authenticated', :O, $$select public.save_week('2030-10-21','x','[{"time":"6:00 PM","spots":4}]')->>'detail'$$), '7:30 PM (%)');
select pg_temp.expect('bad spots rejected', pg_temp.q('authenticated', :O, $$select public.save_week('2030-10-21','x','[{"time":"6:00 PM","spots":40}]')->>'result'$$), 'bad_times');
select pg_temp.expect('next date starts fresh', pg_temp.q('authenticated', :O, format('select public.save_week(%L,%L,%L)->>''claims''', '2030-10-28', 'Crocker Amazon', :T1)), '0');
select pg_temp.expect('one week per save, no duplicates', (select count(*)::text from public.weeks where event_on='2030-10-21'), '1');
rollback;
