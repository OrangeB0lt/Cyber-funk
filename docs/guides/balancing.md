# Balancing

The engine is deterministic: the same seed plays the same fight. A balance change is therefore an **exact diff**, never "seems about the same after three runs".

## Tools

```sh
npm run sim                              # every class vs every district and boss (seed 1)
npm run sim -- --seed 7                  # a different seed
npm run sim -- --json > /tmp/after.json  # structured rows for diffing
npm run trace -- trumpet captain_hush 3 --seed 42    # one fight, turn by turn
npm run trace -- bassdrum isolde 13 --events         # include raw events
```

### Reading the sim

```
=== TRUMPET ===
treme      L2 n=0: win 100% rounds 2.8 hpLost 15%
…
BOSS captain_hush  L3: win 95% rounds 8.1 items 0.6 beads 0.0 hpLeft 41%
```

- **Street rows:** 60 fights per class per district at the district's minimum level + 1, with a sensible loadout for that level. Each row reports win rate, rounds and Heart lost in wins.
- **Boss rows:** 40 fights at the boss's level, carrying 3 gumbo, 3 po'boys and tone beads. Each row reports win rate, rounds, items used, beads used and Heart left.
- The scripted player heals when low, VAMPs through charged moves, uses beads against resistances, SOLOs when ready, and otherwise picks the highest expected-damage skill. It plays like a decent player, not a perfect one.

## Workflow

1. **Before:** `npm run sim -- --json > /tmp/before.json`.
2. Change the knob:
   - `src/engine/balance.ts`: enemy scaling, difficulty, the XP curve.
   - Skill multipliers and statuses: `src/content/combat/`, `src/content/classes/`.
   - Boss stats and AI: `src/content/bosses/`.
   - Loot and drops: `src/content/rules.ts`.
3. **After:** `npm run sim -- --json > /tmp/after.json`, then diff. Anything that moved, moved because of your change.
4. **Explain outliers** with `npm run trace` on the matchup.
5. Put the before/after rows in the PR.

> **The baseline:** `tests/fixtures/sim/seed-{1,2,1984}.txt` hold the sim's output for three seeds, and `tools/sim.test.ts` fails when it changes. A change meant to move balance rewrites them with `npm run sim:baseline` in the same commit, so the diff is the review. The `balance-check` skill's `compare.js` diffs the sim between a git ref and your working tree, averaged over several seeds.

## Knobs at a glance

| Knob | Where |
|---|---|
| Enemy Heart/Chops per level, boss multipliers | `BALANCE` in `src/engine/balance.ts` |
| Enemy Grit/Tempo growth | `enemyBaseStats` in `src/engine/balance.ts` |
| Difficulty modes | `difficultyMods` in `src/engine/balance.ts` |
| XP curve | `xpToNext` in `src/engine/balance.ts` |
| Damage formula, crit, dodge | `src/engine/combat/resolve.ts` (documented in [systems/combat.md](../systems/combat.md)) |
| Class stats and growth | `src/content/classes/<class>.ts` |
| Skill multipliers, statuses | the skill rows |
| Boss behavior | `src/content/bosses/<id>.ts` |
| Rewards, drops | `src/engine/combat/rewards.ts`, `src/content/rules.ts` |
