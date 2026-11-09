# Running with Docker

*Two Compose files. `compose.yaml` runs the game the way players get it. `compose.dev.yaml` is for development, including tests, with nothing but Docker on your machine. The design is in [server.md](../architecture/server.md).*

## Run it all (production image)

```bash
cp .env.example .env              # optional: the defaults are fine on your own machine
docker compose up --build -d --wait
open https://localhost:8443          # your browser warns about Caddy's local certificate: accept it, or trust it (below)
```

| Service | What it is |
|---|---|
| `caddy` | HTTPS in front of `app` ([docker/caddy/Caddyfile](../../docker/caddy/Caddyfile)), on ports 8443 (HTTPS) and 8080 (redirects to HTTPS). Its certificates and local CA live in the `caddy_data` volume. |
| `app` | The production image: Node 24 on Alpine, serving the built game and the `/api` cloud-save server on port 8080 inside the stack (reached only through Caddy). No `node_modules`; the server is one bundled file. |
| `db` | PostgreSQL 18. Its data lives in the `pgdata` volume. Not reachable from your machine. |

The app runs migrations when it starts, so a fresh `db` volume is ready on first boot.

```bash
docker compose logs -f app                        # server logs (JSON lines)
docker compose exec db psql -U cyberfunk          # SQL shell
docker compose down                               # stop (saves survive in the pgdata volume)
docker compose down -v                            # stop and delete every save
```

### Play and install on your phone

Installing the game as an app needs HTTPS that the phone trusts. Caddy issues certificates from its own local CA for `localhost` and IP addresses, so the phone has to trust that CA once:

1. Serve your computer's LAN address. Put `SITE_ADDRESS=192.168.1.20` (yours) in `.env`, then run `docker compose up -d`.
2. Export Caddy's root certificate: `docker compose cp caddy:/data/caddy/pki/authorities/local/root.crt ./caddy-root.crt`.
3. Trust it on the phone:
   - **iPhone:** AirDrop or mail the file to yourself and open it, then install the profile (Settings → General → VPN & Device Management). Then turn on full trust (Settings → General → About → Certificate Trust Settings).
   - **Android:** Settings → Security → Encryption & credentials → Install a certificate → CA certificate.
4. On the phone, open `https://192.168.1.20:8443`. Then choose Add to Home Screen (Safari) or Install app (Chrome).

**A real domain:** set `SITE_ADDRESS=game.example.com`, `HTTP_PORT=80` and `HTTPS_PORT=443`, and point the domain's DNS at the machine. Caddy then gets a Let's Encrypt certificate, and nothing needs trusting by hand.

### Settings (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `SITE_ADDRESS` | `localhost` | The name or IP players use. localhost and IPs get Caddy's local CA; a domain gets Let's Encrypt |
| `HTTPS_PORT` / `HTTP_PORT` | `8443` / `8080` | Ports on your machine (HTTP only redirects). For a real domain, `443` / `80` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `cyberfunk` | Database credentials. **Change the password anywhere but your own machine.** It goes into a URL, so stick to letters and digits. |
| `LOG_LEVEL` | `info` | `debug` for more, `warn` for less |
| `TRUST_PROXY` | `true` | The app runs behind Caddy, so rate limits take the client IP from `X-Forwarded-For`. Set `false` only if you run the image without a proxy |

### Back up and restore

```bash
docker compose exec -T db pg_dump -U cyberfunk -Fc cyberfunk > cyberfunk.dump
docker compose exec -T db pg_restore -U cyberfunk -d cyberfunk --clean < cyberfunk.dump
```

## Develop in Docker

```bash
docker compose -f compose.dev.yaml up --build    # or: npm run docker:dev
```

| Service | Port | What it runs |
|---|---|---|
| `web` | 5173 | `vite`: the game with hot reload. `/api` is forwarded to `api`. |
| `api` | 8787 | `tsx watch server/index.ts`: restarts when a server file changes |
| `db` | 127.0.0.1:5432 | PostgreSQL 18, volume `pgdata-dev`. It also creates `cyberfunk_test` for the server tests. |

- **Where things live:**
  - The repo is bind-mounted at `/app`, so edits on your machine show up immediately.
  - `node_modules` lives in a named volume because it holds Linux binaries. The first start runs `npm ci` into it, and later starts reinstall only when `package-lock.json` changes (`docker/dev-entrypoint.sh`).
- **If hot reload misses changes** (rare on Docker Desktop), set `VITE_POLL=1` before `up`.
- **On your phone:** `http://<LAN IP>:5173`.

### Checks and tests in containers

```bash
docker compose -f compose.dev.yaml run --rm tools   # npm run check + npm run test:server  (npm run docker:check)
docker compose -f compose.dev.yaml run --rm e2e     # Playwright, local suite, 360×740      (npm run docker:e2e)
docker compose -f compose.dev.yaml run --rm tools npm run sim    # any npm script
```

The `e2e` service uses the official Playwright image (its version must match `@playwright/test` in `package.json`) and shares the `node_modules` volume.

### Database tasks

```bash
# after editing server/db/schema.ts: write the migration (commit it)
docker compose -f compose.dev.yaml run --rm tools npm run db:generate
# a SQL shell on the dev database
docker compose -f compose.dev.yaml exec db psql -U cyberfunk
# start over
docker compose -f compose.dev.yaml down -v
```

## Without Docker (Node 24 on your machine)

Everything still works with plain npm; only Postgres needs a container:

```bash
docker compose -f compose.dev.yaml up -d db
DATABASE_URL=postgres://cyberfunk:cyberfunk@localhost:5432/cyberfunk PORT=8787 npm run dev:server
npm run dev                         # the game on :5173, forwarding /api to :8787
npm run test:server                 # uses cyberfunk_test on localhost:5432 by default
```

To work on the UI without any server, run `VITE_CLOUD=off npm run dev`: the game is local-only and never calls the API.

## The image, briefly

`Dockerfile` has three targets:

| Target | Used by | What it is |
|---|---|---|
| `dev` | `compose.dev.yaml` | Node 24 (Debian slim), non-root `node` user, the install-on-start entrypoint |
| `build` | the runtime target | `npm ci`, `npm run build` (the game → `dist/`), `npm run build:server` (esbuild → `dist-server/index.mjs`) |
| `runtime` | `compose.yaml` | Node 24 on Alpine, non-root, healthcheck on `/api/health`; holds `dist/`, `dist-server/` and the migrations |

The build context is trimmed by `.dockerignore`: no docs, tests or tools.
