---
name: balance-check
description: Measure how a change affects CYBER FUNK combat balance by diffing the headless sim (every class vs every district and boss) between a git ref and the working tree, then explaining outliers with single-fight traces, and re-baselining the sim fixture when the change is meant to move the numbers. Use after touching the BALANCE constants, makeEnemy, xpToNext, enemy/boss stats or AI, skills, statuses, items or gear, or when asked whether something is too hard, too easy, or a slog.
---

# Balance check

`tools/sim.ts` (`npm run sim`) plays, for each of the 7 classes, 60 street groups per district at
that district's level + 1 and 40 fights per boss at the boss's level, with level-appropriate gear,
bandmates and items, on the default `local` difficulty. Its player is competent (heals, braces for
telegraphs, uses tone beads against resistances). It is **deterministic for a seed**: the same code
and seed give the same table, so any change to combat shows up as an exact diff.

`tests/fixtures/sim/seed-{1,2,1984}.txt` hold the sim's output for three seeds, and
`tools/sim.test.ts` (part of `npm test`) fails when it moves. They started as v1's numbers.

## 1. Diff against a ref

```
node .claude/skills/balance-check/compare.js              # HEAD vs working tree, seeds 1-3 (~3 s)
node .claude/skills/balance-check/compare.js --ref main~3  # any git ref
node .claude/skills/balance-check/compare.js --runs 6      # seeds 1-6, tighter numbers before a verdict
node .claude/skills/balance-check/compare.js --all         # every matchup, not just the movers
```

It extracts `src/` and `tools/` at the ref with `git archive` into a temp dir (with this checkout's
`node_modules` linked in), so it never touches the working tree. It averages each side over the seeds
and prints the matchups where win% moved ≥4 points, Heart-left moved ≥6 points, or average rounds
moved ≥15%, plus anything under 90% win. A change to combat reshuffles every later draw, so one seed
moves a little everywhere; the thresholds sit just above that noise. A single flagged row outside the
area you touched is probably noise; re-run with `--runs 6` before reporting it.

`npm run sim -- --seed 7 --json` gives structured rows if you need your own comparison.

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
npm run trace -- <class> <opponent> <level> [--seed N] [--events]   # e.g. trombone conductor 15
```

`tools/trace.ts` prints one fight turn by turn as the sim's player plays it. Try 2–3 seeds, since a
single trace is anecdotal, and look for the mechanism: a resisted tone, a status lock, a telegraphed
move that isn't being braced, healing outpacing damage, an `onHalf` summon.

## 4. Where the knobs are

- `src/engine/balance.ts`: `BALANCE` (enemy HP and Chops per level, boss multipliers and their
  growth), `enemyBaseStats()`, `xpToNext()` (the XP curve), `difficultyMods()` (the sim uses `local`
  difficulty only). `makeEnemy()` (`src/engine/combat/actors.ts`) applies elite and per-enemy
  multipliers. Per-hit formulas are in `src/engine/combat/resolve.ts`.
- `src/content/rules.ts`: loot, the level cap, skill unlock levels, the sell rate, the street-defeat
  Doubloon loss, the new-game start.
- Enemy rows (`src/content/districts/<id>/enemies.ts`, `src/content/enemies/`): `hpMult`, `gritMult`,
  `dodgeBonus`, elites.
- Boss files (`src/content/bosses/<id>.ts`): stats, `ai()` and `onHalf()`; their moves in
  `src/content/combat/bossSkills.ts`.
- Skills (`src/content/classes/`, `src/content/combat/`), statuses (`combat/statuses.ts`), items
  (`items.ts`), gear (`gear/`), sheet music (`sheetMusic.ts`).
- The sim's own player and loadouts (`loadout()`, `chooseAction()` in `tools/sim.ts`). Changing them
  moves the fixture without changing the game; say which it was.

Change one knob at a time and re-run the diff.

## 5. What the sim can't see

The sim measures fights at fixed levels with fixed loadouts. When the question is broader than "is
this fight too hard", check these by reading the data, and if you can't, say **not assessed**
rather than implying a clean pass:

- **Dominant options**: a skill or item that is always the right pick. Compare `mult` per Funk cost
  across a class's skills and against the riff; a skill that beats the rest at every level crowds out
  the others.
- **Unkillable states**: stacks of `guard`, `countermelody`, `pitchshield`, `encore` or `drain`
  healing that outpace a boss's damage. In the sim this shows up as very long fights that finish with
  Heart near 100%.
- **Progression**: do victory XP and `xpToNext()` get a player to district level + 1 (the level the
  sim assumes) without grinding? Look for power spikes at the skill unlock levels (1, 3, 5, 7, 10, 13)
  and the instrument tier gates.
- **Economy**: Doubloon sources (victories, bounties, street events) against sinks (shop prices,
  instrument tiers, sheet music). Can a player afford the gear the sim's `loadout()` assumes at each
  level?

(Checklist adapted from the balance-check skill in Donchitos/Claude-Code-Game-Studios, MIT.)

## 6. Re-baseline and report

- If the change is **meant** to move balance, rewrite the fixture in the same commit:
  `npm run sim:baseline`. The fixture's diff is the review; name it in the commit message. A change
  that moves rules or scenes as well also needs `npm run rules:baseline` or
  `npm run transcripts:baseline` (`docs/guides/testing.md`, "Baselines").
- If it isn't meant to, `npm test` failing on `tools/sim.test.ts` is the bug report.
- Report the change, the before→after numbers for the matchups that moved, and whether anything
  crossed the 90% line. If the person wants a picture, load the `dataviz` skill and render a class ×
  boss heatmap (win% or Heart left) from `--all` output.
