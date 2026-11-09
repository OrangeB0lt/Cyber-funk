---
name: add-content
description: Checklist for adding or changing CYBER FUNK game content — an enemy, elite, boss, skill or boss move, status, consumable item, gear piece, sheet music, bandmate, district or place, quest, NPC, street event, glossary/lexicon term, flag, or a new persistent save field. Use whenever a change adds an id to src/core/ids, a row to a src/content table, a scene, or a field to GameState, so every cross-reference (id list, table, sprite and its design card, district pools, shops, story acts, scene registries, dev shortcuts, save migration) gets updated and the change is verified.
---

# Adding content to CYBER FUNK

Content is typed TypeScript in `src/content/`, keyed by ids listed in `src/core/ids/`. The compiler
does most of the cross-checking: **declare the id first**, run `npm run typecheck`, and it lists every
table that now needs a row. What types can't see (an enemy in no pool, an item nobody can get, a place
with nothing to do) the tests catch: the content validator, the completeness tests and the crawler.

Background: `docs/architecture/content-model.md` (tables, sprites, functions in content) and
`docs/guides/writing-scenes.md` (the scene API). The layer rules (`npm run depcruise`): content never
imports the engine; only `*.scene.ts` files import `narrative/`; only `ui/` and `tools/` import
`content/sprites/`.

## Effects (skills, boss moves, assists, items)

Everything that *does* something is a list of `Effect`s (`src/core/types/effects.ts`), resolved by
`src/engine/combat/resolve.ts`. Kinds: `dmg`, `status`, `heal`, `funk`, `cleanse`, `strip`, `guard`,
`groove`, and `custom` (an escape hatch: `run(c)` with `c.ops` for battle changes; use it sparingly).
Each field has TSDoc; hover it. Tones are `HOT LOW BLUE FUNK SWEET` (SWEET never deals damage).
Prefer composing existing kinds; a genuinely new kind goes in the `Effect` union and the resolver,
and the combat coverage test (`src/engine/combat/coverage.test.ts`) must reach it.

Randomness: content functions use the `rng` they're given, never `Math.random` (ESLint enforces it).

## By content type

**Enemy** (`ENEMY_IDS` in `core/ids/enemies.ts`)
- Row in `content/districts/<id>/enemies.ts` (or `content/enemies/` for summons and rivals); the
  merged `ENEMIES` table in `content/enemies/index.ts` keeps a fixed key order, so append.
- Its special move: an `en_*` id in `ENEMY_SKILL_IDS` (`core/ids/combat.ts`) and a row in
  `content/combat/enemySkills.ts`.
- `pool` (or `elite`) in `content/districts/<id>/district.ts`, or it never spawns and the sim never
  fights it (the validator flags it).
- A sprite (see **Art**).

**Boss** (`BOSS_IDS`), the most cross-referenced type:
- `content/bosses/<id>.ts`: stats, `note` (its Blue Note, `NOTE_IDS` and `content/notes.ts`), `next`
  (what it unlocks), `lines`, `book`, `ai()`, optional `onHalf()`; register it in
  `content/bosses/index.ts`. Its moves: `b_*` in `BOSS_SKILL_IDS` and `content/combat/bossSkills.ts`.
- `content/bosses/<id>.scene.ts`: the `pre` and `post` scenes, registered in `BOSS_SCENES`
  (`content/index.ts`; a total record, so a boss without scenes doesn't compile).
- A place whose row names the boss (`content/places.ts`), with a boss option in its place scene, and
  the district's `boss` field.
- Story steps for it: `ACT_STEPS` (`core/ids/story.ts`) and their journal rows in
  `content/story/acts.ts` (`hintPlace` gives the place its "!").
- `CF.dev.boss(id)` finds the fight's story step through that `hintPlace` (`bossStep()` in
  `src/app/devStates.ts`), so the boss's place must be some step's `hintPlace`.
- If it has a story choice in `post`, add its keys to `CHOICE_BOSSES` in
  `tests/integration/playthrough.test.ts` so the playthrough forks there.
- The sim (`tools/sim.ts`) fights every boss in `BOSSES`; one that needs special setup (like
  `the_click`'s phase) needs a branch there. A 32×32 sprite (see **Art**).

**Class skill / status**
- Class skills: each class file in `content/classes/` has its skills, unlocked at `SKILL_LEVELS`
  (`content/rules.ts`). Ids in `CLASS_SKILL_IDS`.
- Status: `STATUS_IDS` and a row in `content/combat/statuses.ts`. `mod` statuses work through the
  stat code; anything else (damage over time, skipped turns, triggers) needs engine handling. Grep an
  existing id such as `scorched` in `src/engine/` for the hook points.

**Item / gear / sheet music** (`core/ids/items.ts`)
- Item: a row in `content/items.ts` (`price`, `battle`, `field`, `effects`, optional `max`). Then make
  it obtainable: a shop's stock (`s.sheet({ kind: 'shop', title, stock, keeper })` in a place
  scene), loot (`content/rules.ts`), or `s.give()` in a scene. The crawler fails on an item nobody can
  get.
