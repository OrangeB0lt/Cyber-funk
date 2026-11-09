# Onboarding

*Your first day and first week on CYBER FUNK: getting it running, the commands you'll use every day, a tour of the repo, the rules every change follows, and a suggested first week that ends with a small change shipped end to end. The reading order for all the docs is in [docs/README.md](../README.md).*

## Setup

You need Node 24 (the version is in [`.nvmrc`](../../.nvmrc)), git, and optionally Docker.

```bash
nvm use                           # Node 24
npm install                       # dependencies, and turns on the git hooks in .githooks/
npx playwright install chromium   # once, for the end-to-end tests
npm run check                     # should pass on a fresh clone
npm run dev                       # the game at http://localhost:5173
```

- **The git hooks** are installed by `npm install` itself: its `prepare` script points `core.hooksPath` at [`.githooks/`](../../.githooks/). From then on, every commit runs `npm run check` and every push runs `npm run e2e` ([details below](#the-hooks)).
- **Without the save server.** `npm run dev` forwards `/api` to port 8787. If nothing is running there, the game treats itself as offline and keeps every save on the device, and Vite logs proxy errors in the terminal. For UI work with no server at all, run `VITE_CLOUD=off npm run dev`: the game never calls the API.
- **With the save server.** Start Postgres in Docker, then the API:

  ```bash
  docker compose -f compose.dev.yaml up -d db
  DATABASE_URL=postgres://cyberfunk:cyberfunk@localhost:5432/cyberfunk PORT=8787 npm run dev:server
  ```

  `npm run dev` forwards `/api` to it. `npm run test:server` uses the same database container.
- **Docker only.** You can skip Node entirely: `docker compose -f compose.dev.yaml up --build` runs the game with hot reload on :5173, the API on :8787 and Postgres, and `docker compose -f compose.dev.yaml run --rm tools` runs the checks and the server tests. Without Node on the host the git hooks aren't installed, so run the checks yourself. See the [Docker guide](docker.md).

Open the game, start a new character, and play the prologue. Then go back to the title screen and tap the version number five times: that's the dev menu, which jumps to any act or boss. You'll use it constantly.

## The commands that matter

| Command | When |
|---|---|
| `npm run dev` | Working on anything you want to see. Hot reload, and `window.CF` in the console |
| `npm run check` | Before every commit (the hook runs it anyway): typecheck, lint, formatting, layer rules, and every game test |
| `npm test` | Just the Vitest suites. `npx vitest run src/engine` for one folder, `npx vitest src/app/save/format.test.ts` to watch one file |
| `npm run e2e` | After UI changes: Playwright on a 360×740 phone, with axe and an overflow check on every screen |
| `npm run test:server` | After touching `server/` or `src/app/save/` (needs the dev `db` container) |
| `npm run sim` / `npm run trace` | After touching combat numbers ([balancing](balancing.md)) |
| `npm run sim:baseline`, `rules:baseline`, `transcripts:baseline` | Only when a change is *meant* to move behavior ([baselines](testing.md#baselines)) |
| `npm run docs:codemap`, `docs:tables`, `sprites:export` | After code, content or art changes respectively. `npm test` fails when one is stale |
| `npm run validate` | The content validator on its own (the same checks `npm test` runs, without the rest of the suite) |
| `npm run build` | A production build in `dist/` |

## A tour of the repo

```
src/                  the game, in six layers (imports point down only)
  core/                 ids (one as-const list per kind), types, the seeded Rng
  narrative/            the scene API (SceneContext, Presenter) and the Director
  content/              data tables, sprites, and the story as *.scene.ts files
  engine/               rules: stats, combat, economy, progression
  app/                  GameApp, Session, presenters, saves, cloud sync (no React)
  ui/                   React: screens, sheets, popups, the battle view
  main.tsx              boots the game
server/               the cloud-save API: routes/, repo/ (SQL rules), db/ (schema, migrations)
tools/                the balance sim and fight trace, engine baselines, validators, doc generators
tests/
  integration/          headless playthroughs, the crawler, the transcript baseline
  e2e/                  Playwright at 360×740 (e2e/stack/ runs against the Docker stack)
  fixtures/             the behavior baselines
docs/                 architecture, guides, ADRs, generated reference
docker/               the dev entrypoint, the database init script, the Caddyfile
public/icons/         the app icons (drawn from a sprite by tools/icons.ts)
.githooks/            pre-commit and pre-push
.github/workflows/    CI
.claude/              Claude Code setup: hooks, skills, the Playwright MCP config
```

Unit tests sit next to the code they test (`*.test.ts`). The [architecture overview](../architecture/overview.md) explains how the layers fit together, and the [code map](../architecture/code-map.md) walks through real call paths.

## The rules every change follows

**Layers.** A module imports only from its own layer or below: `core ← narrative ← content ← engine ← app ← ui`. Content never imports the engine; it gets engine capabilities through `EffectOps` arguments. Only `*.scene.ts` files may import `narrative/`. `npm run depcruise` names the rule you broke. When you can't decide where code goes, ask what it depends on ([ADR-0002](../adr/0002-layering.md)).

**Determinism.** Game logic never calls `Math.random`. It uses the seeded `Rng` from `src/core/rng.ts`, passed in explicitly (`s.rng` in scenes, `b.rng` in battles). ESLint allows `Math.random` only for cosmetics in `ui/` and `app/audio/`.

**Ids, types and TSDoc.** Every id kind is an `as const` list in `src/core/ids/`, and every table is checked against it, so a missing row or a typo doesn't compile. Declare the id first and let the compiler list what's missing. Every field of a `core/types` interface, and everything in `narrative/`, has a doc comment (ESLint enforces it).

**Sprites.** Every opponent, class and speaker has a pixel-art sprite in `src/content/sprites/`, and a missing one doesn't compile. Draw to the spec in [character-design.md](../vision/character-design.md), add the character's card there, then run `npm run sprites:export`.

**The UI owns no rules.** Components render snapshots and call `GameApp` commands. A rule that decides an outcome (damage, a price, whether an action is legal) lives in the engine with a unit test.

**Phone first.** The target is a 360px-wide phone. Nothing may scroll sideways, tap targets are at least 48px, and every screen passes axe with no allowlist. The e2e suite fails on any of these.

**Baselines move only on purpose.** `tests/fixtures/` pins the sim's output, the engine's rules and every scene transcript. A refactor changes none of them. A change that's meant to alter behavior re-baselines in the same commit, names it in the commit message, and the fixture diff is the review. If a baseline moves and you didn't mean it to, that's a bug.

**One kind of change per commit.** Content, rules, UI, refactor or tooling, never mixed. A refactor never changes behavior, and a behavior change is never hidden inside a refactor. Regenerate the generated docs in the same commit as the change that staled them.

**Save formats are append-only.** A `GameState` change updates the save schema too, and when old saves need a value filled in, it bumps `SAVE_VERSION` and adds a migration ([state and saves](../architecture/state-and-saves.md#changing-the-save-format)). A database change goes through `npm run db:generate`. Never edit a migration of either kind once it has shipped.

You'll also see `// PARITY:` comments. The game was ported from an earlier single-file version at exact parity, and those comments mark quirks kept on purpose; the bugs among them are queued in [known-issues.md](../known-issues.md).

### The hooks

| When | What runs | Skip it once |
|---|---|---|
| `git commit` | `npm run check` (about 15 s); only `format:check` when no code is staged | `git commit --no-verify` |
| `git push` | `npm run e2e` (about a minute), when the push changes the game | `SKIP_E2E=1 git push` |

CI runs everything again on every push, plus the builds, the server tests and the Docker stack. The workflow, branch names and the definition of done are in [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Your first week

**Day 1: run it.** Do the setup above. Play the prologue and Tremé through to Captain Hush. Open the dev menu and jump to a later act. Read the [design pillars](../vision/pillars.md), the [engineering principles](../vision/engineering-principles.md) and the [architecture overview](../architecture/overview.md).

**Day 2: follow a tap.** Read the [code map](../architecture/code-map.md) sections 1 to 9: boot, a new game, one line of story, places, a street fight. Then open [`tests/integration/slice.test.ts`](../../tests/integration/slice.test.ts) and run it with `npx vitest run tests/integration/slice.test.ts`. It plays the same path headlessly, and it's the fastest way to see the whole stack work without a browser.

**Day 3: the content model.** Read the [content model](../architecture/content-model.md) and [writing scenes](writing-scenes.md). Open a district folder such as `src/content/districts/treme/` and match what you see to the place screens in the game. Run `npm run trace -- trumpet captain_hush 3` and read one fight turn by turn.

**Day 4: make a small change end to end.** On a practice branch, add a new consumable item and sell it in a shop, following [adding content](adding-content.md#items):
1. Add the id to `ITEM_IDS` in `src/core/ids/items.ts`, run `npm run typecheck`, and read the error: `ITEMS` is missing a row.
2. Write the row in `src/content/items.ts` (copy `beignet`; `effects` uses the same kinds as skills).
3. Add it to a shop's `stock` in a place scene, for example Mama Roux's Kitchen in `src/content/districts/treme/places.scene.ts`. Without that, the crawler fails because nobody can get the item.
4. Run `npm test`. Expect `tools/engine/rules.test.ts` to fail: the rules baseline draws its cases from the item list, so a new item moves it. That's a deliberate change, so run `npm run rules:baseline` and look at the diff. Expect the content tables to be stale too: run `npm run docs:tables`.
5. See it in the game: `npm run dev`, open the kitchen, buy it, use it from the bag. Run `npm run e2e`.

This touches the id lists, a table, a scene, the crawler, a baseline and the generated docs, which covers most of what a real content change does.

**Day 5: pick a real task.** Good first tasks: an entry from [known-issues.md](../known-issues.md) (write the failing test first), a new street event, a lexicon term, or a screen to check at 360px. Read the guide for that kind of work: [adding content](adding-content.md), [balancing](balancing.md), [testing](testing.md) or [debugging](debugging.md). [Workstreams](../team/workstreams.md) explains who usually owns what.
