# Architecture overview

*The whole system on one page, for someone new: the six layers, how a tap becomes a game rule and comes back as pixels, where saves go, how the PWA and the server fit in, and how it's all tested. Each section links to the page that goes deeper. For a guided walk through the actual call paths, read the [code map](code-map.md) next.*

## The system in one picture

```
 Phone or browser (src/, built by Vite into an installable PWA)
 ┌───────────────────────────────────────────────────────────────┐
 │  ui         React screens, sheets, battle view                │
 │  app        GameApp, Session, presenters, saves, cloud sync   │──── localStorage (3 save slots)
 │  engine     rules: stats, combat, economy, progression        │
 │  content    typed data tables + *.scene.ts story scripts      │
 │  narrative  scene API, Director                               │
 │  core       ids, types, seeded Rng                            │
 └───────────────────────────────┬───────────────────────────────┘
                                 │ /api (builds with cloud saves; HTTPS in the stack)
                       ┌─────────▼─────────┐
                       │ Caddy (TLS)       │   docker/caddy/Caddyfile
                       └─────────┬─────────┘
                       ┌─────────▼─────────┐      ┌────────────────┐
                       │ server/ (Fastify) │─────▶│ PostgreSQL     │
                       │ API + built game  │      │ saves, history │
                       └───────────────────┘      └────────────────┘
```

The game runs entirely on the device. The server is optional: it stores copies of saves so a player can move between devices and roll back. A build with `VITE_CLOUD=off` never talks to it.

## The six layers

The code in `src/` is split into six layers ([ADR-0002](../adr/0002-layering.md)). A module may import only from its own layer or the layers below it, and `npm run depcruise` enforces that, with no import cycles allowed.

```
core ← narrative ← content ← engine ← app ← ui
```

| Layer | Folder | Owns | Never does |
|---|---|---|---|
| core | [`src/core/`](../../src/core/) | Every id list (`as const`, in `ids/`), the shared types (`GameState`, `Battle`, content `*Def`s, effects, `EffectOps`), the seeded `Rng`, pure helpers | Import any other layer |
| narrative | [`src/narrative/`](../../src/narrative/) | The scene API (`Scene`, `SceneContext`, `Presenter`), the `Director`, `definePlace` and `defineEvent` | Know about content, the engine or React |
| content | [`src/content/`](../../src/content/) | Data tables (classes, skills, enemies, bosses and their AI, items, gear, districts, acts), sprites, and the story as `*.scene.ts` files | Import the engine. Engine capabilities arrive as `EffectOps` arguments |
| engine | [`src/engine/`](../../src/engine/) | Game rules as plain functions that mutate `GameState` and `Battle` in place: stats, combat, encounters, shops, rewards | Import scenes, `content/index.ts`, or anything above it. It never waits for the player |
| app | [`src/app/`](../../src/app/) | `GameApp`, `Session`, the `SceneContext` implementation, the battle controller, both presenters, the view store, saves and cloud sync | Import React |
| ui | [`src/ui/`](../../src/ui/) | React components: screens, sheets, popups, the battle view, styles | Hold game rules or mutate state |

A few rules sit on top of the layering:
- Only `*.scene.ts` files in content may import `narrative/`, so the engine and the balance sim never load prose.
- Only `ui/` and `tools/` may import `content/sprites/` ([ADR-0007](../adr/0007-character-sprites.md)).
- `server/` sits beside the layers, not in them. It may import only `src/core/*`, `src/app/save/format.ts` and `src/app/save/protocol.ts`, and `src/` never imports `server/`.

Deeper: [core and engine](core-and-engine.md), [content model](content-model.md), [narrative runtime](narrative-runtime.md), [UI](ui.md).

## The runtime flow

The long-lived objects (`GameApp`, its `Session` and `Director`, the `ReactPresenter`) exist once in the browser, all built by `new GameApp()` in [`src/main.tsx`](../../src/main.tsx). A `SceneContext` is made fresh for each scene run, and a `Battle` for each fight.

