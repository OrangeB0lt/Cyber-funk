# Combat

How a fight works, as a game designer would describe it, with pointers to the code that implements each rule. Numbers here match the engine; if you change a rule, change this page in the same PR.

> **Where the code lives.** Each rule below maps to a module:
>
> - turn loop: `src/engine/combat/turns.ts`
> - player actions: `player.ts`
> - effects, hits and death: `resolve.ts`
> - statuses: `statuses.ts`
> - timing and Blues: `timing.ts`
> - rewards: `rewards.ts`
> - after-battle bookkeeping: `src/engine/aftermath.ts`
>
> Content (skills, enemies, boss AI) lives in `src/content/`.

## The shape of a fight

A battle is a **pull loop**:

1. `runUntilPlayer(b)` advances turns (enemies act, statuses tick) until the player must choose, or the battle ends.
2. The presentation layer animates the events the engine queued, and asks the player for an action.
3. If the action needs it, the player plays the **On the One** timing bar (or the auto-rhythm roll).
4. `playerAction(b, action, timing)` applies the choice. Back to 1.

The engine never waits. It only appends to `b.events`, and the UI decides how to show them. That is why the balance sim and the tests can play thousands of fights in seconds.

## Rounds and turn order

- Each round, the player and every living enemy are sorted by effective **Tempo**, highest first, with a tiny random jitter to break ties.
- **Ambush:** the player acts last in round 1.
- **Extra actions** (Le Rougarou's overclock) append extra turns at the end of the order.
- **Every third round**, each active bandmate steps in with their **assist** before anyone acts (see [band-and-second-line.md](band-and-second-line.md)).

### Start of a turn

In order:

1. The brace (`guard`) from last turn drops.
2. **Scorched** burns 6% of max Heart. It can kill.
3. **Encore** heals 8% of max Heart.
4. The player regains Funk from passives (Circular Breathing, Brother Moses).
5. Boss turn-start hooks run (Mr. Ledger's *Compound Interest*).
6. A **charged** move always releases now, ignoring every skip below.
7. Then the actor may lose the turn:
   - **Fermata**: always.
   - **Swooned**: always, then Swooned is removed.
   - **Off-Beat**: 50% chance; 25% against bosses.

### End of a turn

Statuses count down. A status applied or refreshed since the owner's last turn is *fresh* and skips one countdown. In practice:

- a debuff you inflict lasts `turns + 1` of the victim's turns;
- a self-buff lasts the rest of this turn plus `turns`.

*Until-triggered* statuses (Countermelody, Pitch Shield, Perfect Silence) never count down.

## Player actions

| Action | What it does |
|---|---|
| **RIFF** | The class's free attack. +2 Funk, +20 Groove, plus the timing grade's Groove. |
| **PLAY** | A class skill. Costs Funk; +10 Groove plus the timing Groove. Blocked by **Muted**. Some skills are once per battle. |
| **SOLO** | Needs 100 Groove and not Muted. Resets Groove to 0, then fires the class solo. |
| **VAMP** | Brace for half damage until your next turn, +15% max Funk, +10 Groove. The answer to telegraphed big hits. |
| **BAG** | Use a battle item. Its effects run like a skill aimed at you. |
| **SPLIT** | Flee. Chance 50% ± 2% per Tempo point over the enemies' average, clamped 25–90%. Never works against bosses or elites, or in no-flee fights. |
| **PLAY THE BLUES** | Final boss only, while it's behind Perfect Silence. See below. |

An illegal action (PLAY while Muted, not enough Funk, SOLO without Groove…) logs why **and still uses your turn**. The UI only offers legal actions.

## On the One (timing)

RIFF, SOLO and damaging skills get a timing grade, which multiplies **every hit** of the action:

| Grade | Damage | Groove bonus |
|---|---|---|
| ON THE ONE! | ×1.5 | +10 |
| IN THE POCKET | ×1.2 | 0 |
| LOOSE | ×1.0 | 0 |
| CLAMS | ×0.6 | 0 |

- **Manual rhythm.** A marker sweeps a track; tap when it crosses the target.
  - The ONE zone extends 6% of the track width either side of center, widened by gear and sheet music (`oneZone`), ×1.3 **In the Pocket**, ×0.6 **Quantized**.
  - The pocket zone is 2.3× the ONE zone's width; the loose zone is 4.2×.
  - The sweep takes 1200 ms, 20 ms faster per enemy level above 1, never under 880 ms.
  - No tap counts as CLAMS.
- **Auto rhythm** rolls 20% ONE, 50% pocket, 25% loose, 5% clams. Rivals, Session Clones and Vox's *Sample* use the same roll.

ON THE ONE also **shatters Isolde's Perfect Pitch Shield**.

## Damage

One hit, in order:

1. **Dodge.** 5% + 1% per point of Tempo the defender has over the attacker, clamped 0–25%, plus dodge bonuses, max 50%.
2. **Tone.**
   - Hits use the effect's tone, else the attacker's.
   - A tone bead (*Cayenne*, *Indigo*…) turns your next attack into its tone at +20%: every hit of it, on every target.
3. **Multipliers.**
   - The skill multiplier.
   - Gear tone bonuses (e.g. Subwoofer Ribcage, LOW +20%).
   - **Dirge**: +50% on your next damaging skill, every hit of it.
   - **Big Four**: Bass Drum, ×1.6 on beat 4.
   - **machine bonus**: Static's Scratch, ×2 vs machines.
4. **Weak / resist.** Hitting the target's weakness is ×1.5 and records the weakness in the Blue Book. Hitting its resistance is ×0.5, unless the effect ignores resistance.
5. **Timing grade**, then **crit**.
   - Crit chance: 5% + 0.4% per Mojo (capped at 35%), + gear and skill crit bonuses, +25% In the Pocket.
   - Crit damage ×1.75, or ×2.0 with Ghost Notes.
6. **Grit.** `damage = Chops × multipliers × 50 / (50 + Grit)`. Some skills ignore part of the target's Grit.
7. **Variance** ×0.9–1.1, then enemy difficulty scaling (Tourist ×0.75, Grand ×1.25).
8. **Defenses**, in order:
   - **Guard / Bell Wall**: take the guard fraction; Bell Wall reflects half the blocked amount.
   - **Countermelody**: ×0.7, then counter with HOT ×1.5.
   - **Pitch Shield**: ×0.25 for 3 hits unless ON THE ONE or a SOLO.
   - **Perfect Silence**: no damage at all.
9. **At least 1 damage**, rounded. Being hit gives the player +5 Groove; hitting a weakness gives +10.
10. **Drain** heals the attacker. Death checks run. Boss hit hooks fire (the half-Heart line and summons).

### Surviving a lethal hit (player)

- **Second Wind** (sheet music): once per battle, stay at 1 Heart.
- **Gris-Gris Bag** (carried item): once per battle, revive at 30% Heart. The bag is consumed.

## Effects

Every skill, boss move, assist and item is a list of effects. One resolver runs them all. Kinds (types in `src/core/types/effects.ts`):

| Kind | Does | Notable fields |
|---|---|---|
| `dmg` | Damage, one or more hits | `tone`, `mult` (number or function), `hits` (n or [min,max]), `target`, `sameTarget`, `status` rider, `recoil`, `drain`, `noDodge`, `ignoreGrit`, `ignoreResist`, `critBonus`, `forceBeat4`, `machineBonus` |
| `status` | Apply a status | `id`, `target`, `turns`, `chance`, `bossAlt` |
| `heal` | Restore Heart | `flat` or `pct`, `target` |
| `funk` | Restore Funk | `flat` or `pct` |
| `cleanse` | Remove debuffs | `only` |
| `strip` | Remove buffs (not Silence or Pitch Shield) | `count` |
| `guard` | Brace until next turn | `pct`, `reflect` |
| `groove` | Change the player's Groove | `amount` |
| `custom` | One-off mechanic via `run(c)` and `c.ops` | — |

Targets: `one` (chosen, falling back to the first living foe), `all`, `rand`, `self`, `player`, `ally`, `allies`.

## Statuses

| Status | Kind | Effect |
|---|---|---|
| Scorched | bad | −6% max Heart per turn |
| Shredded | bad | Grit −40% |
| The Blues | bad | Chops −30% |
| Off-Beat | bad | 50% chance to lose the turn (bosses 25%) |
| Swooned | bad | Skip next turn. Bosses are immune (skills may name a `bossAlt`). |
| Muted | bad | Can't PLAY or SOLO (player only; enemies ignore it) |
| Rattled | bad | Tempo −40% |
| Quantized | bad | Narrower ONE zone |
| Hyped | good | Chops +30% |
| Foundation | good | Grit +40% |
| Up-Tempo | good | Tempo +40% |
| In the Pocket | good | +25% crit, wider ONE zone |
| Encore | good | +8% max Heart per turn |
| Countermelody | good | Next hit −30% and counter (until triggered) |
| Pitch Shield | good | 3 hits at 25% unless ONE or SOLO |
| Perfect Silence | good | Immune to damage; only Play the Blues breaks it |
| Charging | good | Marker: a big move releases next turn (VAMP!) |

Your charm can shrug off debuffs (Saint Medal 50%, Haint-Blue Bottle 25%; the best charm wins).

## Groove, Funk, Heart

- **Groove** (0–100) fills from RIFF (+20), PLAY (+10), VAMP (+10), ON THE ONE (+10), being hit (+5) and hitting a weakness (+10). Pralines give +30. At 100, SOLO.
- **Funk** pays for skills. You regain it from RIFF (+2), VAMP (+15%), passives and items.
- **Heart** comes from the class base plus gear. Winning a fight restores 10% Heart and 20% Funk.

## Bosses

Each boss has a hand-written AI in `src/content/bosses/<id>.ts`, plus optional hooks:

- `onHalf`: once at half Heart.
- `onTurnStart`: every boss turn.
- `onHp`: after every hit.

Telegraphs come a turn early. At the end of a boss's turn it looks one move ahead (`planAhead`): if that move is telegraphed, the warning is logged then and the move is locked in, so you get a turn to answer it and the boss keeps its pace. An announced move happens as announced even if the boss would now pick something else (Isolde dropping under 40% Heart charges her Cadenza a turn later). Moves that `charge` also warn a turn ahead, so **VAMP** through them.

| Boss | Tells |
|---|---|
| Captain Hush | Baton every 4th turn, then Noise Cancel (Muted). Patrolman at half. |
| Vox Perfecta | Samples your last skill back at 70%; Perfect Pitch (Muted). Hyped at half. |
| Mr. Ledger | +8% Chops every turn. Kill fast. Repo Drone at 30%. |
| Le Rougarou Chromé | Howl (Muted) at most every 4 rounds. Two actions a round after half. |
| The Archivist | Summons Ghost Tracks, Erases buffs, Overdubs heals. |
| Isolde Vane | Pitch Shield every 3rd turn (shatter with ONE or SOLO); charged Cadenza below 40%. |
| The Conductor | Charged Crescendo (VAMP halves it), Fermata steals your turn, Tempo Lock at high Groove. |
| THE CLICK | Perfect Silence until you Play the Blues; Silence returns once at half. |

## Play the Blues

The finale's signature move: you play the six Blue Notes on six pads lit in time.

1. Each pad is scored by how close your tap is: perfect = 1, falling to 0 at 55% of a step away.
2. Accuracy is the average of the six.
3. The move shatters Perfect Silence.
4. Every second-line marcher strikes for 3% of the Click's max Heart.
5. Your note lands as FUNK ×2(1 + accuracy), counted ON THE ONE.

The first Blues of the phase is free. After that it costs 100 Groove.

## After the fight

These apply on a win (`resolveVictory`):

- **XP and Doubloons**, for each enemy:
  - XP 5 + 4 × level.
  - Doubloons (3 + 3 × level) × 0.75–1.25.
  - Bosses give ×10, elites ×2.5 XP and ×3 Doubloons, summons half.
  - Doubloons also scale with Mojo and Doubloon bonuses.
  - Stolen Doubloons come back.
- **Drops.** Quest items drop while the story needs them (`content/rules.ts` QUEST_DROPS). Then 3% King Cake, otherwise 18% for a common snack.
- **Story progress.** Steps with automatic progress (street wins, kills, items carried) advance (`content/story/acts.ts`).
- **Quest counters and bounties.**

Losing:

- **On the street:** wake at the club with full Heart, −20% Doubloons, and buffs gone.
- **A boss fight:** restores your pre-fight state so you can run it back.
