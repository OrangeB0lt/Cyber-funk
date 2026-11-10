# ADR-0008: Optional Google sign-in as a gateway in front of the site

- **Status:** Accepted (2026-11-09).
- **Amends:** ADR-0006. Players stay anonymous to the server; this adds an optional gate in front of it.

## Context

A public deployment answers anyone. Anyone can load the game, create anonymous players (10 an hour per IP) and upload saves (300 requests a minute per IP). The owner wants only people they choose to reach the site at all. The owner chose:

- gate the whole site, not just cloud saves
- Google sign-in, with an allowlist of email addresses
- a real domain, behind the existing Caddy

## Decision

1. **A gateway, not app authentication.**
   - `compose.auth.yaml` adds oauth2-proxy (Google provider, `authenticated-emails-file`).
   - It swaps in `docker/caddy/Caddyfile.auth`, where Caddy's `forward_auth` asks oauth2-proxy (`/oauth2/auth`) about every request before proxying to the app.
   - The game, the server, the save protocol and the database don't change. The anonymous player codes keep working behind the gate.
2. **Opt-in.** The default `compose.yaml`, the CI stack tests and development run without it. `COMPOSE_FILE=compose.yaml:compose.auth.yaml` in `.env` turns it on.
3. **Signed out, `/api` answers 503, not 401.**
   - The client treats 401 as "the server forgot this player" and drops the device's player code, so an expired Google session would orphan its cloud saves.
   - A 503 reads as offline: sync backs off and resumes after sign-in.
   - Pages and assets redirect to `/oauth2/start`.
4. **Two changes on the game side.**
   - The service worker's navigation fallback skips `/oauth2/*`, so an installed PWA can reach the sign-in pages.
   - The manifest and icons are served without sign-in, so installing the app works whether or not the browser sends cookies with the manifest request.
5. **Sessions last 30 days** (an encrypted cookie, no refresh). The allowlist file is watched, so edits apply without a restart.

## Consequences

- Strangers and bots never reach the app or the database. Only the manifest and icons are public.
- There is no per-user identity inside the game. Cloud saves are still keyed by player code, not by Google account. Tying saves to an account would be an in-app change with a protocol and schema migration. Revisit it if that's ever wanted.
- When the session expires, an installed PWA plays offline with sync paused, with no prompt in the UI. The player signs in again at `/oauth2/start`. An in-game "signed out" hint would need the client to recognise the 503 body.
- Google only accepts redirect URLs on a real domain or `localhost`, so the gate can't serve a bare LAN IP.
- One more container to keep patched (`quay.io/oauth2-proxy/oauth2-proxy`, pinned).