- Gear: `THREADS_IDS`/`CHARM_IDS`/`MOD_IDS` and rows in `content/gear/`. Instruments are generated
  from `INSTRUMENT_TIER_IDS` × classes; don't hand-write `inst_*` rows.
- Sheet music: `SHEET_MUSIC_IDS` and `content/sheetMusic.ts`; its effect is implemented in the
  engine (grep an existing id such as `sm_swing`).

**District / place / NPC / quest** (`core/ids/world.ts`)
- Place: `PLACE_IDS`, a row in `content/places.ts`, its id in the district's `places`, and its scenes
  (`definePlace` in `content/districts/<id>/places.scene.ts`) registered in `PLACE_SCENES`
  (`content/index.ts`; total, so a place without scenes doesn't compile).
- District: `DISTRICT_IDS`, `content/districts/<id>/district.ts` (levels, pool, elite, boss, places,
  bounty), `ACT_ORDER`/`ACT_STEPS`, an arrival in `content/world/arrivals.scene.ts`, the unlock via
  the previous boss's `next`. `CF.dev.act(id)` (`setupAct()` in `src/app/devStates.ts`) reads all
  of that, so it needs no edit.
- NPC: `NPC_IDS`, a row in `content/npcs.ts` (name, colour), and a sprite: `NPC_SPRITE`
  (`content/sprites/refs.ts`) maps every speaker to art, and the compiler requires it.
- Quest: `QUEST_IDS` and a row in `content/quests.ts`. The logic lives in scenes:
  `s.quest(id)`, `s.setQuest(id, 'active' | 'done')`, counters, `QUEST_DROPS` and
  `QUEST_KILL_COUNTERS` in `content/rules.ts`. The crawler fails on a quest nobody can finish.

**Street event** (`content/world/streetEvents.scene.ts`)
- `defineEvent({ id, name, districts: null | [...], weight, text, options: [{ key, label, when?, run }] })`.
  **Append at the end**: the weighted pick walks the list in order, so inserting moves every later
  roll (and the baselines).

**Glossary / lexicon** (`GLOSSARY_IDS`, `content/glossary.ts`)
- In any narrated text, `[[term]]` or `[[term|display text]]` links it. The completeness test fails
  on a link to no entry.

**Flag** (`FLAG_IDS`, `core/ids/flags.ts`)
- Flags are booleans with a doc comment saying what sets and reads them. Counts go in
  `g.counters` instead.

## Art

Every opponent, class and speaker has a pixel-art sprite, and a missing one doesn't compile.

1. Draw it in `content/sprites/art/<family>.ts` to the spec in `docs/vision/character-design.md`
   (24×24, 32×32 for bosses, the 80-colour palette, at most 16 colours, 20 for bosses), or as a
   variant (`recolor`/`overlay`) of an existing sprite.
2. Add its card to `docs/vision/character-design.md` (the validator requires one per sprite).
3. `npm run sprites:export` regenerates `docs/reference/sprites/` (a test fails when it's stale).

## New persistent state

Follow `docs/architecture/state-and-saves.md` ("Changing the save format"):

1. The field on `GameState` (`core/types/state.ts`) with TSDoc (ESLint requires it).
2. Initialise it in `newGame` (`src/engine/state.ts`).
3. Add it to `gameStateSchema` in `src/app/save/format.ts` (a compile-time check fails if you don't).
4. If existing saves need a value, bump `SAVE_VERSION` and add a step to `MIGRATIONS`. Never edit
   an old migration: saves in the wild and on the server depend on it.
5. Extend `src/app/save/format.test.ts`, and run `npm run test:server` (the server decodes the same
   format; it needs `docker compose -f compose.dev.yaml up -d db`).
6. If New Game+ should carry it, add it to `newGamePlus` in `src/engine/state.ts`.

## Verify

1. `npm run check` (the pre-commit and Stop hooks run it): types, lint, layers, and every Vitest
   suite, including the content validator, completeness, the crawler (every option of every place
   down every choice), combat coverage, the playthrough, and the baselines.
2. A **baseline** failing means behavior moved: `tools/sim.test.ts` (balance), `tools/engine/rules.test.ts`
   (enemy groups, field items, shops, victories), `tests/integration/transcripts.test.ts` (scenes).
   If that was the point, re-baseline in the same commit (`npm run sim:baseline`, `rules:baseline`,
   `transcripts:baseline`) and review the fixture diff; otherwise it's a bug. Adding content usually
   moves nothing unless it changes a pool, a table's order, or an existing scene.
3. If combat numbers could have moved, use the `balance-check` skill.
4. `npm run docs:codemap` after code changes (a test fails when the code map is stale).
5. See it in the phone with the `playtest` skill: `CF.dev.act(...)` or `CF.dev.boss(...)` to jump
   there, then check it at 360px with no console errors. `npm run e2e` runs the phone suite, with axe
   on every screen.
