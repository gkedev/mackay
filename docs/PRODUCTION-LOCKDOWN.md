# Production anonymous-access lockdown

Applied to production Broken Bodies (`fuefvljlfncwikpkdnwd`) on 2026-10-12 via
[`supabase/migrations/20261012000000_lock_down_anonymous_access.sql`](../supabase/migrations/20261012000000_lock_down_anonymous_access.sql).

## Before
The prototype policies let anyone holding the public key (it ships in the page) read and
UPDATE `profiles`, read `weeks`/`claims`, insert `weeks`, and call `claim_spot` /
`release_spot` with any player name.

## After
- Open policies dropped; RLS on with no client policies.
- `anon`, `authenticated`, and `PUBLIC` have no table, sequence, or RPC privileges on
  `profiles`, `weeks`, `claims`, `claim_spot`, `release_spot`, `participation`.
- Default privileges no longer auto-grant new `public` objects to `anon`.
- Data unchanged: 24 profiles, 24 photo paths, 4 claimed, 7 weeks, 1 claim. Profile
  fingerprint `45c188a67d9096efeeda731f74c76096` identical before/after and equal to the
  encrypted 2026-10-12 backup.

## Verified
- Local: restored production dump, `tests/db/lockdown-check.sql` — 20 open holes before, 0 after; re-run is idempotent.
- Live REST with the public key: every read, update, insert, and RPC returns `42501 permission denied`.
- Site pages and app-hosted photos (`/players/*.jpg`) still serve 200.

## Known effect
The current production app reads data with the anonymous key, so its roster/courts
show no data until the SMS + passkey app is deployed to production.

## Member access (applied 2026-10-12)

[`20261012010000_member_access.sql`](../supabase/migrations/20261012010000_member_access.sql), tested by
`tests/db/member-access-check.sql` (33/33 on a restored production copy), then applied.

- `profiles.auth_user_id` (unique, FK to `auth.users`) is the ownership link. Legacy `claimed_at` values were kept.
- `player_phone_map` is private: no client role can read it. Load it server-side only.
- Member = owns a profile, or has a **confirmed** phone in `auth.users` that is on the map. This works after passkey sign-in too.
- Members can read `profiles(profile_key, name, photo)`, `weeks`, `claims`, and `participation()`. Nobody else can.
- `claim_profile(profile_key)`: picks a photo from the pool. It only succeeds for the profile mapped to the caller's phone, is atomic, gives one profile per account, and never reassigns an owned profile (recycled numbers can't take over).
- `current_player_profile()` / `claim_current_player_profile()` keep the staging app's API.
- `claim_spot(time)` / `release_spot()` use the caller's owned profile and lock the week row (no overbooking).
- Only organizers (`is_organizer` in the map) can create weeks.

[`20261012020000_add_ben_t_and_marcos.sql`](../supabase/migrations/20261012020000_add_ben_t_and_marcos.sql) added `player-25` Ben T and `player-26`
Marcos (26 profiles). Their photos are private assets, not in this public repo. They are in
`~/Backups/BB-Player/new-profile-photos/` on the owner Mac and must ship with the production
app build as `/players/bent.jpg` and `/players/marcos.jpg`.

## Go-forward access
1. Player opens the SMS link, verifies via Supabase Auth + Twilio Verify.
2. Only an approved phone (private `player_phone_map`) unlocks the photo gallery.
3. Player picks their photo from the existing pool; claim is atomic and bound to `auth.uid()`.
4. Player enrolls a Supabase experimental passkey for later sign-ins; SMS stays as fallback.

Re-grant access only to `authenticated` members through these checks — never to `anon`.

## Production player sign-in (configured 2026-10-12)

- `player_phone_map`: 26 players, each mapped to an existing profile; Greg (`player-14`) is the only organizer. Loaded from the organizer's private CSV, never committed or copied to staging.
- **Invite-only accounts (option A):** one Supabase Auth account was pre-created per mapped phone (`app_metadata.bb_invited = true`), and public signup is **off**. Unknown numbers are rejected (`signup_disabled`) before any SMS is sent.
- Accounts are not linked to profiles ahead of time; each player links their own by picking their photo (`claim_profile`).
- SMS: Supabase Auth → Twilio Verify, using a dedicated production Verify service **"BB Player"** (staging keeps "Broken Bodies Staging"). Same Twilio account. Twilio sends sign-in codes only.
- Limits: 60 s between codes per number; 30 SMS/hour project-wide (enough for a group onboarding evening).
- Passkeys (Supabase experimental): on. RP ID `player.aauth.tech`, origin `https://player.aauth.tech`, display name "BB Player".
- Site URL / redirect allow-list: `https://player.aauth.tech/**`.
- Invitations are sent manually by the organizer (Instinct, WhatsApp, iMessage). Nothing is automated.
- Adding a player later: add the profile and photo, add the phone to `player_phone_map`, and create an Auth account for that phone with the service role (server-side only).

