-- Add new players Ben T and Marcos. Existing profiles are not modified.
-- Photos are organizer-preloaded app assets (/players/*.jpg), kept out of
-- this public repo and shipped with the production app deployment.
-- Phone mappings are loaded separately and privately.
insert into public.profiles (profile_key, name, photo) values
  ('player-25', 'Ben T',  '/players/bent.jpg'),
  ('player-26', 'Marcos', '/players/marcos.jpg')
on conflict (profile_key) do nothing;
