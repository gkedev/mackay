-- Match Log weather is written only by the server (Cloudflare Worker, service
-- role) from the Google Weather API. Members can still add/correct scores but
-- can no longer type their own weather.
revoke insert, update on public.match_log from authenticated;
grant insert (played_at, court, team_one, team_two, sets) on public.match_log to authenticated;
grant update (played_at, court, team_one, team_two, sets) on public.match_log to authenticated;
alter table public.match_log alter column weather_label set default 'Weather not recorded';
alter table public.match_log alter column weather_is_mocked set default false;

-- If a score's court time is changed later, recorded weather no longer
-- matches it: clear it (the server re-checks the 24 h rule from created_at).
create or replace function public.bb_match_log_weather_reset()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.played_at is distinct from old.played_at and (select auth.role()) = 'authenticated' then
    new.weather_label := 'Weather not recorded';
    new.weather_is_mocked := false;
  end if;
  return new;
end $$;
revoke all on function public.bb_match_log_weather_reset() from public, anon, authenticated;
drop trigger if exists match_log_weather_reset on public.match_log;
create trigger match_log_weather_reset before update on public.match_log
  for each row execute function public.bb_match_log_weather_reset();
