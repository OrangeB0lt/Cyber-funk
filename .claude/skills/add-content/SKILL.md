---
name: add-content
description: Checklist for adding or changing CYBER FUNK game content — an enemy, elite, boss, skill or boss move, status, consumable item, gear piece, sheet music, bandmate, district or place, quest, street event, glossary/lexicon term, or a new persistent save field. Use whenever a change touches the data tables in src/01–04 or adds state to newState(), so every cross-reference (district pools, shops, story maps, dev menu, sim export line, save migration) gets updated and the change is verified.
---

# Adding content to CYBER FUNK

Content is rows in data tables, but most rows are referenced from somewhere else too. A row that
nothing points at is dead content (an item no shop sells, an enemy in no district pool). Work through
the section for your content type, then **Verify**.

The PostToolUse hook rebuilds `dist/` and runs `node --check` on changed files after every edit, so
you don't run `npm run build` by hand inside Claude Code. If the hook reports `dist/ NOT rebuilt`,
fix the syntax error first.

## Effect lists (skills, boss moves, assists, items)

Everything that *does* something is `fx: [...]` (or `use: [...]` on items) resolved by
`resolveSkill()` in `src/05_engine.js`. The canonical list is the comment above `SKILLS` in
`src/01_data_core.js`; the kinds are:

| k | fields |
|---|---|
| `dmg` | `tone, mult, hits, target:'one'\|'all'\|'rand', status:{id,chance,turns}, ignoreGrit, noDodge, ignoreResist, critBonus, drain, recoil, machineBonus` |
| `status` | `id, chance, target:'self'\|'one'\|'all'\|'allies'\|'player', turns` |
| `heal` | `pct` or `flat`, `target` |
| `funk` | `pct` or `flat` |
| `cleanse` | `target, kind:'bad'\|'good'` |
| `strip` | `target` (removes good statuses) |
| `guard` | `pct, reflect` |
| `groove` | `amt` |
| `fn` | `run: (ctx) => void` (escape hatch; use sparingly) |

`mult` may be a function `(ctx) => number`, and any effect may carry `cond: (ctx) => bool`.
Tones are `HOT LOW BLUE FUNK SWEET` (SWEET never deals damage). Prefer composing existing kinds over
`fn`; if you need a genuinely new kind, add it to `resolveSkill()` and to the comment table.

## By content type