## App deployment (2026-10-12)

Source: private repo [gkedev/bb-player](https://github.com/gkedev/bb-player). New flow: SMS → `/gallery` pick your photo → passkey → home.

| Worker | Domain | New version | Rollback to |
|---|---|---|---|
| `bb-player-staging` | player-staging.aauth.tech | `b1c9643d-83ae-4ed8-b9d3-145e96a5ecda` | `b7dfa4dc-4824-4521-8dc4-de7df0d8d1ae` |
| `bb-player` | player.aauth.tech | `b2d7e2dd-ede2-476d-8ba5-0064db8c60e1` | `15e103b3-c6d8-447b-8958-f4e47e78ffa6` (old anon-key app; it no longer works against the locked-down DB) |

Rollback: `npx wrangler rollback <version-id> --name <worker>`.

Verified after deploy: all routes 200, all 26 `/players/*.jpg` byte-identical to the source, production bundle targets `fuefvljlfncwikpkdnwd` only, signed-out `/gallery` redirects to `/login`.

## HTTPS enforcement (2026-10-12)

`http://player.aauth.tech` used to serve the app over plain HTTP (the zone's "Always Use HTTPS" is off). Chrome on iPhone opened a typed address over HTTP, so the page was not a secure context and passkeys were unavailable (`PublicKeyCredential` missing). Both Workers now run `worker/https.js` (in gkedev/bb-player) first: HTTP → 301 to HTTPS, plus `Strict-Transport-Security: max-age=31536000`. The zone-wide setting was left unchanged so other aauth.tech services are not affected.

## FEED photo storage (2026-10-12)

[`20261012040000_player_feed_storage.sql`](../supabase/migrations/20261012040000_player_feed_storage.sql), applied to production (staging already matched):
- Private bucket `player-feed`: 4 MB per photo, `image/jpeg` only, not public.
- Restrictive storage policy `player_feed_private_boundary`: `anon`/`authenticated` can never touch `player-feed` objects.
- `public.player_photo_posts`: RLS on, no client grants, server-only (`service_role`).

The FEED API (`/api/feed`, `/api/feed/upload`, `/api/feed/<id>`) now runs in both Workers (`worker/feed.js` behind `worker/https.js`, gkedev/bb-player). Per-Worker vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN`; secret: `SUPABASE_SERVICE_ROLE_KEY` (Cloudflare encrypted secret, never in Git). Only signed-in players who have **claimed** their photo can view or post. Uploads are re-encoded to JPEG on the device and stripped of metadata on the server. Photos are shown through 10-minute signed links. Players can remove only their own posts. Profile photos are untouched.

Verified: staging end-to-end (unclaimed refused → claim → upload → signed link 200 → remove → 0 objects). Production API refuses no token / bad token / anon key / foreign origin. Production storage check: anon can't read/list/upload, non-JPEG and >4 MB rejected, signed link works, bucket left empty.

## Production release (2026-10-15)

`gkedev/bb-player` `staging` @ `b37b39a` deployed to Worker `bb-player` (version `68fff567-b059-4d23-bc23-87414dcdfea1`; roll back to `21c7d282`). `main` fast-forwarded to match.

- Database: `20261014000000_match_log.sql` and `20261015000000_match_log_server_weather.sql` applied. Match Log is member-only, server-stamped, no deletes, weather written only by the Worker. Profiles/photos fingerprint unchanged; anon has zero grants in `public`.
- Worker secrets: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_WEATHER_API_KEY`. **`CHIPIN_API_KEY` still needed**; until then the ChipIn tab answers "ChipIn is not configured yet."
- Shipped: italic BB TENNIS brand, dark green cards, "Any injuries?", step numbers without circles, bottom nav (Home · Match Log · Gallery · ChipIn), Gallery header/headings, composer behind + Add photo, Match Log (Guest, circular photos, 26-player pool, court time in Pacific, Google weather for scores posted within 24 h), two-line badge names, ChipIn tab.
- Verified: all routes 200, http→https, 26 photos byte-identical, bundle targets production only, APIs refuse unsigned/foreign-origin requests, anon cannot read profiles/match_log/phone map/weeks.
