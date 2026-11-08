# Content model

Everything the player meets is content in `src/content/`: classes, skills, enemies, bosses, items, gear, districts and the story. Content is typed TypeScript. That way your editor autocompletes ids and documents every field on hover, and a typo fails to compile instead of failing silently in a playtest.

## Layout

```
src/content/
  combat/       tones, statuses, timing grades, enemy/boss/assist skills, the merged SKILLS table
  classes/      one file per instrument class: the class row and its eight skills
  roots.ts      character roots
  districts/<id>/
    district.ts the district row (levels, street pool, elite, boss, places, ambient text, bounty)
    enemies.ts  the district's street enemies and elite
    …           places, NPCs, quests, events (added as scenes are ported)
  enemies/      enemies that don't belong to a district (summons, Cutting Contest rivals) + the merged ENEMIES table
  bosses/       one file per boss: stats, lines, Blue Book entry and AI
  notes.ts      the six Blue Notes
  items.ts      consumables and key items
  gear/         instruments (generated per class and tier), threads, charms, mods
  sheetMusic.ts techniques with passive bonuses
  band/         bandmates and the second-line roster
  story/acts.ts the main quest's journal text, hints and automatic progress
  rules.ts      loot, quest drops, encounter rigging, economy constants, new-game start
  data.ts       everything above, as the engine sees it (no scenes)
  index.ts      data + scenes, as the app sees it (from P2)
```

## Tables

Every table is declared as a `Table<Id, Def>`:

```ts
export const ITEMS: Table<ItemId, ItemDef> = {
  beignet: { id: 'beignet', name: 'Beignet', price: 15, desc: '…', battle: true, field: true,
             effects: [{ kind: 'heal', flat: 40 }] },
  …
};
```

The compiler checks four things:

- every id in `core/ids/items.ts` has a row;
- no row exists without an id;
- each row's `id` equals its key;
- every field has the documented type.

Tables split across files (enemies by district) are declared with `satisfies Partial<Table<…>>` in each file and merged into one full `Table` in an index file, which proves completeness.

**Key order matters** in a few merged tables (`ENEMIES`, `SKILLS`, `GEAR`), because some features iterate them in order. Each index file keeps v1's order and says so.

## Adding something

The full step-by-step list is [guides/adding-content.md](../guides/adding-content.md). The pattern is always the same:

1. **Declare the id** in `src/core/ids/<kind>.ts`. The compiler will now show you every table that needs a row.
2. **Write the row** where it belongs (a district's `enemies.ts`, a boss file, `items.ts`…).
3. **Wire references**: add the enemy to a district `pool`, the item to a shop (in its scene), and so on.
4. **Run `npm run check`.** The content validator (`tools/validate-content.ts`) catches what types can't, such as an enemy that never spawns or a missing riff flag.

## Character art

Every character's pixel-art sprite lives in `content/sprites/`. The spec for each one is [character-design.md](../vision/character-design.md), and the reasons for the format are in [ADR-0007](../adr/0007-character-sprites.md).

- **Ids.**
  - An opponent's id is its sprite id. Heroes and Session Clones are `hero_<class>` and `clone_<class>`, and everyone else is in `PERSON_SPRITE_IDS` (`core/ids/sprites.ts`).
  - A type-level guard stops a person id from reusing an opponent id. (NpcId `valet` is the Silver Tuxedo valet, drawn as `tuxedo_valet`; EnemyId `valet` is the Valet Assassin.)
- **Rows.**
  - `SPRITES` (`content/sprites/table.ts`) is a full `Table<SpriteId, SpriteDef>`, merged from the per-family files in `content/sprites/art/`. A new enemy, boss, class or person without art doesn't compile.
  - A row is either a grid (24 strings of 24 characters, 32×32 for bosses, with `keys` mapping each character to a colour in `PALETTE`) or a variant of another sprite (`recolor` and/or an `overlay`).
  - The seven Session Clone rows are generated from the heroes.
- **Who is drawn with what.** `NPC_SPRITE` (`content/sprites/refs.ts`) maps every NpcId to its sprite, and the compiler requires a row per speaker:
  - Some speakers reuse an opponent's art (`hush` → `captain_hush`).
  - `you` is the player's hero.
  - Shopkeepers who never speak are in `SHOPKEEPERS`, with the place whose shop they run.
- **Only the UI and tools load it.** A depcruise rule forbids importing `content/sprites/` from core, narrative, engine, app or other content, and nothing re-exports it from `content/index.ts` or `content/data.ts`, so the engine, the sim and headless tests never load art.
- **Checks.** `tools/validate-content.ts` enforces these rules from the design doc:
  - grid size, keys, and the pixel alphabet
  - variant depth and cycles, at least 15% painted pixels, at most 16 colours (20 for bosses)
  - no duplicates, holograms drawn with `fx: 'holo'`, every palette colour in use
  - a card in the design doc for every sprite, and a palette table equal to `PALETTE`

  `npm run sprites:export` regenerates the gallery in `docs/reference/sprites/`, and a test fails when it's stale.

## Functions in content

Some content is behavior: a boss's AI, a skill with a one-off mechanic, a second-line member's join condition. Those are small functions in the content file, with three rules:

- They **receive** what they need (`c.ops`, `c.rng`, the game state); they never import the engine.
- They use the battle's `rng`, never `Math.random`.
- They are short. If logic repeats, promote it to an effect kind or an `EffectOps` method.

## Story data versus story scripts

- `story/acts.ts` is **data** the engine reads: journal text, hint places, automatic completion rules.
- The scripts that run scenes (dialogue, choices, fights) are `*.scene.ts` files, added in P2. The engine never imports them, which keeps the balance sim free of prose.
