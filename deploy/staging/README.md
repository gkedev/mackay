# Private Tailscale staging

This deployment is a synthetic-data design preview, **not** the production club app. There is no app-level sign-in or server-side persistence. Refreshing clears tab-local changes. Keep real player details out.

## Boundaries

- Dedicated Hostinger Compose project: `/docker/mahjong-crew-staging`.
- App HTTP is published **only** on host loopback `127.0.0.1:3012`.
- Runtime uses a dedicated Docker bridge, not the shared public proxy network. Traefik discovery is explicitly disabled. The bridge allows outbound traffic; inbound application access is published only on host loopback. Docker's `internal: true` suppressed loopback port publishing on this host, so it is not used.
- A separate **Tailscale Serve HTTPS port 7443** on the existing authorized review node proxies to `http://127.0.0.1:3012`. Preserve its other routes. Do not use Tailscale Funnel, reset Serve configuration, or publish the app port on `0.0.0.0`.
- A second **private HTTP port 8080** on the owner's main Tailscale node points to the same loopback app. The review node and main node belong to different tailnets; DNS/access do not automatically cross them. Main-network HTTPS is not configured, so this uses its existing HTTP-over-encrypted-Tailscale pattern without enabling global HTTPS settings. No credentials or real records are collected.
- Private URLs use the relevant node's existing `*.ts.net` hostname with the appropriate scheme/port. Actual review URLs are shared privately, not committed to this public repository.
- No public DNS, `mahj.aauth.tech`, production credentials, or existing application containers are changed.

## Prepare and deploy a release

This requires explicit deployment approval and authorized VPS/Tailscale access. Commands below are a checklist, not an unattended deployment script.

1. On the builder, run `npm ci`, lint, typecheck, tests, production build, and audit. `npm run build` packages static assets into `.next/standalone/.next/static`.
2. Record the source commit and build ID. Assemble a **new release directory** containing only `package.json`, `package-lock.json`, this Dockerfile, and `runtime/server.js` plus the prepared `runtime/.next/` copied from `.next/standalone`. Do not transfer `.env`, local credentials, source fixtures beyond the compiled app, or the builder's `node_modules`.
3. Copy that release directory and `compose.yaml` into the staging project. Do not overwrite an existing project's files or the previous release.
4. Pin the official Node 22 Bookworm slim base by digest. Assemble a uniquely tagged local app image using that digest via `--build-arg NODE_IMAGE=...`. This installs only locked production dependencies for the VPS's actual architecture; the application is **not** compiled on the shared VPS. Record the resulting app image ID.
5. Set `MAHJ_STAGING_IMAGE` to that exact release tag in the server's protected deployment environment (never commit its `.env`). Validate with `docker compose config --quiet`, then use `docker compose up -d --wait --wait-timeout 90` in this project only.
6. Verify the container is healthy, HTTP returns 200 on `127.0.0.1:3012`, static scripts/styles load, and port binding is loopback-only. Recheck memory headroom.
7. Back up the review node's current `tailscale serve status --json`. Ensure HTTPS port 7443 is unused, then add only `tailscale serve --bg --https=7443 http://127.0.0.1:3012` inside that node's existing Tailscale context. Never reset or replace the whole configuration.
8. Compare before/after configurations to confirm every pre-existing TCP listener, web handler, and Funnel setting is unchanged. The new route must say **tailnet only**, with no Funnel enabled.
9. Test the actual HTTPS path and core interactions. For the main-network entry point, back up its Serve configuration separately, confirm HTTP port 8080 is unused, and add only `tailscale serve --bg --http=8080 http://127.0.0.1:3012` in that node's context. Compare its old routes afterward too. Verify from an authorized client on each relevant network where available; server-side health alone does not establish that a particular person's device/ACL can reach the node. The owner entry point was tested from the paired Mac; the HTTPS path was tested through the review node's Tailscale context, not the reviewer's phone.

## Runtime safeguards

The app runs as non-root, with a read-only root filesystem, bounded temporary/cache filesystems, dropped capabilities, no-new-privileges, 512 MiB memory, a half-CPU budget, a PID limit, health checks, and rotated logs. It mounts no host folders, Docker socket, secrets, or database volumes. This is suitable for this small stateless prototype, not sizing evidence for a live multi-user app.

## Rollback

Keep the previous image and release directory. For an update, restore the previous exact `MAHJ_STAGING_IMAGE` value and recreate **only this Compose project**. On a first deployment, stopping this project's app removes the new service without disturbing other apps. To remove the review endpoint, disable **only the newly added HTTPS 7443 Serve listener** using the installed Tailscale CLI; never run `tailscale serve reset`. Disable only the added HTTP 8080 listener in the main node's separate context if removing that entry point. There is no database to migrate or restore for this prototype.

If a reviewer cannot connect, verify their Tailscale connection, the correct tailnet/URL, and that their policy permits the relevant node on TCP 7443 or 8080. A Mac-local `localhost` preview URL cannot be opened directly from a phone. Synthetic record IDs use `crypto.getRandomValues`, so private HTTP review does not depend on HTTPS-only `randomUUID`. Do not silently widen network policy or make the prototype public as a workaround.
