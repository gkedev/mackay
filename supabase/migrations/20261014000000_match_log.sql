-- BB Player Match Log: shared doubles scores. Ported from the Player App
-- thread's 0005_match_log.sql with member checks that work for SMS *and*
-- passkey sessions (bb_is_member) and with no anonymous access.
-- Any member may correct a score or add a set (scores are often fixed up by
-- another player after the night); every write is stamped server-side with
-- the real account and time.

create table if not exists public.match_log (
  id uuid primary key default gen_random_uuid(),
  played_at timestamptz not null,
  court text not null check (char_length(court) between 1 and 80),
  team_one text[] not null check (cardinality(team_one) = 2),
  team_two text[] not null check (cardinality(team_two) = 2),
  sets jsonb not null default '[]'::jsonb check (jsonb_typeof(sets) = 'array' and jsonb_array_length(sets) between 1 and 3),
  weather_label text not null default 'Weather not recorded',
  weather_is_mocked boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  updated_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.match_log alter column weather_label set default 'Weather not recorded';
create index if not exists match_log_played_at_idx on public.match_log (played_at desc);

-- Server-side stamping: clients cannot spoof who/when.
create or replace function public.bb_match_log_stamp()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce((select auth.uid()), new.created_by);
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.bb_match_log_stamp() from public, anon, authenticated;
drop trigger if exists match_log_stamp on public.match_log;
create trigger match_log_stamp before insert or update on public.match_log
  for each row execute function public.bb_match_log_stamp();

alter table public.match_log enable row level security;
drop policy if exists match_log_roster_read on public.match_log;
drop policy if exists match_log_roster_insert on public.match_log;
drop policy if exists match_log_roster_update on public.match_log;
drop policy if exists match_log_member_read on public.match_log;
drop policy if exists match_log_member_insert on public.match_log;
drop policy if exists match_log_member_update on public.match_log;
create policy match_log_member_read on public.match_log
  for select to authenticated using ((select public.bb_is_member()));
create policy match_log_member_insert on public.match_log
  for insert to authenticated with check ((select public.bb_is_member()));
create policy match_log_member_update on public.match_log
  for update to authenticated using ((select public.bb_is_member())) with check ((select public.bb_is_member()));

revoke all on public.match_log from anon, authenticated, public;
grant select on public.match_log to authenticated;
grant insert (played_at, court, team_one, team_two, sets, weather_label, weather_is_mocked) on public.match_log to authenticated;
grant update (played_at, court, team_one, team_two, sets, weather_label, weather_is_mocked) on public.match_log to authenticated;

-- New public objects must not be auto-granted to anon (same as production).
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon, public;
