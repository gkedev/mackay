# Mackay — BB Player

Public development repository: **https://github.com/gkedev/mackay**.

The Broken Bodies player app, planned for **https://player.aauth.tech**.

A friendly clubhouse for routine Monday-night tennis: availability, groups of four, substitutes, and humorous badges of courage. WhatsApp remains the familiar announcement channel.

## Current state

This repository contains the agreed product specification and development plan. It does **not** yet contain a running application, configured login, database, deployment, or DNS changes.

Cloudroom is the development workspace, with Codex and Pi as implementation and review tools. Cloud repository binding is a separate setup step from publishing this repository.

## Start here

- [Product specification](docs/PRODUCT-SPEC.md): canonical product rules and acceptance cases.
- [Development plan](docs/DEVELOPMENT.md): platform integration, implementation sequence, and first coding task.

Read both before implementing features. The specification in this repository is the canonical version.

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
