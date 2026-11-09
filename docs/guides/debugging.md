# Debugging

*How to get the game into the state you need, reproduce what a player saw, and find out why: the dev menu, `window.CF`, save codes, seeds, the sim and the fight trace, headless sessions, the browser tools, the server, and a table of common failures with their fixes.*

## The dev menu

On the title screen, tap the version number five times. The Dev Menu sheet opens (`DevSheet` in [`src/ui/sheets/WorldSheets.tsx`](../../src/ui/sheets/WorldSheets.tsx)). It ships in every build, production included. Most buttons need a game in progress, so start or load one first.

| Button | Does |
|---|---|
| +500 XP, +Ð1000, Full heal | What they say (level-up popups included) |
| Unlock all districts, Give all Blue Notes | Opens every district for travel; all six notes |
| Recruit all bandmates, Stock the bag, Best gear | The whole band (two active), five each of the common consumables, gear for your level |
| Cutting Contest | Straight into the contest at Club Feu Follet (offering the quest first if needed) |
| Sprite gallery | Every sprite at 2× or 3×, for checking art on a phone (works without a game) |
| Jump to boss | Into that boss's whole sequence (its intro scene, then the fight), raising you to its level if you're below it. The Tower's two bosses start from their climb floor |
| Jump to act | The start of that act, as if every earlier boss were beaten |

The jumps are built from the content itself (`setupAct` and `bossStep` in [`src/app/devStates.ts`](../../src/app/devStates.ts)), so new acts and bosses appear without editing the menu.

## `window.CF`

In dev builds (`npm run dev`) and test-mode builds (`npm run build:test`, which is what the e2e suite and the Playwright MCP serve), [`src/main.tsx`](../../src/main.tsx) exposes the `GameApp` as `window.CF`. Production builds don't have it. Everything the UI can do is a method on it ([`src/app/game.ts`](../../src/app/game.ts)), so you can drive the game from the browser console.

