# Workstreams

*How the work splits into lanes: what each lane owns, the checks and tools it runs, the docs it keeps current, and where lanes hand work to each other. A lane is a kind of work, not a person. One person can work in several, and a lane can have several people. The layer rules ([ADR-0002](../adr/0002-layering.md)) are what make the lanes possible: each layer has a narrow job, so most changes stay inside one lane.*

## The lanes at a glance

| Lane | Owns | Main check |
|---|---|---|
| [Story and writing](#story-and-writing) | Scenes, prose, NPCs, quests, places, the lexicon | The crawler and the transcript baseline |
| [Art](#art) | Sprites, the palette, the design cards, the app icons | The sprite validator and gallery |
| [Engine and balance](#engine-and-balance) | Rules, combat, the numbers in content, the sim | The sim and rules baselines |
| [UI and accessibility](#ui-and-accessibility) | React, the view store, `GameApp` commands, styling | e2e at 360px with axe |
| [Server and infrastructure](#server-and-infrastructure) | The save server, cloud sync, Docker, CI, the PWA build | Server tests and the stack e2e |
| [Testing and tooling](#testing-and-tooling) | Test harnesses, validators, generators, lint and layer rules, hooks | `npm run check` itself |

Every lane runs `npm run check` before committing (the pre-commit hook does it anyway) and keeps behavior baselines still unless the change is meant to move them.

## Story and writing

**Owns**
- Story scripts: `src/content/**/*.scene.ts` (places, boss `pre`/`post` scenes, arrivals, street events, the prologue and finale)
- Story data: `src/content/story/acts.ts`; `npcs.ts`, `quests.ts`, `places.ts`, `glossary.ts` and `text.ts` in `src/content/`; and the prose fields of district rows (intro, ambient lines)
- Story ids: flags, story steps, NPCs, quests, places and lexicon terms in `src/core/ids/`

**Runs**
- `npm run check`, which includes the completeness tests and the crawler (every option of every place, down every choice)
- `npm run transcripts:baseline` when an existing scene's text or outcome is meant to change, then a read of the fixture diff
- `npm run docs:tables` after changing places or quests
- The dev menu's act and boss jumps, to read a scene in the phone at 360px

**Keeps current:** [writing scenes](../guides/writing-scenes.md), [adding content](../guides/adding-content.md), the [world bible](../vision/world-bible.md) and [tone and voice](../vision/tone-and-voice.md).

## Art

**Owns**
- `src/content/sprites/`: the per-family art files in `art/`, the palette, the speaker mapping (`NPC_SPRITE`, `SHOPKEEPERS` in `refs.ts`), and the sprite compiler
- [character-design.md](../vision/character-design.md): one card per sprite, and the palette table
- `docs/reference/sprites/` (generated) and `public/icons/` (generated from Gus's sprite)

**Runs**
- `npm run sprites:export` after every art change (`npm test` fails when the gallery is stale)
- `npm run validate`: grid sizes, keys, colour limits, variants, a card per sprite, every palette colour in use
- `npx tsx tools/sprites.ts --sheet out.html` for a one-page contact sheet, and the dev menu's Sprite gallery on a real phone
- `npx tsx tools/icons.ts` after redrawing Gus

**Shares** `src/ui/components/Sprite.tsx` and its CSS (effects, glow, the hit flash) with the UI lane. **Keeps current:** character-design.md, [ADR-0007](../adr/0007-character-sprites.md).

## Engine and balance

**Owns**
- `src/engine/`: stats, progression, economy, encounters, aftermath, and the combat loop in `combat/`
- The numbers in content: class rows and skills (`content/classes/`), enemy, boss, assist and status rows (`content/combat/`, district `enemies.ts`, `content/bosses/<id>.ts` stats and AI), item effects, gear stats, `content/rules.ts`
- `tools/sim.ts`, `tools/trace.ts`, `tools/engine/`, and the baselines `tests/fixtures/sim/` and `tests/fixtures/rules.json`

**Runs**
- Unit tests next to the engine code, and combat coverage (`src/engine/combat/coverage.test.ts`)
- `npm run sim`, `npm run trace`, and `node .claude/skills/balance-check/compare.js` to diff balance against a git ref (the `balance-check` skill)
- `npm run sim:baseline` and `npm run rules:baseline` when a change is meant to move them

**Keeps current:** [combat](../systems/combat.md), [balancing](../guides/balancing.md), [core and engine](../architecture/core-and-engine.md), and [known-issues.md](../known-issues.md) as P6 fixes land.

## UI and accessibility

**Owns**
- `src/ui/`: screens, sheets, popups, the battle view, components, `styles/tokens.css` and `global.css`
- `src/app/view.ts` (the view store), `src/app/reactPresenter.ts`, the commands on `GameApp` (`src/app/game.ts`), `src/app/audio/`
- The e2e specs in `tests/e2e/` (except `stack/`), including `a11y.spec.ts`

**Runs**
- `npm run dev` with the device toolbar at 360px, or the Playwright MCP (`playtest` skill)
- `npm run e2e`: overflow and axe on every screen, keyboard focus, reduced motion. `A11Y_REPORT=1` collects violations instead of failing on the first
- The `fixing-accessibility` skill for ARIA, focus and contrast work
- `npx tsx tools/shots.ts` for 360px screenshots of the main screens (in `shots/`, gitignored), paired with the frozen reference shots in `docs/reference/v1-shots/`

**Keeps current:** [UI](../architecture/ui.md) (layout, test ids, accessibility rules), [ADR-0005](../adr/0005-ui-state-and-styling.md).

## Server and infrastructure

**Owns**
- `server/`: the Fastify app, routes, the repository, the Drizzle schema and migrations
- The client half of cloud saves: `src/app/save/protocol.ts`, `cloud.ts`, `sync.ts`, `slots.ts`, `storage.ts`, `persist.ts`
- `Dockerfile`, `compose.yaml`, `compose.dev.yaml`, `docker/` (including the Caddyfile), `.env.example`, `.github/workflows/ci.yml`
- The PWA build in `vite.config.ts` (manifest, service worker, what's cached)

**Runs**
- `npm run test:server` (real Postgres: `docker compose -f compose.dev.yaml up -d db`)
- `npm run db:generate` after editing `server/db/schema.ts`, then a review of the SQL
- `docker compose up --build -d --wait` and `E2E_STACK_URL=https://localhost:8443 npx playwright test`
- `npm run docker:check` and `npm run docker:e2e` to run the suites in containers

**Keeps current:** [server and cloud saves](../architecture/server.md), [Docker](../guides/docker.md), [ADR-0006](../adr/0006-server-and-cloud-saves.md).

## Testing and tooling

**Owns**
- The harnesses: `src/app/testing/` (`ScriptedPresenter`, test random streams), `tests/integration/` (the crawler, the playthrough, the transcript cases), `tests/e2e/helpers.ts` and `a11y.ts`
- The checkers and generators: `tools/validate-content.ts`, `tools/completeness.ts`, `tools/codemap.ts`, `tools/reference.ts`, `tools/depcruise.ts` with `.dependency-cruiser.cjs`
- The configs: `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`
- `.githooks/` and the Claude Code setup in `.claude/` (the Stop hook, the skills, the Playwright MCP config)

**Runs:** all of it, and `npm run docs:codemap` after code changes. This lane doesn't own the baselines' *content*: whoever's change moves a baseline re-baselines it. It owns keeping them meaningful, for example adding a transcript case when a scene's exact text starts to matter.

**Keeps current:** [testing](../guides/testing.md), [debugging](../guides/debugging.md), the hand-written [code map](../architecture/code-map.md).

## Shared ground

Some code belongs to every lane. Changes there need a second reviewer ([CONTRIBUTING.md](../../CONTRIBUTING.md)), because everyone builds on them.

| Shared | Why it's shared | How it changes |
|---|---|---|
| `src/core/ids/` | Every lane adds ids | Freely, one id at a time, with a doc comment where the list asks for one |
| `src/core/types/` | Content, the engine, the UI and the save all read these shapes | A second reviewer. Every field keeps its TSDoc |
| `src/narrative/`, `src/app/session.ts`, `sceneContext.ts`, `battleController.ts` | The scene runtime sits between story, engine and UI | `SceneContext` and `Presenter` changes go through an ADR ([extension points](extension-points.md#scenecontext-members)) |
| `src/app/save/format.ts` | The save is `GameState` (engine) validated on the phone and on the server | [Changing the save format](../architecture/state-and-saves.md#changing-the-save-format), and `npm run test:server` |

## Handoffs

Most features cross lanes. The compiler is the contract between them: once an id exists, the typecheck tells every lane what's missing on its side.

| Change | Lanes, in order | Where it hands off |
|---|---|---|
| **A new boss** | Story (id, `pre`/`post` scenes, its place and story steps) → Art (a 32×32 sprite and card) → Engine (stats, AI, moves; a new `EffectOps` method if the AI needs one) → Testing (`CHOICE_BOSSES` if `post` has a choice; a transcript case) | Declaring the id makes the boss row, its scenes and its sprite required at once. Whoever starts lands a minimal version of each (placeholder stats, a temporary `recolor` variant of an existing sprite with its card), and the other lanes replace them. The sim gains rows for the new boss, so Engine re-baselines the sim and reads the numbers |
| **A new district** | Story (the act, places, arrival, NPCs) → Engine (pool, elite, levels, bounty) → Art (a family file for its cast) | `ARRIVALS` and `PLACE_SCENES` are total records, so a district without them doesn't compile. New pool enemies move the sim and rules baselines |
| **A new combat mechanic** (effect kind, status, passive) | Engine (core type and resolver) → Story or Engine (the content that uses it) → Testing (combat coverage reaches it) | The engine change lands with a unit test. The sim's player (`chooseAction` in `tools/sim.ts`) may need to learn to use it |
| **A new scene capability** | An ADR-0004 amendment → runtime (`SceneContext`, `Presenter`) → UI (`ReactPresenter`, the view, a component) → Testing (`ScriptedPresenter`) → Story uses it | `implements Presenter` makes the compiler list both presenters until each has the method |
| **A new screen or sheet** | UI (view type, component, command, test ids, e2e) → Story (opens it from a scene, if `SheetRequest` grows) | Test ids come from content ids and keys, so wording changes never break tests |
| **A new save field** | Engine (`GameState`, `newGame`, maybe `newGamePlus`) → Server lane (schema, `SAVE_VERSION`, a migration, `npm run test:server`) | The compile-time check in `format.ts` fails until the schema knows the field |
| **A cloud API change** | Server lane: `protocol.ts` → `CloudClient` and `CloudApi` → `sync.ts` → the route and repository | Both sides parse the same Zod schemas, and the server tests drive the browser's sync engine against the real server |
| **A P6 fix** | Whichever lane owns the rule: a failing test first, then the fix, then a deliberate re-baseline | The fixture diff is the review: name it in the commit message and update [known-issues.md](../known-issues.md) |
| **A balance change** | Engine | The sim diff goes in the PR, and the sim baseline moves in the same commit |

When a handoff stalls, the usual reason is a red baseline nobody expected. Read the first difference before re-baselining: an unrelated district's numbers moving usually means an extra random draw somewhere ([testing → Baselines](../guides/testing.md#baselines)).
