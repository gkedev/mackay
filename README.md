# Mackay — BB Player & Mahjong Crew

A player app for community and scheduling.

Public development repository: **https://github.com/gkedev/mackay**.

The Broken Bodies player app, planned for **https://player.aauth.tech**.

A friendly clubhouse for routine Monday-night tennis: availability, groups of four, substitutes, and humorous badges of courage. WhatsApp remains the familiar announcement channel.

## Current state

This repository contains the agreed BB Player specification and development plan, plus a runnable **Mahjong Crew design prototype**, now deployed to a separate **private Hostinger staging container** for Tailscale review. The prototype uses fictional players and in-memory interactions; refreshing clears changes. Private review URLs are shared in the Cloudroom thread, not this public repository. BB Player itself is not implemented. Neither product has configured login, a connected database, a production deployment, or public DNS changes from this work.

### Try the Mahjong prototype

With Node 22.18+ and npm:

```bash
npm ci
npm run dev
```

Open the loopback address printed by Next.js. No API keys or environment variables are needed. See the [prototype guide](docs/PROTOTYPE.md) for working flows, mock boundaries, and verification commands.

The repository is registered as a Cloudroom development project, with Codex and Pi as implementation and review tools. Each Cloud coding run must verify its own repository checkout and provider authentication before work begins.

## Start here

- [Product specification](docs/PRODUCT-SPEC.md): canonical product rules and acceptance cases.
- [Development plan](docs/DEVELOPMENT.md): platform integration, implementation sequence, and first coding task.
- [Mahjong Crew recommendation](docs/MAHJONG-CREW-RECOMMENDATION.md): supplied-flow review, confirmed product choices, proposed shared foundation, and isolated Hostinger deployment. Does not change the agreed BB requirements.
- [Mahjong prototype guide](docs/PROTOTYPE.md): Rackettes pink/black interface, local setup, supported demo interactions, and what is not connected.

Read the product specification and development plan before implementing features. The specification in this repository is the canonical version.

## Proposed stack

- Next.js + TypeScript, mobile-first web app.
- WorkOS AuthKit for player identity; app membership initially invite-only.
- Supabase Postgres and Row Level Security for application data.
- Hostinger for isolated staging/production app deployment.
- Codex and Pi, managed through Cloudroom, for implementation and review.

## Core distinction

Availability is independent of ailments. A muted badge is a **factor, not a blocker**, and remains interactive. A full-color, explicitly event-specific blocker prevents confirmation for that Monday. Several muted factors never automatically become a blocker.

## Public demo boundaries

This repository is public so others can follow the development and review the demo. Use synthetic players and example badges only; do not publish real rosters, phone numbers, WhatsApp exports, personal ailment records, or credentials. The eventual public demo must not connect anonymously to production player data.

Publishing this repository does not deploy the application. Do not publish the app, change DNS, enroll a production host, send player messages, or use production privileged credentials as part of a development task without explicit approval. Keep secrets out of Git and chat transcripts.
