# Private staging verification — 2026-10-16

## Scope and approval

The user approved the silver/grey Mahjong prototype, then explicitly requested Hostinger staging through the reviewer's existing Tailscale node. After the owner's phone could not open the earlier preview, a second private entry point was added on the owner's main tailnet. No production database, identity provider, public DNS, public app route, network ACL, or global Tailscale HTTPS setting was changed.

Actual tailnet hostnames/IPs are intentionally omitted from this public repository. Private URLs are in the Cloudroom conversation.

## Release and runtime

- Application source: `2e6ddc1` (previous release `fa54bf5` retained).
- Image: `mahjong-crew-staging:2e6ddc1`.
- Image ID: `sha256:d6e5c9ec3c6fe7057faa2431d3491a588b0685b2653aa841cc025af10aea16ab`.
- Pinned Node base: `node@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392`.
- Dedicated Compose project: `/docker/mahjong-crew-staging`; no other app container was redeployed.
- Host architecture is x86_64; builder is ARM64. The app was compiled off-host; locked production dependencies were installed for the target architecture during lightweight image assembly.
- Container healthy; host HTTP is bound only to `127.0.0.1:3012`, not a public interface.
- Non-root UID/GID 1000, read-only root filesystem, temporary/cache tmpfs mounts, dropped capabilities, no-new-privileges, 512 MiB memory cap, 0.5 CPU, 128 PID limit, and rotated logs.
- Observed after checks: about **40.6 MiB** app memory and **0%** instantaneous CPU. Available host memory remained about 2.1 GiB. These are point-in-time measurements, not load-test capacity guarantees.

## Before/after infrastructure checks

| Check | Result |
| --- | --- |
| Existing Docker container IDs | All 12 baseline containers unchanged. Only the new staging app was created/recreated. |
| Existing review-node Serve configuration | Deep JSON comparison confirmed every old TCP/web handler unchanged. Only new HTTPS 7443 → loopback app added. |
| Existing main-node Serve configuration | Deep JSON comparison confirmed old HTTP 80 dashboard/decks handlers unchanged. Only new HTTP 8080 → same loopback app added. |
| Public exposure | No Traefik route, app-net attachment, public app port, DNS change, or Tailscale Funnel. Both Serve entries report tailnet-only access. |
| Review-node HTTPS | HTTP 200 through the actual Serve TLS path, certificate validation successful (`ssl_verify_result=0`). Tested using that node's Tailscale context, not the reviewer's personal device. |
| Owner's network | Main entry point and all tested assets reachable from the paired Mac over its own tailnet. |
| Server logs | Clean Next.js startup; no runtime errors in the inspected tail. |

Serve configuration snapshots and release artifacts were saved inside the server's staging project for rollback; they are not committed here.

### Issues found and resolved

1. Docker's `internal: true` bridge accepted a loopback port binding in configuration but did not publish it at runtime: container health passed, host HTTP failed. Replaced only this new project's network with a dedicated ordinary bridge and verified the actual loopback listener. Outbound traffic is permitted, while app ingress remains loopback-only; the app is not on the public proxy network.
2. The initial `localhost` Cloudroom preview was Mac-forwarded, not directly accessible on a phone. The review node also belongs to a different tailnet from the owner: the Mac could not resolve/reach its private hostname. Kept that review endpoint and added a separate main-network entry point instead of widening ACLs or making staging public.
3. Main-network HTTPS is not configured. Used its existing HTTP-over-encrypted-Tailscale pattern without enabling global certificate settings. Switched tab-local record IDs from HTTPS-only `crypto.randomUUID` to `crypto.getRandomValues`; a regression test simulates a browser with no `randomUUID`.

## Eleven HTTP cases from the owner's paired Mac

At approximately 23:05 UTC, a single sequential pass completed in **1.28 seconds** total. It verified:

1. `GET /` → 200, correct Mahjong title/copy, fictional-data notice, and `noindex` metadata.
2. React/vendor JavaScript chunk → 200, nonempty.
3. Shared JavaScript chunk → 200, nonempty.
4. Application page JavaScript → 200, nonempty.
5. Main app JavaScript → 200, nonempty.
6. Polyfill JavaScript → 200, nonempty.
7. Webpack runtime JavaScript → 200, nonempty.
8. Compiled stylesheet → 200, nonempty.
9. Generated SVG icon → 200, nonempty.
10. Unknown application path → 404.
11. `HEAD /` → 200.

This verifies the real private client path and compiled asset delivery. It is not a concurrent-user performance benchmark.

## Application checks

- Fresh `npm ci`, ESLint, generated route types + TypeScript, all **16 unit tests**, optimized production build, and full npm audit passed; audit reported zero vulnerabilities.
- Interactive Chromium walkthrough verified invitations/cancellation, poll validation and multiple candidate times, creating a two-table game, a recorded hand, locked scored-session rules, a new session with different card/profile, preserved earlier results, and separate incomplete tables.
- Desktop and 390 px mobile renders were checked against the deployed app through a private SSH tunnel. Earlier responsive overflow checks also covered 320, 360, 768, 1024, and 1440 px widths.
- Mobile fixed navigation, reset scroll on navigation, modal focus/Escape, and responsive form widths were checked. This is not an actual iPhone hardware or full accessibility audit.
- The included GitHub workflow has not been run remotely in this task; the equivalent commands passed locally.

## Remaining boundaries

The reviewer's own phone/device access still depends on being connected to the correct Tailscale network and its existing policy permitting TCP 7443. The owner's phone must use the main-network URL with Tailscale connected and TCP 8080 permitted. No claim is made that either physical phone was directly tested.

All game interactions remain synthetic and tab-local. This deployment establishes neither application authentication nor secure real-player persistence. Refresh clears changes. Production `mahj.aauth.tech` and any public staging hostname remain unconfigured.
