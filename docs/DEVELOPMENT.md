# BB Player — Cloudroom Development Plan

## Project identity

- Product: Broken Bodies Player App.
- Planned public host: `player.aauth.tech`; not deployed or configured yet.
- Public development repository: `https://github.com/gkedev/mackay`.
- Canonical requirements: `docs/PRODUCT-SPEC.md`.
- Cloudroom Cloud GitHub authorization and Cloud repository binding are separate from repository publication.
- Public demos must use synthetic data, not the real group roster or private ailment records.

## Connect the platforms in this order

1. **Local Cloudroom project:** register this repository on the connected Mac. Keep the Cloudroom backend and its existing private Connect access separate from the public player domain.
2. **GitHub:** use the public `gkedev/mackay` development repository. Sign into both the local/server GitHub integration and Cloud GitHub integration as applicable, push `main`, and bind the project to the Cloud repository. A local project alone does not provision a Cloud checkout. Keep secrets and real player data out of the entire public Git history.
3. **Codex/Pi:** choose a supported model explicitly on the actual execution target. Cloudroom and standalone agent model settings are independent. Validate authentication with a bounded test before assigning a build. Existing standalone terminal sessions are not automatically imported.
4. **Development environments:** use a separate local Git worktree per implementation branch, or a Cloudroom Cloud sandbox once the repository is bound. Managed local worktrees and Cloud sandboxes have different options and permission semantics. Add dependency setup hooks only after an application and lockfile exist.
5. **Supabase:** provision/select a staging project, track SQL migrations in Git, implement owner/group-aware RLS, and test with separate player and organizer identities. No production service-role credentials in routine coding environments.
6. **WorkOS:** configure a staging AuthKit client and approved localhost/staging callback URLs. Use the documented Supabase third-party-auth integration and an `authenticated` database role claim; do not assume WorkOS user IDs are Supabase Auth UUIDs. Login does not itself confer group membership.
7. **Hostinger:** deploy an isolated staging application with a least-privileged deploy credential and explicit approval. Register a separate non-root dev machine with Cloudroom only if remote development is useful; do not enroll existing production agent containers as unrestricted coding environments.
8. **Domain:** configure staging and production DNS/TLS only after confirming their deployment targets and preserving any existing services on `aauth.tech`.
9. **OpenClaw/Hermes:** initially share project documentation and provide constrained status/log or approved-job access over private connections. Add app automation behind a scoped application API later; these agents are not the player auth service.
10. **WhatsApp/Instinct:** launch with manually posted WhatsApp signup links. Keep RSVP records in Supabase. Identify Instinct before selecting an integration, and verify the official messaging capabilities before automating outbound messages.

## Credentials

- Use Cloudroom’s Secrets UI or a protected local/staging environment file, not pasted chat messages or command arguments.
- Cloudroom machine environment overrides apply globally to enrolled remote machines, not to the local host. Do not put BB-specific privileged credentials there by default.
- Cloudroom Cloud login/configuration is separate from enrolled-machine environment synchronization.
- Browser bundles receive only public configuration/publishable keys; WorkOS API keys and privileged database credentials stay server-side.
- Treat a Cloud agent’s full Mac access and copied logins as broad access, not as a project sandbox boundary. Review those permissions before giving agents sensitive tasks.

## Implementation sequence

### 1. App scaffold and offline prototype

Create the Next.js/TypeScript application, lockfile, lint/typecheck/test/build commands, and reproducible development instructions. Use clearly labeled synthetic data so the UI can be reviewed before auth credentials are available. No fake security or claim of persistent saved responses.

Build the player availability screen and factor/blocker badge interaction first. Include an organizer prototype with interested/confirmed/waitlist counts. Keep scheduling controls clear and badge copy playful.

### 2. Identity and persistence

Connect staging AuthKit and Supabase; build membership mapping and migrations. Implement authorization tests, real saved RSVPs, profile badges, and event-specific blockers. Resolve concurrency around confirmations and released slots.

### 3. Scheduling and communication

Add Monday events/time slots, organizer-approved groups, cancellation/substitute handling, and a copyable WhatsApp invitation. Store recurring Friday noon timing as `America/Los_Angeles`. Messaging automation is a later phase, not a prerequisite for player signup.

### 4. Staging release

CI must pass lint, types, unit tests, authorization tests, and the production build. Add browser end-to-end tests for the vertical slice. Deploy staging for organizer/player review before a separately approved production release.

## First coding task for a Cloudroom thread

Read `README.md`, `docs/PRODUCT-SPEC.md`, and this plan. Implement phase 1 only in an isolated branch/environment: a mobile-first Next.js/TypeScript prototype using synthetic data, with separate weekly availability and humorous factor/blocker badges. Muted badges must remain interactive and must not block signup; blockers must be explicit for the selected event. Add automated tests for these rules and document exactly what is mocked versus implemented. Do not provision external accounts, publish the app, change DNS, send messages, or introduce production credentials. Report changed files, commands run, results, and blockers.

## Done means verified

A connected provider, idle thread, accepted model ID, or queued message is not proof of completed work. Inspect actual output and test results. Keep one implementation owner per branch; reviews should reference a commit/diff and must not race the implementer’s files.
