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

## Functions in content

Some content is behavior: a boss's AI, a skill with a one-off mechanic, a second-line member's join condition. Those are small functions in the content file, with three rules:

- They **receive** what they need (`c.ops`, `c.rng`, the game state); they never import the engine.
- They use the battle's `rng`, never `Math.random`.
- They are short. If logic repeats, promote it to an effect kind or an `EffectOps` method.

## Story data versus story scripts

- `story/acts.ts` is **data** the engine reads: journal text, hint places, automatic completion rules.
- The scripts that run scenes (dialogue, choices, fights) are `*.scene.ts` files, added in P2. The engine never imports them, which keeps the balance sim free of prose.
