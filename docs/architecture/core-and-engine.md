# Core and engine

The two bottom layers that make the game a game. Neither knows about the DOM, React or the story's prose. Read [ADR-0002](../adr/0002-layering.md) for why the layers are split this way, and [ADR-0003](../adr/0003-determinism-and-parity.md) for the determinism rules.

## `src/core`: the contracts

| Path | What's in it |
|---|---|
| `ids/*.ts` | One `as const` list per kind of thing (skills, enemies, items, districts, story steps…) and the union type derived from it. **Every id in the game is declared here.** |
| `types/*.ts` | The shapes everything else agrees on: `GameState` (the save), every content `*Def`, `Actor`, `Battle`, `BattleEvent`, the effect union, `EffectOps`. Every field is documented; hover it in your editor. |
| `rng.ts` | The seeded random stream. Its `float`/`int`/`pick`/`chance` helpers are the only way game logic gets randomness. |
| `helpers.ts` | Pure helpers that need no content (`hasStatus`, `livingEnemies`, `clamp`). |

`core` imports nothing else from the project.

### Why ids live in core

The save file, content tables and engine all refer to the same ids. With the ids in the floor layer, every layer can type its references (`enemies: EnemyId[]`), and tables declared as `Table<Id, Def>` are checked both ways:

- An id with no row is a compile error.
- A row whose key isn't an id is a compile error.
- A row whose `id` field doesn't match its key is a compile error.

## `src/engine`: the systems

The engine is a library of functions over `GameState` and `Battle`. It **mutates in place** (game rules read better that way), draws randomness only from an `Rng` it is handed, and returns plain data.

| Module | Responsibility |
|---|---|
| `state.ts` | `newGame`, `defaultSettings` |
| `stats.ts` | `derivedStats`: class base + growth, roots, permanent bonuses, gear, meal/dream buffs, the Tower bonus, sheet-music and bandmate passives |
| `progression.ts` | XP and level-ups |
| `inventory.ts`, `economy.ts`, `items.ts` | The bag, prices, field item use, shops (buy/sell/auto-equip) |
| `band.ts` | Bandmate cap, equipping gear |
| `story.ts` | Main-quest position comparisons by step name |
| `encounters.ts` | Street groups (pool, packs, story rigging) and enemy levels |
| `aftermath.ts` | Victory bookkeeping (rewards, step progress, quest counters, bounties), defeat costs, boss-fight snapshots |
| `combat/battle.ts` | `createBattle` |
| `combat/actors.ts` | Building the player and enemy actors |
| `combat/turns.ts` | Rounds, turn order, assists, status ticks, enemy turns, `runUntilPlayer` |
| `combat/player.ts` | `playerAction`, Play the Blues |
| `combat/resolve.ts` | The effect resolver, hit math, healing, death, boss hooks, `EffectOps` |
| `combat/statuses.ts` | Effective stats, applying and removing statuses |
| `combat/timing.ts` | On the One zones and grades, Play the Blues scoring |
| `combat/rewards.ts` | XP, Doubloons, drops; writing the battle back to the save |
| `combat/events.ts` | Logging and other shared bits (dependency-free, so no cycles) |
| `balance.ts` | Enemy scaling, difficulty and the XP curve |

Import the engine through `@engine/index`. Inside the engine, modules import each other directly.

### Randomness conventions

- A battle carries its stream as `b.rng`. Everything inside a fight draws from it.
- Functions used outside a battle that need randomness take `rng` as their **first** parameter: `makeEnemy(rng, …)`, `buildEnemies(rng, …)`, `useFieldItem(rng, …)`.
- In this version, `rng.fork()` returns the same stream, so a whole session is one sequence, as in v1. The baselines depend on it: splitting streams later would be a deliberate re-baseline.

### How content talks to the engine

Content functions (boss AI, custom skill effects) never import the engine. They receive what they need as arguments:

```ts
// a custom effect
{ kind: 'custom', run: c => c.ops.steal(5, 20) }

// a boss hook
onHalf({ ops }) { ops.summon('hush_patrol', 3, 'A Hush Patrolman jogs in from Rampart Street.'); }
```

`EffectOps` is declared in `core/types/effects.ts` and implemented in `engine/combat/resolve.ts` (`makeOps`). To give content a new capability, add a method to `EffectOps` with a doc comment, then implement it in `makeOps`.

### Mechanics versus content

The engine implements **mechanics**: what Scorched does, how a guard works, what a revive is. **Which** enemy, item or place is involved is a content decision, so engine code contains no enemy, item, place or skill ids. A test (`tools/validate-content.test.ts`) fails if one sneaks in. Status, tone and timing ids are mechanics and may appear in the engine (`MECHANIC_STATUSES` lists the statuses the engine implements by id).

Things that were hard-coded in v1 and are now data:

| v1 hard-code | Now |
|---|---|
| Sheet music / bandmate bonuses by id | `SheetMusicDef.passive`, `BandmateDef.passive` |
| `grisgris` revive | `ItemDef.revive` |
| `the_click` and Play the Blues | `BossDef.bluesTarget` |
| `en_basic` | `BASIC_ATTACK` in `content/rules.ts` |
| King Cake / common drops | `LOOT` |
| Ledger pages / crypt keys drops | `QUEST_DROPS` |
| Street-group rigging during quests | `ENCOUNTER_RIGS` |
| String Quartet appears in fours | `EnemyDef.pack` |
| Roots discounts | `RootsDef.discount` |
| Step completion (Tremé fights, pups…) | `StepDef.progress` in `content/story/acts.ts` |
| Bounty payouts | `DistrictDef.bountyGold` |
| Starting district / step / Doubloons | `NEW_GAME` |

## Testing the engine

- **Unit tests** sit next to the code (`*.test.ts`) and describe one mechanic each. They are good reading if you want to learn the rules.
- **Baselines** (`tests/fixtures/`, [testing.md](../guides/testing.md#baselines)): the sim's output for three seeds and 940 seeded rule cases pin the exact numbers v1 gave. Until cutover, parity oracles proved the engine matched v1 draw for draw; the baselines were frozen from them.
- **Combat coverage** (`src/engine/combat/coverage.test.ts`) runs every skill, boss move, assist, status, item, gear piece, enemy and boss through the engine.
- **Properties** (`tools/engine/properties.test.ts`) check two things on 400 seeded fights: replaying is deterministic, and Heart events fold to the true Heart.