```
 tap in React (ui/)
   │  app.chooseOption(place, key)                 a GameApp command (app/game.ts)
   ▼
 Session.chooseOption ──▶ Director.run(scene)      single flight, cancellable (narrative/director.ts)
                              │ makeContext(signal)
                              ▼
                         scene(s)                  content/**/*.scene.ts: await s.narrate(), s.choose(), s.fight()
                              │
                  SceneContext (app/sceneContext.ts)
                   ├──▶ engine functions ──▶ mutate store.game (the save, a Valtio proxy)
                   ├──▶ runBattle (app/battleController.ts) ──▶ engine combat loop, pulled turn by turn
                   └──▶ Presenter.line / choose / sheet / battle.*
                              │
                  ReactPresenter (app/reactPresenter.ts) ──▶ writes app.view (a Valtio proxy)
                              │
 React re-renders frozen snapshots of store.game and app.view
```

- **The UI renders and dispatches.** Components read snapshots with `useGame()` and `useView()` and change things only by calling `GameApp` commands. Writing to a snapshot throws in development.
- **The presenter owns the waiting.** When a scene awaits a line or a choice, `ReactPresenter` keeps the promise in a private map and puts only an id in the view. The player's tap calls a command that resolves it. A stale id is ignored.
- **Places are routes, not scenes.** Between scenes the player is on a route (the district screen or a place). When any scene settles, whether it finished, was interrupted, failed or was aborted, the Director's `onSettled` shows the current route, so a scene can't strand the player.
- **Battles are pulled.** `runBattle` calls `runUntilPlayer` and `playerAction` in the engine, then hands the resulting `BattleEvent`s to `presenter.battle.play` to animate. The engine never waits on the UI, which is why the sim can run it with no presenter at all.
- **The same code runs headless.** Swap `ReactPresenter` for `ScriptedPresenter` and localStorage for `memorySaveStorage()`, and the real `Session`, scenes and battles run in Vitest in milliseconds.

