# CYBER FUNK

*A Neon Orleans Jazz-Punk RPG.* "The city that care forgot never forgot how to play."

A text RPG built for a phone. NEON ORLEANS, 2084: pick a New Orleans brass-band instrument, fight with music, tap On the One, take back the six Blue Notes from Metronome Corporation's lieutenants, and lead a second line up Metronome Tower to break the Click.

No images and no audio files: every sound is synthesized with the Web Audio API.

> **Version 2.0 is in progress.** The game is being rebuilt in TypeScript and React as an installable web app, with cloud saves in PostgreSQL.
> - **What 2.0 plays so far:** the prologue, Tremé and Captain Hush (plus Vox's choice and the Cutting Contest, through the dev menu).
> - **The full game:** v1, in [`legacy/`](legacy/), playable until 2.0 matches it exactly.
>
> The phases are in [docs/roadmap.md](docs/roadmap.md).

## Play it

**With Docker** (the game, its save server and the database):

```bash
docker compose up --build -d --wait     # then open https://localhost:8443
docker compose down                     # stop; saves are kept in a Docker volume
```

To play on your phone, or install it there as an app, follow [docs/guides/docker.md](docs/guides/docker.md#play-and-install-on-your-phone) (HTTPS through Caddy). Settings live in `.env` (copy [`.env.example`](.env.example)). Before running it anywhere but your own machine, change the database password.

**v1:** open `legacy/dist/cyberfunk.html` in a browser. It's one self-contained file.

**Dev menu:** in either version, tap the version number on the title screen five times.

### Saves

- **Three slots.** Continue, New Game and Import Save each ask which slot.
- **Saved on the phone first, always.** The game never waits on the network. When the server is reachable, each save also uploads in the background. With no signal you keep playing, and the save uploads when the connection is back.
- **No account.** The first upload gives the device a **player code** (`CFP-XXXX-XXXX-…`, shown in Settings → Cloud saves).
  - Enter the code on another device to continue there, or to get your saves back if the browser forgets them.
  - Write it down: it's the only key to your cloud saves.
- **Conflicts.** If two devices changed the same slot, the game asks which one to keep. It never asks mid-battle.
- **History.** The server keeps the last 20 saves of each slot, and any of them can be restored from the slot picker.
- **Export codes.** Settings → Export Save gives a `CF2:` code that works without the server.

Design and rules: [docs/architecture/server.md](docs/architecture/server.md), and [ADR-0006](docs/adr/0006-server-and-cloud-saves.md) for why.

## Develop

**Everything in Docker**, no Node needed on your machine:

```bash
docker compose -f compose.dev.yaml up --build         # game with hot reload on :5173, API on :8787, Postgres
docker compose -f compose.dev.yaml run --rm tools     # typecheck, lint, layer rules, all tests (npm run docker:check)
docker compose -f compose.dev.yaml run --rm e2e       # Playwright at 360×740             (npm run docker:e2e)
```

**Or on your machine** with Node 24 (`.nvmrc`):

```bash
npm install
npx playwright install chromium            # once, for e2e
docker compose -f compose.dev.yaml up -d db                          # Postgres for the API and server tests
DATABASE_URL=postgres://cyberfunk:cyberfunk@localhost:5432/cyberfunk PORT=8787 npm run dev:server
npm run dev                                # http://localhost:5173; /api is forwarded to :8787
VITE_CLOUD=off npm run dev                 # or: UI work with no server at all (saves stay local)
```

| Command | What it does |
|---|---|
| `npm run check` | Typecheck, lint, layer rules and the game's tests. Run it before every commit. |
| `npm test` | The game's Vitest suites: unit, content validation, headless playthroughs, parity with v1. Needs no database. |
| `npm run test:server` | The server's tests against a real Postgres (the dev `db` container) |
| `npm run e2e` | Playwright on a 360×740 touch phone: builds a local-only test build and fails on any horizontal overflow |
| `E2E_STACK_URL=https://localhost:8443 npx playwright test` | The cloud-save e2e, against the running Docker stack (two browsers playing two phones) |
| `npm run build` / `npm run build:server` | The game → `dist/`; the server → one bundle in `dist-server/` |
| `npm run db:generate` | After editing `server/db/schema.ts`: writes the SQL migration (commit it) |
| `npm run sim` / `npm run trace` | Headless balance simulation; one fight's log |
| `npm run parity:coverage` | The v1-vs-v2 engine oracle under coverage (fails below 95% branches) |
| `npm run legacy:build` / `legacy:sim` | Rebuild or simulate v1 |

The full guides are [docs/guides/docker.md](docs/guides/docker.md) and [docs/guides/testing.md](docs/guides/testing.md). Contribution workflow: [CONTRIBUTING.md](CONTRIBUTING.md).

## How it's built

| Concern | Choice |
|---|---|
| Game | TypeScript 6 (strict), React 19, Valtio, CSS Modules, Vite 8 |
| Save server | Node 24, Fastify 5, Drizzle ORM, PostgreSQL 18, Zod (the same save schema on both sides) |
| Tests | Vitest, Playwright, plus parity oracles that run v1 and v2 side by side |
| Run | One multi-stage `Dockerfile`; `compose.yaml` (run it) and `compose.dev.yaml` (develop) |

The game is six layers. Imports only point down, and `npm run depcruise` enforces it ([ADR-0002](docs/adr/0002-layering.md)):

```
ui         React: screens, sheets, the battle view. Renders snapshots, calls commands.
app        The session, stores, presenters, saves and cloud sync. No React.
engine     Rules: stats, combat, economy, progression. Deterministic, no DOM.
content    Typed data (classes, enemies, items, districts) and the story, as *.scene.ts scripts.
narrative  The scene runtime: the Director and the scene API.
core       Ids, types, the seeded Rng, pure helpers.
```

`server/` sits beside the layers. It shares only the save format and the API contract (`src/app/save/format.ts`, `protocol.ts`) and the core ids they use. The game never imports the server.

A few rules shape everything ([engineering principles](docs/vision/engineering-principles.md)):
- **Parity first.** v2 must match v1 exactly (same numbers, same random draws), proven by the oracles in `tools/parity/`. Fixes come afterwards, one commit each ([known issues](docs/known-issues.md)).
- **Deterministic.** All game randomness comes from one seeded `Rng`, and it's saved with the game, so a save and a seed replay a fight exactly.
- **Mistakes don't compile.** Every id is a typed union. Content tables are checked against them, and a validator catches what types can't.
- **Phone first.** Everything is built for a 360px screen with one-thumb controls and 48px tap targets, and the e2e suite fails on any horizontal overflow.

## Repo layout

```
src/            the game (layers above); main.tsx boots it
  app/save/       save format, slots, the cloud API client and sync engine
server/         the save API: routes/, repo/ (SQL rules), db/ (schema, migrations)
tests/          integration/ (headless playthroughs), e2e/ (Playwright), e2e/stack/ (against Docker)
tools/          sim, trace, content validator, layer rules; parity/ and migrate/ until cutover
docs/           architecture, guides, ADRs, roadmap; start at docs/README.md
docker/         the dev entrypoint and the database init script
legacy/         v1, unchanged: the source of truth for behavior until cutover
Dockerfile, compose.yaml, compose.dev.yaml, .env.example
```

## Documentation

Start at [docs/README.md](docs/README.md) for the reading order. The most-used pages:

- **Architecture:** [core and engine](docs/architecture/core-and-engine.md), [content model](docs/architecture/content-model.md), [narrative runtime](docs/architecture/narrative-runtime.md), [UI](docs/architecture/ui.md), [state and saves](docs/architecture/state-and-saves.md), [server and cloud saves](docs/architecture/server.md)
- **Guides:** [writing scenes](docs/guides/writing-scenes.md), [balancing](docs/guides/balancing.md), [testing](docs/guides/testing.md), [Docker](docs/guides/docker.md)
- **Decisions:** [ADRs 0001–0006](docs/adr/)
- **Game systems:** [combat](docs/systems/combat.md)

## Credits

Written for a phone screen, in the spirit of the Social Aid & Pleasure Clubs who remember how to play. Dirge on the way there, dance on the way back.
