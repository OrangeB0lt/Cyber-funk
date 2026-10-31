# Known issues

Behavior found in v1 during the 2.0 port. Per the parity-first rule (ADR-0003), each one is **ported as-is** and fixed afterwards in its own commit with a test. Items marked *design call* need the project owner's decision because the "bug" may be intended.

## Fixed by the new architecture

These go away by construction. Where the visible sequence changes, the change is listed in the transcript-oracle allowlist.

| v1 behavior | Fixed by |
|---|---|
| Battle HP bars jump to their final values at the start of each event batch | Events carry post-event values; the view steps through them |
| Tapping a lexicon term or status chip during a confirm dialog orphans the dialog's promise | Prompts have ids; stale answers are ignored |
| Reloading during a boss's post-fight choice loses the choice and refights the boss | `ResumePoint` checkpoint before the post-boss scene |
| A scene that forgets to redraw its place leaves a dead Continue button | Places are routes; the Director returns to the route when a scene settles |
| `say()` with an unknown NPC id renders the raw id | `NpcId` union type: compile error |
| The title screen's settings object is the same object as the new save's settings | Settings copied, not aliased |
| `towerFight` is missing from `newState`, so old saves never back-fill it | One typed `ResumePoint` |
| The title-screen mute setting is ignored before a game exists | Audio reads the settings store, not the save |
| `[[Hush\|the Hush]]` links nothing (the glossary key is `the hush`) | Content validator checks every `[[link]]` |
| Street events' `G.xp` doesn't wait for the level-up popup; other XP grants do | One `s.xp()`, always awaited (allowlisted deviation) |

## To fix after parity

| Issue | Where (legacy) | Kind |
|---|---|---|
| **An assist helper's death ends the battle as a loss.** A bandmate assist is a 1-HP `side:'player'` actor; if its hit gets countered (for example by a Countermelody the Archive Drone recorded from you), `checkDeath` runs the *player* death path. Reproduced: 170 of 200 trials in that setup. | `05_engine.js:424`, `319-326` | bug |
| Second Line Smoke escapes boss fights; its description says "non-boss". | `03_data_items.js:22`, `05_engine.js:514` | bug |
| Tripping the 200-iteration loop guard in `runUntilPlayer` counts as a loss in the UI. | `05_engine.js:464`, `07_ui_combat.js:189` | bug |
| Seeded fights differ across JS engines: the turn-order sort uses a random comparator, and V8 and JavaScriptCore sort differently. Fix with per-actor jitter, then re-baseline the sim. | `05_engine.js:410` | determinism |
| Auto-rhythm and the sim ignore *Quantized* and *In the Pocket*, which change the ONE zone only in the manual timing bar. | `05_engine.js:257`, `07_ui_combat.js:82` | design call |
| The `cleanse` effect always removes bad statuses; its documented `kind` field is ignored. | `05_engine.js:391` | cleanup |
| *Cayenne*-style next-tone boosts and Dirge's +50% apply only to the first hit of multi-hit or all-target skills. | `05_engine.js:272-274` | design call |
| Boss telegraphs are logged on the same turn as the move (only `charge` moves give a real warning). | `05_engine.js:457` | design call |
| Spar promises "half the Doubloons" but pays normally. | `08_world.js:203` | bug |
| NG+ re-grants story gear (`thr_regalia`, `ch_fang`), creating duplicates. | `09_story.js` | bug |
| `flags.endingCount` resets every NG+, so it is always 1. | `09_story.js:309` | bug |
| The broadcaster's "smash" path advances the story step even if you flee, and records no flag. | `09_story.js:172` | bug |
| Fixed prices (Ð30, Ð80, Ð150…) bypass the district/roots price modifier. | `08_world.js` | design call |
| Quest description drift: *Lost Eye* says "on the streets" but it's a scripted fight at the square. | `04_data_world.js` | text |
| Dead fields and flags: `BOSSES.drop`, `PLACES.kind`, `QUESTS.giver`, `BANDMATES.passiveId`, `BLUE_NOTES.degree`, `pralineLady`, `lastRest`, `playTime`, `flags.boudinGiven`, `flags.towerRested2`, item `pralinelady_king`. | various | cleanup |
