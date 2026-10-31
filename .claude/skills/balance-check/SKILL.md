---
name: balance-check
description: Measure how a change affects CYBER FUNK combat balance by diffing the headless sim (every class vs every district and boss) between a git ref and the working tree, then explaining outliers with single-fight traces. Use after touching BALANCE, makeEnemy, xpToNext, enemy/boss stats or AI, skills, statuses, items or gear, or when asked whether something is too hard, too easy, or a slog.
---

# Balance check

`sim/sim.js` loads `src/01–05` into a Node `vm` (no DOM) and, for each of the 7 classes, fights 60
street groups per district at that district's level + 1 and 40 fights per boss at the boss's level,
with level-appropriate gear, bandmates and items, on the default `local` difficulty. Its player AI is
competent (heals, braces for telegraphs, uses tone beads against resistances). The RNG is unseeded, so
compare **averages of several runs**, never a single run.

## 1. Diff against a baseline

```
node .claude/skills/balance-check/compare.js              # HEAD vs working tree, 3 runs each (~4 s)
node .claude/skills/balance-check/compare.js --ref main~3  # any git ref
node .claude/skills/balance-check/compare.js --runs 6      # tighter numbers before a verdict
node .claude/skills/balance-check/compare.js --all         # every matchup, not just the movers
```

It extracts `src/` and `sim/` at the ref with `git archive` into a temp dir, so it never touches the
working tree. It prints the matchups where win% moved ≥4 points, Heart-left moved ≥6 points, or average
rounds moved ≥15%, plus anything under 90% win. These thresholds sit just above noise: with no code
change, 3 runs each flag about 1 matchup in 300. A single flagged row that isn't in the area you
touched is probably noise; re-run with `--runs 6` before reporting it.

## 2. Read the numbers

- **win%**: below ~90% at the recommended level is a wall for an average player (the sim plays
  better than most people with timing on manual).
- **rounds**: fight length. A boss at 12+ rounds where others take 5–8 is a slog even if it's winnable.
  Compare within a column (same boss across classes) and within a row (same class across bosses).
- **hp (Heart left)** for bosses / `100 - hpLost` for streets: Heart left above ~90% means the fight
  posed no threat for that class.
- **items** (bosses only): consumables used per win. Rising items with a flat win% means the fight
  got harder but the bag is hiding it.

Report class/boss outliers rather than averages. Balance problems in this game are usually one class
against one boss (e.g. a tone resistance it can't play around).

## 3. Explain an outlier

```
node sim/trace.js <class> <boss> <level>      # e.g. node sim/trace.js trombone conductor 15
```

This prints one fight's full log. Run it 2–3 times, since a single trace is anecdotal, and look for
the mechanism: a resisted tone, a status lock, a telegraphed move that isn't being braced, healing
outpacing damage, an `onHalf` summon.

## 4. Where the knobs are

- `BALANCE` (top of the engine section in `src/05_engine.js`): enemy HP/Chops per level, and boss
  HP/Chops multipliers and their per-level growth.
- `enemyBaseStats()`, `makeEnemy()`: elite ×1.6 HP, `hpMult`/`gritMult`/`dodgeBonus` per enemy row.
- `xpToNext()`: the XP curve (affects what level players actually arrive at; the sim assumes
  district level + 1).
- `difficultyMods()`: the tourist/grand difficulty scaling (not simulated; the sim uses `local`).
- Per-boss `ai()` and `onHalf()` in `src/02_data_enemies.js`; skill multipliers in `SKILLS`.

Change one knob at a time and re-run the diff. If a fix needs an engine function the sim can't see,
add it to the `this.__E = { ... }` export line in `sim/sim.js`.

## 5. What the sim can't see

The sim measures fights at fixed levels with fixed loadouts. When the question is broader than "is
this fight too hard", check these by reading the data, and if you can't, say **not assessed**
rather than implying a clean pass:

- **Dominant options**: a skill or item that is always the right pick. Compare `mult` per `fp` across
  a class's `SKILLS` and against the riff; a skill that beats the rest at every level crowds out the
  others.
- **Unkillable states**: stacks of `guard`, `countermelody`, `pitchshield`, `encore` or `drain`
  healing that outpace a boss's damage. In the sim this shows up as very long fights that finish with
  Heart near 100%.
- **Progression**: does `battleRewards()` XP against `xpToNext()` get a player to district level + 1
  (the level the sim assumes) without grinding? Look for power spikes at the `SKILL_LEVELS` unlocks
  (1, 3, 5, 7, 10, 13) and the `INSTRUMENT_TIERS` level gates.
- **Economy**: Doubloon sources (battle rewards, `BOUNTIES`, street events) against sinks (shop prices,
  instrument tiers, `SHEET_MUSIC`). Can a player afford the gear the sim's `loadout()` assumes at
  each level?

(Checklist adapted from the balance-check skill in Donchitos/Claude-Code-Game-Studios, MIT.)

## 6. Report

State the change, the before→after numbers for the matchups that moved, and whether anything crossed
the 90% line. If the person wants a picture, load the `dataviz` skill and render a class × boss heatmap
(win% or Heart left) from `--all` output. Finish with `npm test` (in the background) if engine code
changed, since the sim doesn't exercise the UI.
