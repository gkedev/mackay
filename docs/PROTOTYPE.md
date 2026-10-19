# Mahjong Crew — silver/grey prototype

## Approved design direction

- Silver/grey, sleek, welcoming, and event-led, with a Luma-inspired sense of space and simple navigation. This is an original interface, not a copy of Luma's branding or assets.
- Three destinations: **Discover**, **My games**, and **Crew**. On phones, navigation sits at the bottom of the viewport.
- American Mahjong is the initial default. Different tables and sessions can select their own card year and American house-rule profile.
- Selected eventual production hostname: `mahj.aauth.tech`. This prototype does not configure or publish that hostname.

## Review locations

The synthetic prototype is deployed in its own Hostinger staging container. Private Tailscale entry points are available through the existing review node on HTTPS 7443 and the owner's main network on HTTP 8080. The latter uses the existing HTTP-over-encrypted-Tailscale pattern; the main tailnet's HTTPS feature was not enabled or changed. Actual private URLs are shared in the Cloudroom thread, not this public repository. See the [staging runbook](../deploy/staging/README.md) and [deployment verification](evals/2026-10-16-private-staging.md).

A phone must run Tailscale on the network owning the entry point it uses. The earlier Cloudroom `localhost` preview runs through the Mac and is not a direct phone or shareable review URL. Different tailnets do not automatically share node DNS or access.

## Run locally

Requires Node **22.18 or newer** (the tests use Node's built-in TypeScript stripping) and npm.

```bash
npm ci
npm run dev
```

Open the loopback address printed by Next.js. The default is `http://127.0.0.1:3000`. No environment variables, external fonts, image service, accounts, or API keys are needed.

For a production-mode local check:

```bash
CIRCLE_NODE_TOTAL=2 npm run build
npm start
```

The app binds to IPv4 loopback, not a public interface. In Cloudroom, use `room-cli preview 3000` and share only its returned ready URL. A preview is not a Hostinger deployment.

## What works in the prototype

- Browse three fictional games and filter by pending responses or accepted invitations.
- Use **My games** to see Alex's confirmed seats and availability responses.
- Open an invitation, explicitly accept a seat, or cancel it with a confirmation step. Counts update; incomplete tables remain visibly incomplete.
- Respond to the sample poll with available, maybe, or unavailable. Available/maybe require at least one candidate time, but never allocate a seat. Unavailable requires no reason or time selection.
- Claim or release an open event duty.
- View separate four-seat tables and their accepted participants.
- Select an American card year, rules profile, and notes per table session. Record a manual hand value or draw at the complete sample table. No payouts or automatic scoring are calculated.
- Start a new session with different rules. Previous sessions keep their rules and results; their controls become read-only. Rules also lock when the first hand is recorded.
- Scores page (Axel's layout), reachable from the core nav (a fixed bottom tab bar with icons on phones): Games, Wins and Avg Pts cards; All / American / Chinese filter; empty state; "+ Score" records your own result for one game (game, date, type, points, won). The bell is a placeholder. Personal score log only; it is separate from per-table hand scoring.
- Create a new fictional game using Axel's New Game fields: Game Title, Date & Time (separate left-aligned pickers, Pacific), Location, Mahjong Type (American or Chinese), Max Attendees (blank = unlimited; tables are derived as four seats each), Visibility (Public, Friends Only, Private), a demo Join Code for Private games (regenerate/copy), and Notes. Card year and house rules are set per table under Tables & scores.
- Browse eight fictional crew members; preview a clearly labelled demo profile and invitation explanation.
- Reset all changes from the footer or profile dialog.

**Suggested walkthrough:** open “An evening with the crew” → Tables & scores → Table 1 → record a hand → New session → change card year/profile → view Session 1 again. Table 2 intentionally has only three players, so score recording is unavailable there.

## What is deliberately not implemented

**Every interaction is in-memory, in one browser tab. Refreshing or closing it clears all changes.** There is no server persistence, account creation, authentication, membership authorization, production RLS, multi-user synchronization, or secure private-data storage. The demo's organizer controls are available to everyone who can open the preview. Do not enter real player information or private home addresses.

No real invitations, messages, notifications, bookings, or payments are sent or created. The crew invite action explains the planned flow instead of generating a misleading live invitation link. The organizer's full poll-results/final-schedule workflow, waitlist promotion, score correction/finalization audit trail, and broader friend discovery remain future work.

All fixtures are synthetic. The sample schedule uses October 2026 dates and `America/Los_Angeles` wall-clock times. Date formatting is independent of the viewer's device time zone. The demo overlap check is same-day only; this is not a production recurrence, cross-time-zone, DST-conversion, or transactional booking engine.

American hand values are manually entered whole numbers. The NMJL year is metadata only; the prototype contains no commercial card content, hand validation, Chinese scoring, settlements, cross-ruleset leaderboards, or content licence claims. “House rules” and notes are descriptive, not an executable scoring calculator.

BB Player's tennis/badge experience is **not** implemented or replaced. This first Mahjong UI uses the agreed common architectural direction, with a dedicated staging Docker image/container and private Tailscale access. Independent product builds, WorkOS, Supabase, public DNS, and production deployment remain separately gated work in the [recommendation](MAHJONG-CREW-RECOMMENDATION.md).

## Verification

```bash
npm run lint
npm run typecheck
npm test
CIRCLE_NODE_TOTAL=2 npm run build
npm audit --audit-level=low
```

Initial verification completed on 2026-10-16:

- ESLint and TypeScript pass.
- All **19 unit tests** pass, including ID generation without HTTPS-only `randomUUID`, plus: fresh fixtures, response/seat separation, unavailable without a reason, slot validation, explicit/idempotent acceptance, full capacity, overlapping invitations, cancellation, incomplete tables, manual point validation, duplicate hand IDs, draws, per-table rules, preserved prior sessions, and time-zone-independent labels.
- Optimized production build passes with two build workers.
- The included GitHub checks workflow runs lint, type generation/typecheck, unit tests, build, and audit; it has not been executed remotely as part of this task.
- npm audit reports **zero vulnerabilities**, including development dependencies. ESLint 10 + TypeScript/React Hooks linting are used instead of the Next ESLint preset because its current transitive glob dependency has an unpatched advisory. No runtime UI library was added.
- Real Chromium walkthrough covers seat acceptance/cancellation, invalid and valid poll responses, creating a two-table game, manual score entry and rule locking, a new session with different rules, preserved previous results, desktop/mobile navigation, native dialog focus/Escape, and responsive forms. These are recorded interactive checks, not a committed automated browser test suite.
- Responsive overflow checks cover 320, 360, 390, 768, 1024, and 1440 px widths. Mobile QA caught and fixed a fixed-navigation/backdrop-filter interaction and navigation retaining the previous screen's scroll position.

The layout provides a keyboard skip link, visible focus states, labelled forms, native modal focus trapping, reduced-motion support, and text status labels. This is not a claim of a completed accessibility audit; test with actual players before launch.

## Gather feedback next

Ask the crew whether the visual tone feels welcoming, whether they can find their next action without help, whether “available” versus “confirmed” is clear, and whether hand entry matches their real scorekeeping. Confirm the initial card year, point convention, and house rules before building persistent scoring.
