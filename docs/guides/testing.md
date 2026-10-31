# Testing

*What each kind of test proves, where it lives, and how to run it. In short: run `npm run check` before every commit and `npm run e2e` before every PR.*

## The layers

| Kind | Where | Runs in | Proves |
|---|---|---|---|
| **Unit** | `src/**/*.test.ts`, next to the code | Vitest (Node) | One module's rules: an effect kind, a status, stats, XP, timing grades, the save format, the Director |
| **Content validation** | `tools/validate-content.test.ts` | Vitest | Cross-references types can't check: every enemy spawns somewhere, every item can be obtained, `[[lexicon]]` links resolve, no content-only id literals in the engine |
| **Parity oracles** | `tools/parity/*.test.ts` | Vitest | v2 behaves exactly like v1 (see below). Deleted at cutover. |
| **Server** | `server/**/*.test.ts` | Vitest project `server`, real PostgreSQL | The API's rules (revisions, conflicts, tombstones, history, auth, rate limits, static files), and the browser's sync engine against the real server |
| **Headless playthroughs** | `tests/integration/*.test.ts` | Vitest, with `ScriptedPresenter` | Story flows end to end, no browser: the prologue reaches Tremé, street wins advance the story, Captain Hush gives the note C, both Vox branches, a street defeat |
| **End to end** | `tests/e2e/*.spec.ts` | Playwright, 360×740 touch Chromium | The real UI: tapping through screens, every sheet, the shop, battles with the timing bar, save slots, no horizontal overflow, a clean console |
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

## Writing a good test

- **Seed everything.** Pass a seed to `Session`, or `createRng(n)` to engine functions. A failing test must reproduce.
- **Assert on ids and state, not prose:** story steps, flags, item counts, choice keys.
- **One behavior per test**, named as a sentence: `'a street defeat leaves 80% of doubloons and wakes you at the club'`.
- **New screen or sheet?** Add it to an e2e test with `expectNoOverflow`.
- **New content?** The validator should cover it. If it can't, extend `tools/validate-content.ts`.