Deeper: [code map §3–§10](code-map.md#3-the-runtime-objects-and-their-wiring) (every object, callback and flow), [ADR-0004](../adr/0004-scene-api.md) (the scene API), [ADR-0005](../adr/0005-ui-state-and-styling.md) (two stores, presenter-owned promises).

## Determinism

All game randomness comes from one seeded `Rng` ([`src/core/rng.ts`](../../src/core/rng.ts)), and functions that consume randomness take it as an argument. ESLint bans `Math.random` outside `ui/` and `app/audio/`, which may use it only for cosmetics. The stream's state is saved with the game, so a save replays the same draws, a seed reproduces a fight, and the balance sim's output is exact. This is also why behavior can be pinned by baselines (see [How it's tested](#how-its-tested)). Deeper: [ADR-0003](../adr/0003-determinism-and-parity.md).

## Saves

- **Local first, always synchronous.** The game saves at explicit checkpoints (entering a district, before and after bosses, after every battle, a manual save, a settings change), never on every change. `SaveStorage` writes `localStorage` and returns; nothing waits on the network.
- **Three slots.** Each is stored under `cyberfunk_save_v2:<slot>` (slots 1–3).
- **The envelope.** A save is `{ format, version, savedAt, rng, game }`. Loading validates it with Zod (`gameStateSchema` in [`src/app/save/format.ts`](../../src/app/save/format.ts)) and runs any migrations. A corrupt, invalid or too-new save is refused with a reason, never half-loaded.
- **Export codes.** `CF2:` plus the envelope in base64 (Settings → Export Save). Importing goes through the same validation.
- **Cloud sync.** If the build has cloud saves, `CloudSync` ([`src/app/save/sync.ts`](../../src/app/save/sync.ts)) uploads a changed slot in the background about a second after it's saved. Each slot carries a server revision, so a stale write is a conflict that the player settles, and never during a battle. A device gets an anonymous player code (`CFP-…`) on its first upload.

Deeper: [state and saves](state-and-saves.md) (the format, resume points, changing it safely), [server and cloud saves](server.md) (sync rules, conflicts, player codes).

## The PWA

`vite-plugin-pwa` ([`vite.config.ts`](../../vite.config.ts)) builds the manifest and a service worker, and [`src/main.tsx`](../../src/main.tsx) registers the worker in production builds only.

- The worker precaches the build, so once installed the game loads and plays offline.
- Nothing under `/api` is cached or served from the cache.
- A new version downloads in the background, then `GameApp.offerUpdate` sets `view.updateReady`. The `UpdateBanner` appears only on the district and place screens (the hubs), never mid-scene or mid-battle. Tapping **Update** saves, then reloads into the new version.
- Installing on a phone needs HTTPS, which Caddy provides in the Docker stack.

Deeper: [UI → The PWA](ui.md#the-pwa).

## The server

[`server/`](../../server/) is a small Node service: Fastify 5, Drizzle ORM on PostgreSQL 18, Zod. It serves the cloud-save API under `/api` and, in the production image, the built game too, so everything is same-origin.

- It decodes every upload with the game's own `decodeSave`, so a save the game couldn't load never reaches the database.
- The API contract is a set of Zod schemas in [`src/app/save/protocol.ts`](../../src/app/save/protocol.ts), parsed on both sides.
- It applies pending SQL migrations at startup. They are generated from [`server/db/schema.ts`](../../server/db/schema.ts) with `npm run db:generate` and committed.

Deeper: [server and cloud saves](server.md), [ADR-0006](../adr/0006-server-and-cloud-saves.md).

## Running it: Docker and Caddy

| File | Runs |
|---|---|
| [`compose.yaml`](../../compose.yaml) | The production stack: `caddy` (HTTPS on 8443, HTTP on 8080 redirects), `app` (the production image: the built game and the API on 8080, reached only through Caddy), `db` (PostgreSQL 18). `docker compose up --build -d --wait`, then https://localhost:8443 |
| [`compose.dev.yaml`](../../compose.dev.yaml) | Development: `web` (Vite with hot reload on 5173), `api` (`tsx watch` on 8787), `db` (Postgres on 127.0.0.1:5432), plus on-demand `tools` and `e2e` containers |
| [`Dockerfile`](../../Dockerfile) | Three targets: `dev` (the toolchain), `build`, and `runtime` (Node on Alpine with `dist/`, one bundled server file and the migrations) |

Caddy issues certificates from its own local CA for `localhost` and LAN addresses, or from Let's Encrypt for a real domain. Settings live in `.env` (copy `.env.example`). Deeper: [Docker guide](../guides/docker.md).

## How it's tested

| Layer of testing | Command | What it proves |
|---|---|---|
| The check | `npm run check` | Typecheck, lint, formatting, layer rules, then every game test below (no database). The pre-commit hook runs it |
| Unit tests | part of `npm test` | One module's rules, next to the code (`src/**/*.test.ts`) |
| Content and wiring | part of `npm test` | The content validator, the completeness tests, the crawler (every option of every place down every choice), combat coverage (every skill, status, item and opponent) |
| Headless playthroughs | part of `npm test` | The real `Session` with a `ScriptedPresenter`, from a new game through every district and boss to the ending and New Game+ |
| Baselines | part of `npm test` | Behavior hasn't moved: the sim's output, the engine's rules and every scene transcript case still match `tests/fixtures/` |
| Generated docs | part of `npm test` | The code map, the content tables and the sprite gallery match the code |
| Server | `npm run test:server` | The API and the browser's sync engine against a real Postgres |
| End to end | `npm run e2e` | Playwright on a 360×740 touch phone: real taps, axe on every screen, no horizontal overflow, the PWA offline. The pre-push hook runs it |
| The stack | `E2E_STACK_URL=https://localhost:8443 npx playwright test` | Cloud saves through Caddy, with two browsers as two phones |

CI runs all of it on every push. Deeper: [testing guide](../guides/testing.md).

## Where next

- [Code map](code-map.md): every runtime object, how they're wired, and traces from a tap down to the database. Its [generated reference](../reference/code-map/README.md) lists every function with its callers.
- [Onboarding](../guides/onboarding.md): setup and your first week.
- [Extension points](../team/extension-points.md): the seams for adding to the game, and what changes together.
- [ADRs](../adr/): why things are the way they are.
