# Adding content

*Step by step for every kind of content: enemies, bosses, skills, statuses, items, gear, sheet music, bandmates, places, districts, NPCs, quests, street events, lexicon terms, flags, story steps, sprites and new save fields. Background is in the [content model](../architecture/content-model.md); the scene API is in [writing scenes](writing-scenes.md).*

## The pattern

Content is typed TypeScript in [`src/content/`](../../src/content/), keyed by ids listed in [`src/core/ids/`](../../src/core/ids/). The compiler does most of the cross-checking for you, so always work in this order:

1. **Declare the id** in its `core/ids` list.
2. **Run `npm run typecheck`.** It lists every table that now needs a row. Fill them in until it's clean.
3. **Wire the references** the compiler can't see: a district pool, a shop's stock, a story step's hint.
4. **Run `npm run check`.** The content validator, the completeness tests and the crawler catch what types can't: an enemy that never spawns, an item nobody can get, a place with nothing to do.
5. **See it in the game** at 360px ([Check your work](#check-your-work)).

Three layer rules shape where things go (`npm run depcruise` enforces them):
- Content never imports the engine. Content functions receive what they need as arguments (`c.ops`, `c.rng`, the game state).
- Only `*.scene.ts` files may import `narrative/`.
- Only `ui/` and `tools/` may import `content/sprites/`.

Content functions use the `rng` they're given, never `Math.random` (ESLint enforces it).

## Effects: what skills, moves and items do

Everything that *does* something in combat is a list of `Effect`s ([`src/core/types/effects.ts`](../../src/core/types/effects.ts)), resolved in order by `resolveSkill` in [`src/engine/combat/resolve.ts`](../../src/engine/combat/resolve.ts). The same resolver runs player skills, enemy and boss moves, bandmate assists and items.

| Kind | Does |
|---|---|
| `dmg` | Damage with a tone and multiplier, optional status riders |
| `status` | Apply a status |
| `heal`, `funk` | Restore Heart or Funk |
| `cleanse`, `strip` | Remove bad statuses, or a target's buffs |
| `guard`, `groove` | Block, or change Groove |
| `custom` | An escape hatch: `run(c)` with `c.ops` for anything that changes the battle |

Every field has a doc comment; hover it in your editor. The tones are `HOT LOW BLUE FUNK SWEET` (SWEET never deals damage). Compose existing kinds whenever you can, and use `custom` sparingly. A genuinely new kind or engine capability is an engine change: see [extension points](../team/extension-points.md#effect-kinds-and-effectops).

## Enemies

1. Add the id to `ENEMY_IDS` in `src/core/ids/enemies.ts`.
2. Write the row in `src/content/districts/<district>/enemies.ts`, or in `src/content/enemies/` for summons and Cutting Contest rivals. The merged `ENEMIES` table in `content/enemies/index.ts` keeps a fixed key order because spar pools iterate it, so add new rows at the end of their file.
3. Its special move, if it has one (`special`): an existing skill, or a new `en_*` id in `ENEMY_SKILL_IDS` (`src/core/ids/combat.ts`) with a row in `src/content/combat/enemySkills.ts`.
4. Put it in a district's `pool` (or make it the `elite`) in `src/content/districts/<district>/district.ts`. Otherwise it never spawns, the sim never fights it, and the validator says so.
5. Draw its sprite ([Sprites](#sprites)).

## Bosses

The most cross-referenced kind of content.

1. Add the id to `BOSS_IDS` in `src/core/ids/enemies.ts`.
2. Write `src/content/bosses/<id>.ts`: stats, its Blue Note (`note`), what it unlocks (`next`), `lines`, the Blue Book entry (`book`), `ai()` and optionally `onHalf()`. Register it in `src/content/bosses/index.ts`.
3. Its moves: `b_*` ids in `BOSS_SKILL_IDS` and rows in `src/content/combat/bossSkills.ts`.
4. Write `src/content/bosses/<id>.scene.ts` with its `pre` and `post` scenes, and register them in `BOSS_SCENES` (`src/content/index.ts`). The record is total, so a boss without scenes doesn't compile.
5. Give it a place: a row in `src/content/places.ts` whose `boss` field names it, a boss option in that place's scene that calls `s.boss(id)`, and the district's `boss` field.
6. Add its story steps to `ACT_STEPS` (`src/core/ids/story.ts`) and their journal rows to `src/content/story/acts.ts`. Make the boss's place the `hintPlace` of the step it's fought at: the dev menu's boss jump (`bossStep()` in `src/app/devStates.ts`) finds the fight's step that way, and otherwise lands on the act's last step.
7. If `post` has a story choice, add its keys to `CHOICE_BOSSES` in `tests/integration/playthrough.test.ts`, so the headless playthrough plays every branch.
8. Draw a 32×32 sprite ([Sprites](#sprites)).
9. The sim (`tools/sim.ts`) fights every boss in `BOSSES` automatically, so the sim baseline grows a row per class. A boss that needs special setup, the way the Click needs its shield phase, needs a branch there.

If its AI needs something the engine can't yet do for content (summon, steal, charge a move), that's a new `EffectOps` method: see [extension points](../team/extension-points.md#effect-kinds-and-effectops).

## Class skills and statuses

- **Class skills.** Each class file in `src/content/classes/` holds the class row and its skills: a riff, six skills unlocked at `SKILL_LEVELS` (`src/content/rules.ts`), and a solo. Ids are in `CLASS_SKILL_IDS` (`src/core/ids/combat.ts`). Changing a skill's numbers is a balance change: use the [balancing guide](balancing.md).
- **Statuses.** Add the id to `STATUS_IDS` and a row to `src/content/combat/statuses.ts`. A status that only changes stats is data (`mod`) and needs nothing else. Anything else (damage over time, skipped turns, triggers) needs engine handling: grep an existing id such as `scorched` in `src/engine/` to find the hook points, and add the id to `MECHANIC_STATUSES` in `src/engine/combat/resolve.ts`.

## Items

1. Add the id to `ITEM_IDS` in `src/core/ids/items.ts`.
2. Write the row in `src/content/items.ts`: `name`, `price`, `desc`, whether it works in `battle` and in the `field`, its `effects`, and optionally `max`.
3. Make it obtainable: a shop's `stock` (`s.sheet({ kind: 'shop', title, keeper, stock })` in a place scene), loot (`LOOT` in `src/content/rules.ts`), or `s.give()` in a scene. The crawler fails on an item nobody can get.

The save schema reads `ITEM_IDS` directly, so a new item needs no save migration. Expect `npm run rules:baseline`: the rules baseline draws its cases from the item list.

## Gear and sheet music

- **Gear.** Threads, charms and mods: ids in `THREADS_IDS`, `CHARM_IDS` or `MOD_IDS` (`src/core/ids/items.ts`) and rows in `src/content/gear/threads.ts`, `charms.ts` or `mods.ts`. Instruments are generated from `INSTRUMENT_TIER_IDS` × the classes in `gear/instruments.ts`, so never hand-write an `inst_*` row.
- **Sheet music.** An id in `SHEET_MUSIC_IDS` and a row in `src/content/sheetMusic.ts`. What it does is data: a `passive` (`PassiveMods` in `src/core/types/content.ts`, shared with bandmates). A new combination of existing passive fields needs no engine change. A new kind of passive is a new `PassiveMods` field plus engine handling ([extension points](../team/extension-points.md#effect-kinds-and-effectops)).

Either one also needs a way to get it, usually a shop. Like items, both move the rules baseline, whose shop cases draw from the gear and sheet-music tables.

## Bandmates and the second line

- **A bandmate** is an id in `BANDMATE_IDS` (`src/core/ids/band.ts`) and a row in `src/content/band/bandmates.ts`: its `assist` move (an `as_*` id in `ASSIST_SKILL_IDS` and a row in `src/content/combat/assistSkills.ts`), its `passive` and `passiveDesc`. Bandmates also speak, and the band sheet draws them by their NPC sprite, so the id must be in `NPC_IDS` too ([NPCs](#npcs)). Recruit it in a scene with `s.recruit(id)`.
- **A second-line marcher** for the Tower is an id in `SECOND_LINE_IDS` and an entry in `SECOND_LINE` (`src/content/band/secondLine.ts`), whose `when` decides whether they've joined. The list's order is the marching order.

## Places

1. Add the id to `PLACE_IDS` (`src/core/ids/world.ts`) and a row to `src/content/places.ts`.
2. Add the id to the district's `places` in its `district.ts`.
3. Write its options with `definePlace` in `src/content/districts/<district>/places.scene.ts` ([writing scenes → Places](writing-scenes.md#places)), and register it in `PLACE_SCENES` (`src/content/index.ts`). The record is total, so a place without scenes doesn't compile.

Option keys become test ids (`opt:<key>`), so choose stable, meaningful names. The crawler runs every option in every state down every branch, and `tests/e2e/world.spec.ts` walks every place in the phone.

## Districts

1. Add the id to `DISTRICT_IDS` (`src/core/ids/world.ts`).
2. Create `src/content/districts/<id>/` with `district.ts` (levels, groups, pool, elite, boss, places, intro, ambient lines, `bountyGold`), `enemies.ts` and `places.scene.ts`. Register the district in `content/districts/index.ts` and its enemies in `content/enemies/index.ts`.
3. Add its act to `ACT_ORDER` and `ACT_STEPS` (`src/core/ids/story.ts`), with journal rows in `src/content/story/acts.ts`.
4. Write its first-visit scene in `ARRIVALS` (`src/content/world/arrivals.scene.ts`). That record is total too.
5. Unlock it from the previous boss's `next`.
6. Add an art family file for its characters ([Sprites](#sprites)).

The dev menu's act jump (`setupAct()` in `src/app/devStates.ts`) reads all of this, so it usually needs no edit. One rule in it is by position (Gus is freed from the sixth act on), so check it if you insert an act before the Garden District.

## NPCs

An id in `NPC_IDS` (`src/core/ids/world.ts`), a row in `src/content/npcs.ts` (name and colour), and a sprite. `NPC_SPRITE` in `src/content/sprites/refs.ts` maps every speaker to its art, and the compiler requires an entry. A speaker can reuse an opponent's art (`hush` → `captain_hush`). A shopkeeper who never speaks goes in `SHOPKEEPERS` there instead, with the place whose shop they run.

## Quests

An id in `QUEST_IDS` and a row in `src/content/quests.ts` (what the journal shows). The logic lives in the giver's scenes: `s.quest(id)`, `s.setQuest(id, 'active' | 'done')`, counters, and the drop and kill tables `QUEST_DROPS` and `QUEST_KILL_COUNTERS` in `src/content/rules.ts`. The crawler fails on a quest nobody can finish.

## Street events

Add a `defineEvent({ id, name, districts, weight, text, options })` to `STREET_EVENTS` in `src/content/world/streetEvents.scene.ts`. `districts: null` means everywhere. **Add it at the end of the list.** The weighted pick walks the list in order, so inserting one in the middle shifts every later roll. The transcript baseline has a case for every option of every event, so a new event needs `npm run transcripts:baseline`. The diff should add your event's cases and nothing else.

## Lexicon terms

An id in `GLOSSARY_IDS` (`src/core/ids/world.ts`) and a row in `src/content/glossary.ts`. Words in narration that match a term link to it automatically, once per line, unless the row sets `noauto`. Force a link with `[[term]]`, or show other text with `[[term|display text]]`. The completeness test fails on a link to a term that doesn't exist.

## Flags and story steps

- **A flag** is a one-time beat: add it to `FLAG_IDS` (`src/core/ids/flags.ts`) with a doc comment saying what sets it and what reads it. Counts go in `game.counters` instead.
- **A story step** goes into its act's list in `ACT_STEPS`, in order, with a row in `src/content/story/acts.ts`: journal text, where, an optional `hintPlace` (which place gets the "!") and optional `progress` (completes on its own after battles). Steps without `progress` are moved on by scenes with `s.story.set(...)`. Saves store steps by name, so renaming or removing a step breaks existing saves unless you add a [save migration](#new-save-fields).

## Sprites

Every opponent, class and speaker has a pixel-art sprite, and a missing one doesn't compile.

1. Draw it in the right family file in `src/content/sprites/art/` (one per district, plus heroes, people, shopkeepers and rivals) to the spec in [character-design.md](../vision/character-design.md): 24×24 (32×32 for bosses), the 80-colour palette, at most 16 colours (20 for bosses). Or make it a variant of an existing sprite with a `recolor` and/or an `overlay`.
2. Add its card to [character-design.md](../vision/character-design.md): a heading ending in the sprite id in backticks. The validator requires one per sprite.
3. Run `npm run sprites:export` to regenerate the gallery in `docs/reference/sprites/`. `npx tsx tools/sprites.ts --sheet out.html` writes a one-page contact sheet for reviewing art, and the dev menu has a Sprite gallery for checking it on a phone.

## New save fields

Anything that must survive a reload is a `GameState` field. Follow [state and saves](../architecture/state-and-saves.md#changing-the-save-format):

1. Add the field to `GameState` (`src/core/types/state.ts`) with a doc comment.
2. Initialise it in `newGame` (`src/engine/state.ts`).
3. Add it to `gameStateSchema` in `src/app/save/format.ts`. A compile-time check fails if you forget.
4. If existing saves need a value, bump `SAVE_VERSION` and add a step to `MIGRATIONS`. Never edit an old migration: saves on phones and on the server depend on it.
5. Extend `src/app/save/format.test.ts`, and run `npm run test:server`, because the server decodes the same format.
6. If New Game+ should carry it over, add it to `newGamePlus` in `src/engine/state.ts`.

## Check your work

1. **`npm run check`.** Types, lint, layers, and every Vitest suite: the content validator, completeness, the crawler, combat coverage, the playthrough, the baselines and the generated docs.
2. **Baselines.** A failure in `tools/sim.test.ts` (balance), `tools/engine/rules.test.ts` (enemy groups, field items, shops, victories) or `tests/integration/transcripts.test.ts` (scenes) means behavior moved. New items, gear, pool enemies, bosses and districts usually move the sim or rules baseline, and that's expected: run `npm run sim:baseline` or `rules:baseline`, read the diff, and check that only what you added moved. If you changed an existing scene, `npm run transcripts:baseline`. Name the re-baseline in the commit message. If a baseline moved that you didn't expect to, find out why before re-baselining ([testing → Baselines](testing.md#baselines)).
3. **Balance.** If combat numbers could have moved, diff the sim ([balancing](balancing.md)).
4. **Generated docs.** `npm run docs:tables` after content changes, `npm run docs:codemap` after code changes, `npm run sprites:export` after art. `npm test` fails when any is stale.
5. **In the phone.** `npm run dev`, open the dev menu (tap the version on the title screen five times) and jump to the act or boss. Check it at 360px with no console errors. `npm run e2e` runs the phone suite with axe on every screen.

## Quick reference

| Kind | Id list | Row | Also |
|---|---|---|---|
| Enemy | `ENEMY_IDS` | `districts/<d>/enemies.ts` | a pool or elite, a sprite, maybe an `en_*` move |
| Boss | `BOSS_IDS` | `bosses/<id>.ts` | `b_*` moves, `<id>.scene.ts` in `BOSS_SCENES`, a place, story steps, a 32×32 sprite |
| Status | `STATUS_IDS` | `combat/statuses.ts` | engine handling unless it's a `mod` |
| Item | `ITEM_IDS` | `items.ts` | a shop, loot or `s.give()` |
| Gear | `THREADS_IDS`, `CHARM_IDS`, `MOD_IDS` | `gear/*.ts` | a shop |
| Sheet music | `SHEET_MUSIC_IDS` | `sheetMusic.ts` | a shop |
| Bandmate | `BANDMATE_IDS` | `band/bandmates.ts` | an `as_*` assist, an NPC, `s.recruit()` |
| Place | `PLACE_IDS` | `places.ts` | the district's `places`, `definePlace`, `PLACE_SCENES` |
| District | `DISTRICT_IDS` | `districts/<d>/district.ts` | an act, `ARRIVALS`, the previous boss's `next`, art |
| NPC | `NPC_IDS` | `npcs.ts` | `NPC_SPRITE`, a sprite |
| Quest | `QUEST_IDS` | `quests.ts` | the giver's scenes |
| Lexicon term | `GLOSSARY_IDS` | `glossary.ts` | |
| Flag | `FLAG_IDS` | | a doc comment |
| Story step | `ACT_STEPS` | `story/acts.ts` | a `hintPlace` |

Paths in the Row column are under `src/content/`; id lists are in `src/core/ids/`.
