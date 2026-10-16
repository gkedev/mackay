-- Weekly courts: re-saving the same event date updates that week (claims are
-- kept) instead of creating a new week that hides them. A new date starts a
-- new week. Edits that would strand claimed players are refused.

alter table public.weeks add column if not exists event_on date;
grant select (event_on) on public.weeks to authenticated;

create or replace function public.save_week(p_event_on date, p_courts text, p_court_times jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_week public.weeks;
  v_label text := to_char(p_event_on, 'FMDay, FMMonth FMDD');
  v_conflicts text;
begin
  if not public.bb_is_organizer() then return jsonb_build_object('result', 'not_organizer'); end if;
  if p_event_on is null then return jsonb_build_object('result', 'bad_date'); end if;
  if jsonb_typeof(p_court_times) <> 'array' or jsonb_array_length(p_court_times) not between 1 and 6
     or exists (select 1 from jsonb_array_elements(p_court_times) t
                where coalesce(trim(t->>'time'), '') = '' or (t->>'spots') !~ '^\d+$' or (t->>'spots')::int not between 1 and 12)
  then return jsonb_build_object('result', 'bad_times'); end if;

  -- Serialize saves/claims on the current week.
  select * into v_week from public.weeks order by created_at desc, id desc limit 1 for update;

  if v_week.id is not null and v_week.event_on = p_event_on then
    -- Every claimed time must still exist with enough spots.
    select string_agg(format('%s (%s)', c.court_time, players), '; ') into v_conflicts
    from (select court_time, count(*) n, string_agg(player, ', ' order by player) players
          from public.claims where week_id = v_week.id group by court_time) c
    left join (select t->>'time' court_time, sum((t->>'spots')::int) cap
               from jsonb_array_elements(p_court_times) t group by 1) k using (court_time)
    where coalesce(k.cap, 0) < c.n;
    if v_conflicts is not null then return jsonb_build_object('result', 'claims_conflict', 'detail', v_conflicts); end if;
    update public.weeks set event_date = v_label, courts = p_courts, court_times = p_court_times where id = v_week.id;
    return jsonb_build_object('result', 'updated', 'week_id', v_week.id,
      'claims', (select count(*) from public.claims where week_id = v_week.id));
  end if;

  insert into public.weeks (event_date, event_on, courts, court_times)
  values (v_label, p_event_on, p_courts, p_court_times) returning * into v_week;
  return jsonb_build_object('result', 'created', 'week_id', v_week.id, 'claims', 0);
end $$;
revoke all on function public.save_week(date, text, jsonb) from public, anon;
grant execute on function public.save_week(date, text, jsonb) to authenticated;

-- Weeks are now written only through save_week.
drop policy if exists weeks_organizer_insert on public.weeks;
revoke insert on public.weeks from authenticated;
