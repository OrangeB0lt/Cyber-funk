# ADR-0003: A deterministic engine, and proving the port with parity oracles

- **Status:** Accepted (2026-10-30). Amended 2026-11-09: the oracles were retired at cutover and baselines took over ([Amendment](#amendment-cutover-2026-11-09)).

## Context

Two goals pull against each other:

1. **Preserve the game.** v1's numbers, AI patterns and prose are tuned and loved. A rewrite that "feels about the same" is not good enough. We need proof.
2. **Restructure everything.** Every function moves, gets types and gets renamed.

v1 used raw `Math.random`, so no two runs are alike and "same behavior" can only be compared statistically: the old balance-check skill averaged three sim runs and ignored small swings.

## Decision

### Determinism

- All game randomness comes from a seeded `Rng` (`core/rng.ts`, mulberry32). ESLint bans `Math.random` outside `ui/` and `app/audio`, which may use it for cosmetics only (particle jitter, noise buffers).
- Functions that consume randomness take the stream explicitly. A battle holds its own (`b.rng`). Scenes receive one through `SceneContext`.
- The `Rng` helpers (`float`, `int`, `pick`, `chance`) reproduce v1's `rnd`, `irnd`, `pick` and `chance` formulas exactly. `chance(p)` always consumes a draw, even for `p = 0` or `p = 1`.
- The Rng state is saved with the game, so a reload continues the same stream.

### Parity oracles (until cutover)

The v1 game lived in `legacy/` until the port was complete. The parity tests ran it live, side by side with the TypeScript code; no golden files were stored. (This section records what they did; they were deleted at cutover, see the amendment.)

| Oracle                                | What it compares                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Engine** (`tools/parity/driver.ts`) | Loads `legacy/src/01–05` in a Node `vm` with `Math.random` replaced by the same seeded stream. A shared driver plays thousands of seeded fights (random setups and a random player that also sends illegal moves) against both engines. Compared: every event (stamped with the draw index at which it fired), checkpoints at every player turn, and end-of-fight state, rewards, level-ups and total draws. Actor ids are mapped to roles (`P`, `E0`, `A:sugar`). |
| **Coverage gate**                     | `npm run parity:coverage` fails below 95% branch coverage of legacy `05_engine.js` plus the content functions, so "matches on the corpus" means "matches on almost every branch".                                                                                                                                                                                                                                                                                  |
| **Sim**                               | `legacy/sim/sim.js` and `tools/sim.ts` must print byte-identical output for the same seed.                                                                                                                                                                                                                                                                                                                                                                         |
| **Rules** (`legacyDom.ts`)            | Rules that lived in v1's UI (`buildEnemies`, `useFieldItem`, pricing…) are called directly in a jsdom-loaded legacy build.                                                                                                                                                                                                                                                                                                                                         |
| **Transcripts**                       | Scenes run in legacy jsdom and in the new runtime with a constant RNG and auto-won battles. Every line, choice, toast and sheet must match, except for an explicit allowlist of intended deviations.                                                                                                                                                                                                                                                               |
| **Content**                           | The new typed tables must deep-equal the legacy tables, after a documented key-rename map.                                                                                                                                                                                                                                                                                                                                                                         |

### Porting rules

The first pass is a **transliteration**: same statement order, same expression order, same field names on battle and actor objects. Code that looks wrong but is load-bearing for parity gets a `// PARITY:` comment that explains it, for example:

- `chance(0)` still draws
- a `'rand'`-target hit picks its target twice (`05:368-369`)
- the turn-order sort uses a random comparator, so the exact `Array.prototype.sort` call must stay
- no `?? 0` "fixes" that would change NaN or undefined behavior

Readability refactors happen only after the oracle is green, one at a time, with the oracle still running. (After cutover: with the baselines still passing.)

## Consequences

- A seed reproduces a fight, which is useful for bug reports, balance work and tests.
- Balance changes show up as exact sim diffs that a reviewer reads, not as noise.
- Known v1 bugs are ported faithfully and fixed afterwards in separate commits (`docs/known-issues.md`), so every behavior change is deliberate and reviewable.
- **Known limit:** the turn-order sort's random comparator means results can differ between JavaScript engines (V8 versus Safari's JavaScriptCore). This is logged as a known issue; the fix is per-actor jitter, followed by a re-baseline.

## Amendment: cutover (2026-11-09)

The port matched v1 on every oracle, the owner played it to the ending, and v1 was deleted with the oracles (`legacy/`, `tools/parity/`, `tools/migrate/`, the c8 coverage gate). v1's source stays in git history: `git show 555a9fd:legacy/src/05_engine.js`.

**What replaced the oracles.** Before deleting them, their results were frozen as baselines, each written while its oracle passed, so each holds v1's behavior:

| Oracle | Replaced by |
|---|---|
| Sim | `tests/fixtures/sim/seed-{1,2,1984}.txt`, checked by `tools/sim.test.ts` |
| Rules | `tests/fixtures/rules.json` (940 seeded cases), checked by `tools/engine/rules.test.ts` |
| Transcripts | `tests/fixtures/transcripts.jsonl` (every case at random values 0, 0.5 and 0.99), checked by `tests/integration/transcripts.test.ts` |
| Screens | `docs/reference/v1-shots/`, for side-by-side review with `tools/shots.ts` |

**Retired on purpose, with no baseline:**
- **The engine oracle and its coverage gate.** A frozen trace of 3,000 fights would be a large, unreadable fixture. Exact combat numbers stay pinned by the sim baseline (every class against every district and boss) and the rules baseline; determinism by `tools/engine/properties.test.ts`; every skill, status, item and opponent by combat coverage; story flows by the crawler and the playthrough.
- **The content oracle.** The typed tables are now the source of truth. Their key order still matters to the seeded generators, which the rules baseline would catch.

**The rule from here on.** A refactor changes no baseline. A change that's meant to alter behavior (a P6 fix, a balance change, new content in a pool) rewrites the affected baseline in the same commit (`npm run sim:baseline`, `rules:baseline`, `transcripts:baseline`), and the fixture diff is the review. Determinism stays a hard rule: without it the baselines would be noise. The `// PARITY:` comments stay as documentation of v1 quirks until P6 fixes or keeps each one.