**Enemy** (`ENEMIES`, `src/02_data_enemies.js`)
- Fields: `id` (must equal the key), `name`, `district`, `lvl:[min,max]`, `tone`, `weak`, `resist`
  (or `null`), `special` (a `SKILLS` id, usually `en_*`), optional `specialChance` (default 0.3),
  `elite`, `machine` (Static's Scratch doubles vs. machines), `hologram`, `gritMult`, `hpMult`,
  `dodgeBonus`, `book` (bestiary text).
- Define its `special` move in `SKILLS` (`src/01_data_core.js`, `en_*` section).
- Add it to `DISTRICTS[d].pool` (`src/04_data_world.js`) or it never spawns on the streets *and*
  the sim never fights it. Elites go in `DISTRICTS[d].elite` and `BOUNTIES[d]`.

**Boss** (`BOSSES`, `src/02_data_enemies.js`) — the most cross-referenced type:
- Row: `id, name, lvl, district, tone, weak, resist, drop` (a Blue Note), `lines:{intro,half,defeat}`,
  `book`, `ai(b, self)` returning `{ skill, telegraph? }`, optional `onHalf(b, self)`.
- Its moves (`b_*`) in `SKILLS`.
- A `PLACES` entry with `kind:'boss', boss:'<id>'` (bossFlow finds the boss's place this way) and that
  place id in `DISTRICTS[d].places`; `DISTRICTS[d].boss`.
- `BOSS_PRE[id]` and `BOSS_POST[id]` scenes and `NEXT_AFTER_BOSS[id]` in `src/09_story.js`.
- `BLUE_NOTES` entry if it drops a note.
- `MAIN_STEPS` in `src/04_data_world.js` and the `placeHint` map in `src/08_world.js`.
- The dev menu's hard-coded `acts` map inside `openDevMenu()` (`src/10_main.js`), or "Jump to boss"
  throws for it.
- The sim picks bosses up automatically (`Object.keys(BOSSES)`); a boss that needs special setup
  (like `the_click`) needs a branch in `sim/sim.js`.

**Class skill / status**
- Class skills: `CLASSES[c].skills` has exactly 6 slots unlocked at `SKILL_LEVELS = [1,3,5,7,10,13]`.
  Replacing a slot is fine; adding a 7th needs a `SKILL_LEVELS` change.
- Status: a `STATUSES` row. `mod:{stat: ±pct}` statuses work automatically through `effStat()`;
  anything else (damage over time, skip turn, triggers) needs handling in the engine. Grep an existing
  status id such as `scorched` in `src/05_engine.js` to find the hook points.

**Item / gear / sheet music** (`src/03_data_items.js`)
- Item: `id, name, price, desc, battle, field, use:[effects]`, optional `max`. Then list it in a shop:
  `openShop(title, [{ id }, ...])` calls in `PLACE_FLOWS` (`src/08_world.js`). Otherwise it's only
  obtainable through `G.give()` in events.
- Gear: `GEAR` rows for `threads`, `charm` and `mod`; instruments are generated from
  `INSTRUMENT_TIERS` × `CLASSES`, so don't hand-write `inst_*` rows. Shop listing as above.
- `SHEET_MUSIC` effects are implemented in the engine; grep an existing id (`sm_swing`) to find where.

**District / place / NPC / quest** (`src/04_data_world.js` + code)
- A place needs a `PLACES` row, its id in `DISTRICTS[d].places`, and a handler in `PLACE_FLOWS`
  (`src/08_world.js`). `enterPlace()` silently does nothing if the handler is missing.
- A new district also needs `ACT_ORDER`, `MAIN_STEPS`, `BOUNTIES`, `DISTRICT_ARRIVAL`
  (`src/09_story.js`) and travel unlocks via `NEXT_AFTER_BOSS`.
- `QUESTS` rows are metadata only; the quest logic lives in the giver's `PLACE_FLOWS` handler and in
  `S.quests[id]` state (`'active'`/`'done'`).

**Street event** (`EVENTS`, `src/04_data_world.js`)
- `{ id, name, districts: null | ['treme', ...], weight, text, options: [{ label, cond?(G), run: async G => {...} }] }`.
- Use the `G` API (`src/08_world.js`): `narrate`, `say(npcId, text)`, `choose`, `gold(n)` (returns
  false if broke), `xp`, `scaleXp`, `scaleGold`, `give(itemId, n)`, `count`, `heal(pct)`, `funk(pct)`,
  `check(stat, base, yatBonus)`, `fight([enemyIds], {ambush})`, `nextFight(mods)`, `hasBandmate`,
  `randomItem`, `bookHint`.

**Glossary / lexicon** (`GLOSSARY`, `src/04_data_world.js`)
- Key is the lowercase term: `{ term, pron, def, cat }`.
- In any narrated text, `[[term]]` or `[[term|display text]]` links it. Plain-text mentions are also
  auto-linked, so check the key matches how the word appears.

## New persistent state

- Add top-level save fields to `newState()` in `src/05_engine.js`. `migrate()` (`src/10_main.js`)
  back-fills **top-level keys only** from a fresh state, so a new key nested inside an existing object
  (e.g. `S.band.foo`, `S.settings.bar`) must be back-filled explicitly in `migrate()`. `settings`
  already merges `defaultSettings()`.
- If the sim or trace needs a new engine function, add it to the `this.__E = { ... }` export line in
  `sim/sim.js` (and `sim/trace.js`). They only load files 01–05, so engine code must stay DOM-free.
- Keep `data-act` names stable; the jsdom tests and Playwright drive the game by them.

## Verify

1. The hook's rebuild succeeded (no `dist/ NOT rebuilt` message).
2. If combat numbers could have moved (enemy, boss, skill, status, item, gear, balance), use the
   `balance-check` skill.
3. Look at it in the real UI with the `playtest` skill: dev menu to jump to the boss, act or district,
   then check the new content renders at 360px with no console errors.
4. Run `npm test` (~5 min; run it in the background). For boss, story or progression changes also run
   `npm run test:natural` (~15–20 min).
