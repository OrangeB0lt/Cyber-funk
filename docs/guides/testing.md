# Testing

*What each kind of test proves, where it lives, and how to run it. In short: the git hooks run `npm run check` before every commit and `npm run e2e` before every push, and CI runs everything on every push ([Automation](#automation)).*

## The layers

| Kind | Where | Runs in | Proves |
|---|---|---|---|
| **Unit** | `src/**/*.test.ts`, next to the code | Vitest (Node) | One module's rules: an effect kind, a status, stats, XP, timing grades, the save format, the Director |
| **Content validation** | `tools/validate-content.test.ts` | Vitest | Cross-references types can't check: every enemy spawns somewhere, every skill has an owner (a class, an enemy, a bandmate), sprite rules, no content-only id literals in the engine |
| **Completeness** | `tools/completeness.test.ts` | Vitest | The game is wired up for every ported district: every place has scenes, every boss its pre/post scenes, every story hint points at a place with scenes, every `[[lexicon]]` link resolves |
| **The crawler** | `tests/integration/explore.test.ts` | Vitest, `ScriptedPresenter`, fights stubbed | Every place offers something in every state; every option runs down every branch of its choices without errors or broken text; every quest can be finished, every story step reached, every choice taken, every item obtained, every shop has a keeper |
| **Combat coverage** | `src/engine/combat/coverage.test.ts` | Vitest | Every skill, boss move, assist, status, item, gear piece, sheet of music, enemy and boss runs through the engine with finite numbers, clean log text and fights that end |
| **Parity oracles** | `tools/parity/*.test.ts` | Vitest | v2 behaves exactly like v1 (see below). Deleted at cutover. |
| **Server** | `server/**/*.test.ts` | Vitest project `server`, real PostgreSQL | The API's rules (revisions, conflicts, tombstones, history, auth, rate limits, static files), and the browser's sync engine against the real server |
| **Headless playthroughs** | `tests/integration/slice.test.ts`, `playthrough.test.ts` | Vitest, with `ScriptedPresenter` | Story flows end to end, no browser, real battles: new game → every ported district → its boss, down every branch of the big boss choices (`playthrough`); the slice's specific checks (`slice`) |
| **End to end** | `tests/e2e/*.spec.ts` | Playwright, 360×740 touch Chromium | The real UI: tapping through screens, every sheet, the shop, battles with the timing bar, save slots, every place and option of every ported district (`world.spec.ts`), no horizontal overflow, a clean console |
| **Stack end to end** | `tests/e2e/stack/*.spec.ts` | Playwright against `docker compose up` | Cloud saves for real: two browser contexts as two phones, a player code, offline play, a conflict, restoring a checkpoint |

## Commands

```bash
npm test                              # the game's Vitest suites, no database (seconds)
npm run test:server                   # server tests; needs Postgres: docker compose -f compose.dev.yaml up -d db
npx vitest run src/engine             # one folder
npx vitest src/app/save/format.test.ts  # watch one file
npm run check                         # typecheck + lint + layer rules + tests: run before committing
npm run e2e                           # Playwright: builds in test mode, serves on :4173, runs tests/e2e
npx playwright test -g "Captain Hush" # one e2e test
npx playwright show-report            # the HTML report after a failure (traces are kept on failure)
npm run parity:coverage               # engine oracle under c8: fails below 95% branch coverage of v1's engine
npm run docker:check                  # check + server tests inside the dev container (no Node on the host)
npm run docker:e2e                    # the local e2e suite inside the Playwright container

docker compose up --build -d --wait                       # the production stack, then:
E2E_STACK_URL=http://localhost:8080 npx playwright test   # the stack suite
```

## Porting a district

[src/content/pending.ts](../../src/content/pending.ts) lists the districts whose scenes aren't ported yet. Their places show "Closed tonight…" (`data-testid="not-built"`), and the tests leave them alone. To port one:

1. Write its scenes and register them in `PLACE_SCENES` and `BOSS_SCENES` ([content/index.ts](../../src/content/index.ts)).
2. Delete the district from `PENDING_DISTRICTS`.
3. Run `npm test` and fix what it reports:
   - `completeness`: unwired places, bosses and hints
   - the crawler: a place with nothing to do, an option that throws, broken text, a quest nobody can finish, an item nobody can get
   - `PENDING_SOURCES` entries in `explore.test.ts` that now fail to typecheck: delete them
4. Run `npm run e2e`: `world.spec.ts` now walks the district in the phone.

The playthrough plays through the new district on its own, and forks at its boss choice if it has one (add the keys to `CHOICE_BOSSES`).

## The crawler

`tests/integration/explore.test.ts` (helpers in `tests/integration/support/crawl.ts`) builds saves for each ported district:
- **Positions:** every step of the district's act, after its boss, and late game
- **Profiles:** `fresh` (broke), `started` (quests just taken), `busy` (quests ready to hand in, one of everything, flush), `done` (every flag, the whole band, the other boss choices)

For every option at every place it runs the scene in a fresh `Session`:
- down every path through its choices, up to 16 paths
- at the low and high ends of the random range
- once with fights fled

Fights are stubbed. A failure names the state, the option, and the choices and random values that reach it, so it reproduces:

```
treme treme.congo_square/busy pawn:legend choices=[1] rng=[0.99]: threw TypeError: …
```

A scene error must be **collected**, not thrown. Pass `onError: e => errors.push(e)`. A throwing `onError` leaves the Director's flight set, and every later `run` on that Session returns `busy`. Battles stubbed to return `'lose'` count as wins (`s.fight` only knows `'fled'`). Throw `new SceneInterrupt('cut')` to test a street defeat.

## Headless playthroughs

`tests/integration/slice.test.ts` builds a real `Session` with a `ScriptedPresenter` and a seed, then plays:

```ts
const p = new ScriptedPresenter({ choose: opts => opts.find(o => o.key === 'spare')?.key ?? opts[0]!.key });
const session = new Session({ presenter: p, storage: memorySaveStorage(), seed: () => 42 });
session.newGame('Tester', 'creole', 'trumpet');
await session.startPrologue();
expect(session.game.story).toEqual({ act: 'treme', step: 'win_street_fights' });
```

The policy answers every prompt (`choose`, `intent`, `timing`, `confirm`, `sheet`, `defeat`), and `p.transcript` records what the player would have seen. Battles run for real in the engine; set `intent` and `timing` policies to steer them. Use these tests for any story logic: they're fast, deterministic and don't depend on UI wording.

## End to end

The e2e build is a production build in `test` mode (`vite build --mode test`), which also exposes `window.CF` (the `GameApp`). `tests/e2e/helpers.ts` provides:

- `quickStart(page)`: a new character in Tremé, with instant text and turbo playback.
- `cf(page, (app, arg) => …, arg)`: run code against the app in the page, to set up a state fast (`app.dev.boss('captain_hush')`, `app.dev.gold()`) or to read the save.
- `playUntil(page, done)`: tap through whatever the game asks (Continue, choices, popups, the timing bar, RIFF at a target, outcome buttons) until `done()` holds.
- `expectNoOverflow(page, label)`: fail if anything sticks out past 360px.
- `watchErrors(page)`: collect console errors; assert it's empty at the end.

Find elements by `data-testid` (`page.getByTestId('act:riff')`). The conventions are in [ui.md](../architecture/ui.md#test-ids). Never select by visible text: copy changes.

The local suite builds with `VITE_CLOUD=off` (`.env.test`), so it never needs a server. The stack suite runs only when `E2E_STACK_URL` is set; it drives the production image, which has no `window.CF`, so it seeds saves into `localStorage` and plays through the UI.

## Server tests

`server/testing/db.ts` connects to `DATABASE_URL_TEST`, or by default the dev stack's `cyberfunk_test` database on `localhost:5432`, runs the migrations, and truncates every table before each test. Tests drive the real Fastify app in-process with `app.inject`, so no port is opened. `server/sync.test.ts` plugs `app.inject` into the browser's `CloudApi` as its `fetch`, which runs the client's sync engine against the real server and database.

## Parity oracles (until cutover)

v1 in `legacy/` is the reference. Each oracle runs v1 and v2 on the same inputs and compares:

- **Engine:** 3,000+ seeded fights (the sim grid, random legal play, scripted edge cases). It compares every event, stamped with the RNG draw index, plus checkpoints and final state. Exact match required.
- **Sim:** `tools/sim.ts` output is byte-identical to v1's sim for fixed seeds.
- **Rules:** pricing, selling, field items, enemy building and victory bookkeeping against v1's UI-layer functions (jsdom).
- **Content:** the typed tables deep-equal v1's tables after the documented renames.
- **Transcripts:** scenes run in v1 (jsdom, constant RNG, stubbed fights) and v2 (`ScriptedPresenter`), and the lines, choices, toasts and resulting saves are compared.

If an oracle fails, either the port is wrong (fix it), or the difference is an intended fix. An intended fix goes after parity, in its own commit, with an entry in [known-issues.md](../known-issues.md) and an allowlist entry.

## Automation

| When | What | Where | Skip it once |
|---|---|---|---|
| `git commit` | `npm run check`; only `format:check` when no code is staged | [.githooks/pre-commit](../../.githooks/pre-commit) | `git commit --no-verify` |
| `git push` | `npm run e2e`, when the push changes the game | [.githooks/pre-push](../../.githooks/pre-push) | `SKIP_E2E=1 git push` or `--no-verify` |
| Every push, every branch | typecheck, lint, format, layer rules, `npm test`, parity coverage, builds, server tests, e2e, Docker stack | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | |
| Claude Code finishes a turn that changed code | `npm run check`; a failure sends Claude back to fix it | [.claude/hooks/check.js](../../.claude/hooks/check.js) | delete `.claude/hooks/.check-state.json` to force a run |

`npm install` installs the git hooks (the `prepare` script sets `core.hooksPath`). The hooks check the working tree, not just what's staged.

## Writing a good test

- **Seed everything.** Pass a seed to `Session`, or `createRng(n)` to engine functions. A failing test must reproduce.
- **Assert on ids and state, not prose:** story steps, flags, item counts, choice keys.
- **One behavior per test**, named as a sentence: `'a street defeat leaves 80% of doubloons and wakes you at the club'`.
- **New screen or sheet?** Add it to an e2e test with `expectNoOverflow`.
- **New content?** The crawler, the completeness tests and combat coverage read every id list and registry, so new places, options, items, skills and opponents are covered when they're added. A rule they can't express goes in `tools/validate-content.ts` or `tools/completeness.ts`.
