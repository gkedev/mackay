\set ON_ERROR_STOP 1
begin;
create function pg_temp.q(r text, uid uuid, sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claims', coalesce(json_build_object('sub', uid, 'role', r)::text, ''), true);
  execute format('set local role %I', r);
  begin execute sql into v; exception when insufficient_privilege then v := 'DENIED'; when others then v := 'ERR ' || sqlstate; end;
  reset role; return coalesce(v, 'NULL');
end $$;
create function pg_temp.expect(label text, got text, want text) returns void language plpgsql as $$
begin if got is distinct from want then raise exception 'FAIL %: got %, want %', label, got, want; end if; raise notice 'ok  %', label; end $$;
insert into auth.users(id, phone, phone_confirmed_at) values ('00000000-0000-0000-0000-0000000000a1','15550000011',now()),('00000000-0000-0000-0000-0000000000c1','15550000013',now());
insert into public.player_phone_map(profile_key, phone_e164) values ((select profile_key from public.profiles order by profile_key limit 1), '+15550000011');
\set M '''00000000-0000-0000-0000-0000000000a1'''
\set N '''00000000-0000-0000-0000-0000000000c1'''
select pg_temp.expect('anon cannot read', pg_temp.q('anon', null, 'select count(*)::text from public.match_log'), 'DENIED');
select pg_temp.expect('anon cannot insert', pg_temp.q('anon', null, $q$insert into public.match_log(played_at,court,team_one,team_two,sets) values (now(),'c','{a,b}','{c,d}','[{"one":6,"two":4}]') returning 'x'$q$), 'DENIED');
select pg_temp.expect('non-member sees nothing', pg_temp.q('authenticated', :N, 'select count(*)::text from public.match_log'), '0');
select pg_temp.expect('non-member cannot insert', pg_temp.q('authenticated', :N, $q$insert into public.match_log(played_at,court,team_one,team_two,sets) values (now(),'c','{a,b}','{c,d}','[{"one":6,"two":4}]') returning 'x'$q$), 'DENIED');
select pg_temp.expect('member adds score', pg_temp.q('authenticated', :M, $q$insert into public.match_log(played_at,court,team_one,team_two,sets) values (now(),'Crocker 1','{Greg,Eric}','{Tyler,Nick}','[{"one":6,"two":4}]') returning 'ok'$q$), 'ok');
select pg_temp.expect('cannot spoof author', pg_temp.q('authenticated', :M, $q$insert into public.match_log(played_at,court,team_one,team_two,sets,created_by) values (now(),'c','{a,b}','{c,d}','[{"one":1,"two":0}]', '00000000-0000-0000-0000-0000000000c1') returning 'x'$q$), 'DENIED');
select pg_temp.expect('author stamped', (select created_by::text from public.match_log where court='Crocker 1'), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect('member corrects score', pg_temp.q('authenticated', :M, $q$update public.match_log set sets='[{"one":6,"two":3}]' where court='Crocker 1' returning 'ok'$q$), 'ok');
select pg_temp.expect('member cannot delete', pg_temp.q('authenticated', :M, $q$delete from public.match_log returning 'x'$q$), 'DENIED');
select pg_temp.expect('4 sets rejected', pg_temp.q('authenticated', :M, $q$insert into public.match_log(played_at,court,team_one,team_two,sets) values (now(),'c','{a,b}','{c,d}','[{},{},{},{}]') returning 'x'$q$), 'ERR 23514');
rollback;
