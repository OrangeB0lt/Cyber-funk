# Known issues

Behavior found in v1 during the 2.0 port. Per the parity-first rule (ADR-0003), each one was **ported as-is**; P6 fixes each in its own commit, with a test that fails first and a deliberate re-baseline of what it moves. Items marked *design call* need the project owner's decision because the "bug" may be intended. **Where** points into v1's source, which is in git history: `git show 555a9fd:legacy/src/05_engine.js`.

## Fixed by the new architecture

These go away by construction. Where the visible sequence changed, the transcript oracle allowlisted it until cutover; the baselines hold the new sequence.

| v1 behavior | Fixed by |
|---|---|
| Battle HP bars jump to their final values at the start of each event batch | Events carry post-event values; the view steps through them |
| Tapping a lexicon term or status chip during a confirm dialog orphans the dialog's promise | Prompts have ids; stale answers are ignored |
| Reloading during a boss's post-fight choice loses the choice and refights the boss | `ResumePoint` checkpoint before the post-boss scene |
| A scene that forgets to redraw its place leaves a dead Continue button | Places are routes; the Director returns to the route when a scene settles |
| `say()` with an unknown NPC id renders the raw id | `NpcId` union type: compile error |
| The title screen's settings object is the same object as the new save's settings | Settings copied, not aliased |
| `towerFight` is missing from `newState`, so old saves never back-fill it | `towerFloor` and `towerFight` are typed save fields; the v3 migration fills them |
| Reloading mid-Tower restarts the climb (resume goes through `goDistrict`, which zeroes `towerFloor`), though the Tower tutorial says a reload resumes at your floor | `Session.resume` keeps the climb (`gotoDistrict(…, { keepClimb: true })`); travel still resets it, as in v1 |
| The title-screen mute setting is ignored before a game exists | Audio reads the settings store, not the save |
| `[[Hush\|the Hush]]` links nothing (the glossary key is `the hush`) | `tools/completeness.ts` checks every `[[link]]`; this one is allowlisted there (`ALLOWED_UNLINKED`) until its P6 fix |
| Street events' `G.xp` doesn't wait for the level-up popup; other XP grants do | One `s.xp()`, always awaited (allowlisted deviation) |

## To fix (P6)

| Issue | Where (v1) | Kind |
|---|---|---|
| Auto-rhythm and the sim ignore *Quantized* and *In the Pocket*, which change the ONE zone only in the manual timing bar. | `05_engine.js:257`, `07_ui_combat.js:82` | design call |
| The `cleanse` effect always removes bad statuses; its documented `kind` field is ignored. | `05_engine.js:391` | cleanup |
| *Cayenne*-style next-tone boosts and Dirge's +50% apply only to the first hit of multi-hit or all-target skills. | `05_engine.js:272-274` | design call |
| Boss telegraphs are logged on the same turn as the move (only `charge` moves give a real warning). | `05_engine.js:457` | design call |
| Play the Blues is always timed, even with auto rhythm (auto rhythm covers only the On the One bar), so players who can't tap in time can't land the Click's shield break well. Found in the P3 accessibility pass. | `07_ui_combat.js` (v2: `battleController.ts`) | design call |
| Fixed prices (Ð30, Ð80, Ð150…) bypass the district/roots price modifier. | `08_world.js` | design call |
| Climbing again after beating the Conductor (walk away from the Click, leave, come back) sets the story back to `face_conductor`, refights him (floor 3 never reads `boss_conductor`) and repeats the +50% rally (`towerRested2` is never read). Should leaving the Tower restart the climb at all? | `09_story.js:251-260`, `08_world.js:35` | design call |
| The second line is fixed when it forms: anyone recruited, or any quest finished, afterwards never joins. | `09_story.js:204` | design call |
| The credits' New Game+ button always says "enemies +30%" (the confirm shows the real number), and the confirm doesn't say half your Doubloons go. | `09_story.js:302,304` | text |
| Quest description drift: *Lost Eye* says "on the streets" but it's a scripted fight at the square. | `04_data_world.js` | text |
| Dead fields and flags: `BOSSES.drop`, `PLACES.kind`, `QUESTS.giver`, `BANDMATES.passiveId`, `BLUE_NOTES.degree`, `pralineLady`, `lastRest`, `playTime`, `flags.boudinGiven`, `flags.towerRested2`, item `pralinelady_king`. | various | cleanup |

## Fixed in P6

Each fix landed in its own commit with a test that failed first; the commit names any baseline it moved.

| Issue | Fix | Test |
|---|---|---|
| Seeded fights differ across JS engines: the turn-order sort uses a random comparator, and V8 and JavaScriptCore sort differently. Fix with per-actor jitter, then re-baseline the sim. | Each actor draws its jitter once, before the sort; the comparator is pure | `tools/engine/properties.test.ts`: "doesn't depend on the JavaScript engine's sort algorithm" |
| **An assist helper's death ends the battle as a loss.** A bandmate assist is a 1-HP `side:'player'` actor; if its hit gets countered (for example by a Countermelody the Archive Drone recorded from you), `checkDeath` runs the *player* death path. Reproduced: 170 of 200 trials in that setup. | `checkDeath` lets an assist helper leave; the battle goes on | `src/engine/combat/combat.test.ts`: "a bandmate's assist that gets countered and cut doesn't end the battle" |
| Second Line Smoke escapes boss fights; its description says "non-boss". | Items with `escape` are refused, keeping the item and the turn, in boss and no-flee fights | `src/engine/combat/combat.test.ts`: "Second Line Smoke is refused in a boss fight, keeping the item and the turn" |
| Tripping the 200-iteration loop guard in `runUntilPlayer` counts as a loss in the UI. | `callOff`: the fight ends as `fled` with `stalled` set and its own line; no defeat penalty | `src/engine/combat/combat.test.ts`: "a fight that never reaches the player's turn is called off, not lost" |
| Spar promises "half the Doubloons" but pays normally. | `battleRewards` pays `SPAR_DOUBLOON_RATE` (half) in spar fights, so the victory screen shows it | `src/engine/combat/combat.test.ts`: "a spar pays half the Doubloons of the same fight on the street, and the same XP" |
| The broadcaster's "smash" path advances the story step even if you flee, and records no flag. | Fleeing the squad leaves the broadcaster standing (the Hush repair it); the story waits for a win | `tests/integration/scenes.test.ts`: "fleeing the Hush squad after smashing the broadcaster leaves it standing" |
| NG+ re-grants story gear (`thr_regalia`, `ch_fang`), creating duplicates, and resets `legendBuilt`, so Ti-Jacques builds a second legendary instrument. | `s.gainGear` skips gear already owned (still equips); Ti-Jacques also checks the bag for the legendary | `tests/integration/scenes.test.ts`: "New Game+ doesn't hand out story gear you already own", "…doesn't offer a second legendary instrument" |
| `flags.endingCount` resets every NG+, so it is always 1. | `newGamePlus` carries `counters.endingCount`; every other counter starts over | `src/engine/state.test.ts`: "keeps the count of endings reached, and resets the other counters" |
| `towerFight` survives travel and waking at the club, so after a defeat on a floor's second fight the next climb starts the Lobby at its second fight. | Travel and a cut reset the floor and the fight together | `src/app/session.test.ts`: "travel restarts the climb: the floor and the fight both reset", "getting cut in the Tower ends the climb" |
