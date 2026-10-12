-- Run after the lockdown migration. Every client-role attempt must fail.
\set ON_ERROR_STOP 0
\set QUIET 1
create or replace function pg_temp.expect_denied(r text, q text) returns text language plpgsql as $$
begin
  execute format('set local role %I', r);
  begin
    execute q;
    reset role;
    return 'FAIL  ' || r || ': ' || q;
  exception when insufficient_privilege or undefined_function then
    reset role;
    return 'ok    ' || r || ' denied: ' || q;
  end;
end $$;
begin;
select pg_temp.expect_denied(r, q) as result
from unnest(array['anon','authenticated']) r,
     unnest(array[
       'select * from public.profiles',
       'update public.profiles set name = name',
       'insert into public.profiles(profile_key,name,photo) values (''x'',''x'',''x'')',
       'delete from public.profiles',
       'select * from public.weeks',
       'insert into public.weeks(event_date,courts) values (''x'',''x'')',
       'select * from public.claims',
       'delete from public.claims',
       'select public.claim_spot(''Anyone'',''6:30'')',
       'select public.release_spot(''Anyone'')',
       'select * from public.participation()'
     ]) q;
rollback;
select count(*) as profiles, count(photo) as photos from public.profiles;