| Expression | Gives you |
|---|---|
| `CF.session.game` | The live save. You can read anything and set simple fields directly to set up a state (`CF.session.game.doubloons = 5000`) |
| `CF.session.rng.save()` | The random stream's state, `{ s, draws }` |
| `CF.session.director.current` | The name of the running scene, or `null` |
| `CF.view` | The presentation state: `CF.view.screen`, `CF.view.battle`, `CF.view.sheet`… |
| `CF.turbo = true` | Battle playback at near-instant speed |
| `CF.dev.act('bayou')`, `CF.dev.boss('rougarou')`, `CF.dev.gold()`… | The dev menu's buttons. `CF.dev.bosses` and `CF.dev.acts` list the ids |
| `CF.exportSave()`, `await CF.importSave(code)` | Save codes ([below](#save-codes)) |
| `CF.slots.info(1)` | What slot 1 holds, including `problem` if it can't be read |
| `CF.cloud.mode`, `CF.cloud.conflicts` | Cloud sync state: `off`, `checking`, `online` or `offline`, and any open conflicts |

A new character in Tremé, skipping the prologue, with fast text and auto rhythm (then tap through to the district screen; `quickStart` in [`tests/e2e/helpers.ts`](../../tests/e2e/helpers.ts) does the same for e2e tests):

```js
CF.turbo = true;
CF.view.titleSettings.textSpeed = 'instant';
CF.view.titleSettings.rhythm = 'auto';
CF.createCharacter('Dawlin', 'creole', 'snare');   // roots: creole cajun yat
CF.closeSheet();
CF.dev.act('treme');
```

## Save codes

**Export.** Settings → Save data → Export Save shows a `CF2:` code (`GameApp.exportSave`). It's `CF2:` followed by the save envelope in base64 (`exportCode` in [`src/app/save/format.ts`](../../src/app/save/format.ts)), so it carries the whole game *and* the random stream's state. The bug report template asks for one.

**Import.** Settings → Import Save, paste, Load this save. Or `await CF.importSave('CF2:…')`, which returns `false` if the code isn't a save this version can load. From the title screen it asks which slot; in a game it replaces the current slot and resumes.

**Read one.** The envelope is plain JSON:

```bash
node -e "console.log(Buffer.from(process.argv[1].slice(4), 'base64').toString())" 'CF2:eyJmb3Jt…'
```

**Why a save won't load.** Loading runs `decodeSave`, which refuses with a reason (`LoadError`) instead of half-loading:

| Reason | Means |
|---|---|
| `corrupt` | Not JSON, or not a CYBER FUNK envelope |
| `too-new` | Written by a newer `SAVE_VERSION` than this build. Usually an old cached build of the PWA: update it |
| `invalid` | The game data fails the schema: a field is missing or has the wrong type, or no migration exists from its version |

The slot picker shows the problem, and `CF.slots.info(slot).problem` names it. The raw text is in `localStorage['cyberfunk_save_v2:<slot>']`.

## Seeds and determinism

Everything that affects the game draws from one seeded stream, `session.rng`. A new game seeds it from the platform's crypto source, and its state (`rng: { s, draws }`) is written into every save. A reload continues the same sequence, so **a save code plus the same inputs gives the same outcome**: the same street groups, the same rolls, the same fight.

What counts as an input:
- the player's choices and battle actions
- manual timing taps: they don't draw from the stream, but the grade depends on where you tapped (auto rhythm does draw from it)

Things to know:
- The stream's state is saved only at checkpoints. Anything after the last save is replayed from there.
- A second stream, `session.cosmetic`, is never saved. It only picks things like the default nickname and where the timing bar's sweet spot sits.
- **Engines differ.** The turn-order sort uses a random comparator, and V8 and Safari's JavaScriptCore sort differently, so a fight saved on an iPhone can play out differently in Node or Chromium. It's a known issue ([known-issues.md](../known-issues.md)).

In tests, pass a fixed seed to a `Session` (`seed: () => 42`) or `createRng(42)` to an engine function. To force every draw a particular way, [`src/app/testing/rng.ts`](../../src/app/testing/rng.ts) has `constantRng(c)` and `scriptedRng([...])`; the transcript baseline runs each case at 0, 0.5 and 0.99 this way.

## The sim and the trace

```bash
npm run sim                                  # every class vs every district and boss, seed 1
npm run sim -- --seed 7 --json               # another seed, as rows for diffing
npm run trace -- trumpet captain_hush 3      # one fight, turn by turn, as the sim's player plays it
npm run trace -- bassdrum isolde 13 --seed 42 --events   # with the raw battle events
node .claude/skills/balance-check/compare.js # the sim at HEAD vs your working tree, movers only
```

The trace is the quickest way to see why a fight goes wrong: a resisted tone, a status lock, a telegraphed move that isn't braced. Try two or three seeds before drawing a conclusion. Reading the numbers: [balancing](balancing.md).

## Driving a headless Session

The real `Session`, scenes and battles run in Vitest with a `ScriptedPresenter` (it answers every prompt by a policy and records a transcript) and `memorySaveStorage()` (a save in memory). This is the fastest way to reproduce a story bug. Trimmed from [`tests/integration/slice.test.ts`](../../tests/integration/slice.test.ts):

```ts
import { expect, it } from 'vitest';
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { ScriptedPresenter } from '@app/testing/scriptedPresenter';
import { defaultSettings } from '@engine/index';

it('plays the prologue to the Tremé district', async () => {
  const presenter = new ScriptedPresenter({
    choose: opts => opts.find(o => o.key === 'spare')?.key ?? opts[0]!.key,
  });
  const session = new Session({ presenter, storage: memorySaveStorage(), seed: () => 7 });
  session.newGame('Dawlin', 'yat', 'trumpet', { ...defaultSettings(), rhythm: 'auto', textSpeed: 'instant' });

  expect((await session.startPrologue()).status).toBe('done');
  expect(session.game.story).toEqual({ act: 'treme', step: 'win_street_fights' });
  console.log(presenter.lines());   // the story text the player would have read
});
```

To reproduce a player's game, start from their code instead of a new game:

```ts
import { importCode } from '@app/save/format';

const session = new Session({ presenter, storage: memorySaveStorage(importCode('CF2:…')) });
expect(session.load()).toBeNull();          // or a LoadError: 'corrupt', 'too-new', 'invalid'
const r = await session.resume();           // where a reload would pick up
if (r.status === 'failed') throw r.error;   // a scene threw
await session.hitTheStreets();              // then whatever the player did next
```

- **Policies.** `choose`, `intent` (battle actions), `timing`, `confirm`, `sheet` and `defeat`. Each has a sensible default: the first choice, a competent battle player, a dead-centre tap, yes, retry a boss up to three times.
- **The transcript.** `presenter.transcript` records titles, lines, choices, toasts, sheets, battles, victories and routes; `presenter.lines()` gives just the story text.
- **Commands.** The same ones the UI calls: `session.enterPlace(id)`, `session.chooseOption(place, key)`, `session.travel(district)`, `session.run(scene, name)`.
- **Errors.** By default a scene error is logged and the session recovers. `run` resolves with `{ status: 'failed', error }`, so check the result. To skip real fights, pass `battle: async () => 'win'` to the `Session`.

Put the test in a scratch file such as `tests/integration/repro.test.ts`, run it with `npx vitest run tests/integration/repro.test.ts`, and once it reproduces, keep it as the regression test for the fix. More patterns: [testing → Headless playthroughs](testing.md#headless-playthroughs).

## Seeing it in a phone

**The Playwright MCP** (for Claude Code sessions; [`.mcp.json`](../../.mcp.json)) runs headless Chrome as a 360×740 touch phone and serves the test-mode build from `dist-e2e/` at `http://cyberfunk.local/`, with `window.CF` and service workers blocked. Run `npm run build:test` first, and again after every change you want to see. The [`playtest` skill](../../.claude/skills/playtest/SKILL.md) covers driving it: screenshots, the overflow check, jumping with the dev API, and loading a player's `CF2:` code.

**Without it:**
- `npm run dev` and your browser's device toolbar at 360px wide.
- `npx playwright test -g "Captain Hush" --headed` (or `--ui`) to watch an e2e test. After a failure, `npx playwright show-report` opens the report with its trace.
- On a real phone on the same Wi-Fi: `npm run dev -- --host` and open the Network URL it prints. To install the PWA, use the Docker stack ([Docker → Play and install on your phone](docker.md#play-and-install-on-your-phone)).

## The server and the stack

- **Locally:** `DATABASE_URL=postgres://cyberfunk:cyberfunk@localhost:5432/cyberfunk PORT=8787 npm run dev:server` (Postgres from `docker compose -f compose.dev.yaml up -d db`). Pass `PORT=8787`: the server defaults to 8080, and the Vite dev server forwards `/api` to 8787. Logs go to the terminal; `LOG_LEVEL=debug` for more.
- **Is it up?** `curl http://localhost:8787/api/health`, or `curl -k https://localhost:8443/api/health` for the stack. It answers `{ ok, db, version }`, with a 503 if the database is unreachable.
- **The production stack:** `docker compose ps`, `docker compose logs -f app` (the server's JSON logs), `docker compose logs caddy`, and `docker compose exec db psql -U cyberfunk` for SQL (`select slot, revision, name, level, act, step from saves;`).
- **The dev stack:** the same with `-f compose.dev.yaml` (`docker compose -f compose.dev.yaml logs -f api`).
- **In the game:** Settings → Cloud saves shows the sync status and the player code.

How sync is meant to behave (revisions, conflicts, retries) is in [server and cloud saves](../architecture/server.md#sync-rules).

## Common failures and fixes

| Symptom | Cause and fix |
|---|---|
| `tools/sim.test.ts` fails: "balance moved" | Combat numbers changed. If you meant it, `npm run sim:baseline` and check the diff moved only what you touched. If not, look for an extra or missing RNG draw: one shifts every later number |
| `tools/engine/rules.test.ts` fails | Enemy groups, field items, shops or victory bookkeeping changed. A new item, gear piece, pool enemy or a reordered table moves it on purpose: `npm run rules:baseline` |
| `tests/integration/transcripts.test.ts` fails, or says "run npm run transcripts:baseline" | A scene's text, choices or resulting save changed, or a case was added or renamed. Re-baseline only if you meant the change |
| "docs/reference/code-map is stale" | `npm run docs:codemap` and commit the pages |
| "docs/reference/tables is stale" | `npm run docs:tables` |
| "docs/reference/sprites is stale" | `npm run sprites:export` |
| Validator: "no card for sprite …" | Add a heading ending in the sprite id in backticks to [character-design.md](../vision/character-design.md) |
| Typecheck: a `Table` is missing a property, right after you added an id | Expected. Write the row the compiler names ([adding content](adding-content.md)) |
| `npm run depcruise` names a rule | An import points the wrong way. Content that needs the engine gets it through `EffectOps`; UI rules move to the engine ([ADR-0002](../adr/0002-layering.md)) |
| ESLint: `Math.random` | Use `s.rng` in scenes, `c.rng` in content functions, or an `Rng` passed in |
| ESLint: `no-floating-promises` in a scene | A missing `await` before `s.narrate`, `s.choose`, `s.fight`… |
| The crawler fails with a line like `treme … choices=[1] rng=[0.99]` | It names the state, option, choices and random values that reach the bug, so rebuild that in a headless test |
| e2e: overflow at 360px | `expectNoOverflow` names the elements that stick out. Usual causes are fixed widths, long unbroken text, or a flex child that can't shrink |
| e2e: an axe violation | Fix it; there's no allowlist. `A11Y_REPORT=1 npm run e2e` collects every violation into `test-results/a11y-report.jsonl`. Rules: [UI → Accessibility](../architecture/ui.md#accessibility-phone-first-but-not-phone-only) |
| e2e passes or fails on code you've already changed | Locally, Playwright reuses whatever already serves port 4173 instead of rebuilding. Stop that server and run again |
| The Playwright MCP shows an old build, or "No build" | `npm run build:test`, then reload |
| The MCP says "Cannot use import statement" | Restart the MCP server (`.claude/playwright/init-page.ts` must stay CommonJS) |
| A production build or the stack keeps showing the old version | The service worker serves its cached build until you tap **Update** on the banner at a district or place screen. In desktop Chrome, DevTools → Application → Service workers can unregister it. `npm run dev` never registers one |
| The toast "Something skipped a beat. Back to the street." | A scene threw. The error is in the browser console; reproduce it headlessly |
| A tap starts nothing, or `run` returns `busy` | Another scene is still running (`CF.session.director.current`). In tests, an `onError` that throws leaves the flight stuck, so collect errors instead |
| `npm run test:server`: "Can't reach the test database" | `docker compose -f compose.dev.yaml up -d db`, or set `DATABASE_URL_TEST` |
| Cloud status stays offline under `npm run dev` | `npm run dev:server` isn't running, or isn't on port 8787 |
| Uploads rejected (422) in the stack | The server's copy of the save format is older than the game's. Rebuild: `docker compose up --build -d --wait` |
| The browser warns about the certificate at https://localhost:8443 | Caddy's local CA. Accept it, or trust its root ([Docker guide](docker.md#play-and-install-on-your-phone)) |
