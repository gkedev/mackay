-- Photo pool for the "pick your photo" gallery. Members only.
-- Returns every profile with whether it is already claimed and whether it is
-- the caller's own (owned, or mapped to their verified phone). Never exposes
-- phone numbers or other accounts' user IDs.
create or replace function public.player_pool()
returns table(profile_key text, name text, photo text, claimed boolean, mine boolean)
language sql stable security definer set search_path = '' as $$
  select p.profile_key, p.name, p.photo,
         p.auth_user_id is not null,
         p.auth_user_id = (select auth.uid())
           or (p.auth_user_id is null and p.profile_key = public.bb_mapped_profile_key())
  from public.profiles p
  where public.bb_is_member()
  order by p.name
$$;
revoke all on function public.player_pool() from public, anon;
grant execute on function public.player_pool() to authenticated;
