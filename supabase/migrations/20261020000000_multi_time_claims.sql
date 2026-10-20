-- A player can hold spots at several times on the same night (e.g. 6:00 and
-- 7:30). Previously claims were unique per (week, player), so claiming a second
-- time moved the existing claim, and release_spot() cleared every claim.
-- Now: one claim per (week, player, time); release_spot(time) releases just
-- that time. release_spot() with no argument still releases all (old app).

do $$
declare c text;
begin
  for c in
    select con.conname from pg_constraint con
    where con.conrelid = 'public.claims'::regclass and con.contype = 'u'
      and (select array_agg(a.attname::text order by a.attname) from unnest(con.conkey) k
           join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) = array['player', 'week_id']
  loop
    execute format('alter table public.claims drop constraint %I', c);
  end loop;
end $$;

alter table public.claims drop constraint if exists claims_week_player_time_key;
alter table public.claims add constraint claims_week_player_time_key unique (week_id, player, court_time);

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
  if exists (select 1 from public.claims c
             where c.week_id = v_week_id and c.player = v_player and c.court_time = p_court_time) then
    return 'ok';
  end if;
  select count(*) into v_taken from public.claims c
  where c.week_id = v_week_id and c.court_time = p_court_time;
  if v_taken >= v_capacity then return 'full'; end if;
  insert into public.claims (week_id, player, court_time) values (v_week_id, v_player, p_court_time);
  return 'ok';
end $$;

drop function if exists public.release_spot();
create or replace function public.release_spot(p_court_time text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_player text := public.bb_owned_player_name();
  v_week_id bigint;
begin
  if v_player is null then return; end if;
  select w.id into v_week_id from public.weeks w order by w.created_at desc, w.id desc limit 1;
  delete from public.claims c
  where c.week_id = v_week_id and c.player = v_player
    and (p_court_time is null or c.court_time = p_court_time);
end $$;

revoke all on function public.claim_spot(text), public.release_spot(text) from public, anon;
grant execute on function public.claim_spot(text), public.release_spot(text) to authenticated;
