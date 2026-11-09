# Testing

*What each kind of test proves, where it lives, and how to run it. In short: the git hooks run `npm run check` before every commit and `npm run e2e` before every push, and CI runs everything on every push ([Automation](#automation)).*

## The layers

| Kind | Where | Runs in | Proves |
|---|---|---|---|
| **Unit** | `src/**/*.test.ts`, next to the code | Vitest (Node) | One module's rules: an effect kind, a status, stats, XP, timing grades, the save format, the Director |
| **Content validation** | `tools/validate-content.test.ts` | Vitest | Cross-references types can't check: every enemy spawns somewhere, every skill has an owner (a class, an enemy, a bandmate), sprite rules, no content-only id literals in the engine |
| **Completeness** | `tools/completeness.test.ts` | Vitest | The game is wired up: every place has scenes, every boss its pre/post scenes, every story hint points at a place with scenes, every `[[lexicon]]` link resolves |
| **The crawler** | `tests/integration/explore.test.ts` | Vitest, `ScriptedPresenter`, fights stubbed | Every place offers something in every state; every option runs down every branch of its choices without errors or broken text; every quest can be finished, every story step reached, every choice taken, every item obtained, every shop has a keeper |
| **Combat coverage** | `src/engine/combat/coverage.test.ts` | Vitest | Every skill, boss move, assist, status, item, gear piece, sheet of music, enemy and boss runs through the engine with finite numbers, clean log text and fights that end |
| **Baselines** | `tools/sim.test.ts`, `tools/engine/rules.test.ts`, `tests/integration/transcripts.test.ts` | Vitest | Behavior hasn't moved: the balance sim, the engine's rules and every scene transcript still give the results in `tests/fixtures/` ([Baselines](#baselines)) |
| **Engine properties** | `tools/engine/properties.test.ts` | Vitest | Over 400 seeded fights: the same seed replays identically, and folding Heart events reproduces every actor's real Heart |
| **Generated docs** | `tools/codemap.test.ts`, `tools/sprites.test.ts`, `tools/reference.test.ts` | Vitest | The code map, the sprite gallery and the content tables match the code |
| **Server** | `server/**/*.test.ts` | Vitest project `server`, real PostgreSQL | The API's rules (revisions, conflicts, tombstones, history, auth, rate limits, static files), and the browser's sync engine against the real server |
| **Headless playthroughs** | `tests/integration/slice.test.ts`, `playthrough.test.ts` | Vitest, with `ScriptedPresenter` | Story flows end to end, no browser, real battles: new game → every district → every boss → the ending, down every branch of the big boss choices, then New Game+ (`playthrough`); the slice's specific checks (`slice`) |
| **End to end** | `tests/e2e/*.spec.ts` | Playwright, 360×740 touch Chromium | The real UI: tapping through screens, every sheet, the shop, battles with the timing bar, save slots, every place and option of every district (`world.spec.ts`), no horizontal overflow, a clean console |
| **Full game** | `tests/e2e/finale.spec.ts` | Playwright, 360×740 | A new character through the UI to the credits and into New Game+, with dev shortcuts between districts and short fights: every screen fits, the finale's screens pass axe, the console stays clean |
| **Accessibility** | `tests/e2e/a11y.spec.ts` | Playwright with axe-core | WCAG 2.2 A and AA on every screen and layer, with no allowlist; keyboard focus into and out of sheets and dialogs, Escape closing only the top layer; story lines announced once; reduced motion stopping transitions |
| **PWA** | `tests/e2e/pwa.spec.ts` (the `pwa` project, service workers allowed) | Playwright | Offline play once the worker is installed; Chromium's installability check (CDP) passes; `/api` is never cached or served from the cache; a waiting update shows only at a hub |
| **Stack end to end** | `tests/e2e/stack/*.spec.ts` | Playwright against `docker compose up` | Cloud saves for real: two browser contexts as two phones, a player code, offline play, a conflict, restoring a checkpoint; and the PWA with the cloud on (loads offline from the worker, the offline save syncs when the signal is back) |

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
npm run sim:baseline                  # rewrite a baseline (also rules:baseline, transcripts:baseline): on purpose only
npm run docs:codemap                  # regenerate generated docs (also docs:tables, sprites:export)
npm run docker:check                  # check + server tests inside the dev container (no Node on the host)
npm run docker:e2e                    # the local e2e suite inside the Playwright container

docker compose up --build -d --wait                       # the production stack, then:
E2E_STACK_URL=https://localhost:8443 npx playwright test  # the stack suite (HTTPS through Caddy)
```

## Adding a place or boss

`PLACE_SCENES` and `BOSS_SCENES` ([content/index.ts](../../src/content/index.ts)) are total records, so a place or boss without scenes doesn't compile. To add one:

1. Write its scenes (`definePlace` for a place; `pre`/`post` in `content/bosses/<boss>.scene.ts` for a boss) and register them.
2. Run `npm test` and fix what it reports:
   - `completeness`: hint places, lexicon links
   - the crawler: a place with nothing to do in some state, an option that throws, broken text, a quest nobody can finish, an item nobody can get, an option written but never offered
3. Run `npm run e2e`: `world.spec.ts` walks the new place in the phone.

The playthrough plays it on its own if the story goes through it, and forks at a boss's choice if it has one (add the keys to `CHOICE_BOSSES`).

## The crawler

`tests/integration/explore.test.ts` (helpers in `tests/integration/support/crawl.ts`) builds saves for each district:
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

`tests/integration/playthrough.test.ts` plays the whole game that way, in well under a second. It goes from a new game through every district, the second line and the Tower to the ending, forking at each big boss choice, so it plays all 8 combinations. Each leaf must:
- have beaten every boss and hold every Blue Note
- show the epilogue that matches its choices
- start New Game+ from the club

The New Game+ save is checked field by field (what carries over, what's halved, what resets), and then the prologue plays again. The scripted player follows the "!" hints, grinds before bosses, always goes up from the Studio Floor's vending machine, keeps playing at the credits, and gives a step a few tries (a Tower defeat wakes you at the club).

## End to end

The e2e build is a production build in `test` mode (`vite build --mode test`), which also exposes `window.CF` (the `GameApp`). `tests/e2e/helpers.ts` provides:

- `quickStart(page)`: a new character in Tremé, with instant text and turbo playback.
- `cf(page, (app, arg) => …, arg)`: run code against the app in the page, to set up a state fast (`app.dev.boss('captain_hush')`, `app.dev.gold()`) or to read the save.
- `playUntil(page, done)`: tap through whatever the game asks (Continue, choices, popups, the timing bar, RIFF at a target, outcome buttons) until `done()` holds.
- `expectNoOverflow(page, label)`: fail if anything sticks out past 360px.
- `expectAccessible(page, label)` (`tests/e2e/a11y.ts`): run axe and fail on any violation. Call it on every new screen or sheet a spec reaches.
- `watchErrors(page)`: collect console errors; assert it's empty at the end.

Find elements by `data-testid` (`page.getByTestId('act:riff')`). The conventions are in [ui.md](../architecture/ui.md#test-ids). Never select by visible text: copy changes.

The local suite builds with `VITE_CLOUD=off` (`.env.test`), so it never needs a server. The stack suite runs only when `E2E_STACK_URL` is set; it drives the production image, which has no `window.CF`, so it seeds saves into `localStorage` and plays through the UI.

## Server tests

`server/testing/db.ts` connects to `DATABASE_URL_TEST`, or by default the dev stack's `cyberfunk_test` database on `localhost:5432`, runs the migrations, and truncates every table before each test. Tests drive the real Fastify app in-process with `app.inject`, so no port is opened. `server/sync.test.ts` plugs `app.inject` into the browser's `CloudApi` as its `fetch`, which runs the client's sync engine against the real server and database.

## Baselines

Fixed expectations, checked in. Each was written while the matching v1 parity oracle passed (until cutover, [ADR-0003](../adr/0003-determinism-and-parity.md#amendment-cutover-2026-11-09)), so each holds v1's behavior. A refactor changes none of them. A change that's *meant* to move one rewrites it in the same commit, and the diff is the review: name the re-baseline in the commit message.

| Baseline | Test | Rewrite with | Holds |
|---|---|---|---|
| `tests/fixtures/sim/seed-{1,2,1984}.txt` | `tools/sim.test.ts` | `npm run sim:baseline` | the balance sim's output for three seeds |
| `tests/fixtures/rules.json` | `tools/engine/rules.test.ts` | `npm run rules:baseline` | enemy groups, field items, shops and victory bookkeeping for 940 seeded cases (`tools/engine/rules.ts`), one per line |
| `tests/fixtures/transcripts.jsonl` | `tests/integration/transcripts.test.ts` | `npm run transcripts:baseline` | what every transcript case shows and saves (`tests/integration/support/transcriptCases.ts`), at random values 0, 0.5 and 0.99, one run per line |
| `docs/reference/v1-shots/` | none (for review) | frozen at cutover | v1's screens, paired with v2's by `tools/shots.ts` |

**Transcript cases** set up a save, run one scene or place option, and record every title, line, choice, toast, sheet, confirm, fight and card block, plus the save afterwards. A case can script each fight's outcome (`fights: ['retry', 'win']`, or `'cut'` for a street loss), a sequence of picks for menus that come back (`picks`), and the confirm answer. Add a case when you add or change a scene whose exact text or state matters, then run `npm run transcripts:baseline` and check the new lines in the diff.

**When a baseline fails:** read the first difference in the failure. If the change wasn't meant to move behavior, it's a bug. If it was, re-baseline and check that the fixture diff moves only what you meant (a balance change that also shifts an unrelated district's numbers usually means an extra RNG draw).

The seeded generators behind the rules baseline pick from the content tables by index, so reordering a table (`ENEMIES`, `SKILLS`, `GEAR`) moves `rules.json` too.

**Screens side by side:** `npx tsx tools/shots.ts` writes v2's screens to `shots/v2/` and pairs each with the v1 shot of the same name in `shots/side-by-side/` (gitignored), for a visual review.

## Automation

| When | What | Where | Skip it once |
|---|---|---|---|
| `git commit` | `npm run check`; only `format:check` when no code is staged | [.githooks/pre-commit](../../.githooks/pre-commit) | `git commit --no-verify` |
| `git push` | `npm run e2e`, when the push changes the game | [.githooks/pre-push](../../.githooks/pre-push) | `SKIP_E2E=1 git push` or `--no-verify` |
| Every push, every branch | typecheck, lint, format, layer rules, `npm test`, builds, server tests, e2e, Docker stack | [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | |
| Claude Code finishes a turn that changed code | `npm run check`; a failure sends Claude back to fix it | [.claude/hooks/check.js](../../.claude/hooks/check.js) | delete `.claude/hooks/.check-state.json` to force a run |

`npm install` installs the git hooks (the `prepare` script sets `core.hooksPath`). The hooks check the working tree, not just what's staged.

## Writing a good test

- **Seed everything.** Pass a seed to `Session`, or `createRng(n)` to engine functions. A failing test must reproduce.
- **Assert on ids and state, not prose:** story steps, flags, item counts, choice keys.
- **One behavior per test**, named as a sentence: `'a street defeat leaves 80% of doubloons and wakes you at the club'`.
- **New screen or sheet?** Add it to an e2e test with `expectNoOverflow`.
- **New content?** The crawler, the completeness tests and combat coverage read every id list and registry, so new places, options, items, skills and opponents are covered when they're added. A rule they can't express goes in `tools/validate-content.ts` or `tools/completeness.ts`.
- **A behavior change?** Write the test that fails first, then let the baselines show everything else that moved.
