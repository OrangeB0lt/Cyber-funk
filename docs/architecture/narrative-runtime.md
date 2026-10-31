# Narrative runtime

*How a story scene runs: from a tap on a place option, through narration, choices and fights, and back to the place. Status: the API is a **draft** until the vertical-slice playtest, after which it freezes as SceneContext v1 (ADR-0004).*

Code: [`src/narrative/`](../../src/narrative/) (interfaces, the Director, authoring helpers) and [`src/app/`](../../src/app/) (the implementations).

## The pieces

```
 ui/ (React)            app/                                   narrative/            content/
 ───────────            ────                                   ──────────            ────────
 tap "opt:talk" ──▶ GameApp.chooseOption ──▶ Session.chooseOption ──▶ Director.run(scene) ──▶ scene(s)
                                                │                       │                    │
                                                │                makeContext(signal)         │ await s.narrate(…)
                                                │                       ▼                    │ await s.choose({…})
                                                │              createSceneContext ◀──────────┘ await s.fight({…})
                                                │                       │
                                                ▼                       ▼
                                          Valtio store            Presenter (ReactPresenter | ScriptedPresenter)
                                          (the save)                    │
                                                ▲                       ▼
 renders snapshots ◀────────────────────────────┴────────────── view store (screen, lines, prompt, battle…)
```

| Piece | Where | Job |
|---|---|---|
| **Scene** | `narrative/types.ts` | `(s: SceneContext) => Promise<void>`. A script: narrate, choose, fight, give items. The only code story authors write. |
| **SceneContext** | interface in `narrative/types.ts`, implementation in `app/sceneContext.ts` | The scene API. Every helper matches v1's behavior (toasts, autosaves, level-ups). |
| **Director** | `narrative/director.ts` | Runs one scene at a time; cancels, catches interrupts and errors, and returns to the route when done. |
| **Session** | `app/session.ts` | The live game: the save proxy, the random streams, the Director, the current route, the navigation commands. No React. |
| **Presenter** | interface in `narrative/types.ts` | How scenes and battles are shown. `ReactPresenter` (browser) and `ScriptedPresenter` (tests) implement it. |
| **BattleController** | `app/battleController.ts` | One battle: the engine's pull loop wired to `Presenter.battle`. |
| **GameApp** | `app/game.ts` | The browser wrapper: one Session, the view store, the React presenter, the synth, and every command the UI calls. |

## Routes, not hub scenes

Between scenes the player is on a **route**: the district screen or a place screen (`Route` in `narrative/types.ts`). A route is plain state on the Session, not a running scene.

- **Entering a place** (`Session.enterPlace`) sets the route and shows it. No scene runs.
- **Tapping a place option** looks up the option by key in the place's `PlaceScenes.options(g, helpers)` and runs its `run` scene.
- **When any scene settles** (finished, interrupted, failed or aborted) the Director calls `onSettled`, which shows the current route. A scene can't leave the player on a dead screen.
- **A scene that moves the player** sets the route: `s.goto(district)` (travel, with autosave and first-visit narration) or `s.returnTo(route)`.

v1 ended every handler with `await enterPlace(...)` (76 call sites) and a forgotten one stranded the player. That bug can't happen here.

Place options are computed from the game state every time the place is shown, through `definePlace(id, { intro?, options })`. Content can't import the engine, so `options` gets a small `PlaceHelpers` (`price`, `is`, `reached`) for the rules it needs.

## The Director

```ts
director.run(scene, { name })  // → Promise<RunResult>
director.abort(reason)         // cancel the running scene and wait for it to unwind
```

- **Single flight.** While a scene runs, `run` returns `{ status: 'busy' }` without starting anything, so a double tap can't start two scenes. The view's `busy` flag hides the district and place action bars while a scene runs.
- **Cancellation.** Each run gets an `AbortController`. `Session.quit()` (back to title) and save import abort the running scene. Every presenter wait takes the signal and rejects with an `AbortError`, so the scene's `await` throws and the scene unwinds. v1 left those promises dangling forever.
- **Interrupts.** A scene, or the battle controller inside it, can throw `new SceneInterrupt('cut')`. The Director runs the handler scene in the same flight: for `cut` (lost a street fight) the Session moves you to the club and plays `wakeUpAtClub`.
- **Errors.** Anything else thrown goes to `onError`. The Session logs it, shows the "something broke" toast, and sends the player to the district. The game never freezes on a bug in one scene.
- **Settling.** `onSettled` shows the route. `RunResult` says how it ended: `done`, `busy`, `aborted`, `interrupted` or `failed`.

## SceneContext

The full API, with a doc comment on every member, is the `SceneContext` interface in [`narrative/types.ts`](../../src/narrative/types.ts). The cookbook is [writing-scenes.md](../guides/writing-scenes.md). In short:

| Group | Members |
|---|---|
| Showing | `title`, `narrate`, `say(npcId, …)`, `speak(name, color, …)`, `choose({ key: label })`, `confirm`, `toast`, `sheet`, `wait` |
| Moving | `goto(district)`, `returnTo(route)` |
| Inventory and money | `give`, `take`, `count`, `gold`, `keyItem`, `gainGear`, `recruit`, `giveNote` |
| Character | `xp` (awaits level-up popups), `heal`, `funk`, `rest`, `check(stat, base)`, `permStat`, `nextFight`, `bookHint`, `scaleXp`, `scaleGold` |
| Story state | `flags.has/set`, `story.is/reached/set`, `quest/setQuest`, `counter`, `choice` |
| Fights | `fight(spec)` → `'win' \| 'fled'`, `boss(id)` → `'win' \| 'lose'` |
| Other | `game` (the live save), `rng` (the seeded stream), `signal`, `save` |

Design rules:

- **Choices are keyed.** `choose({ spare: 'Spare him.', finish: 'Finish him.' })` resolves to `'spare' | 'finish'`. The buttons get `data-testid="choice:spare"`. Rewording or reordering options doesn't change behavior or break tests. An option can be `{ label, when?, hint?, silent? }`: `when: false` hides it, `hint` highlights it, `silent` skips echoing the label as the player's line.
- **Ids are typed.** `say('mamaroux', …)`, `give('gumbo')` and `flags.set('metRoux')` only accept ids that exist, so a typo doesn't compile.
- **Randomness comes from `s.rng`.** It's the game's seeded stream and is saved with the game. ESLint bans `Math.random` in content.
- **Losing never returns.** `fight()` resolves on a win or an escape. A street loss throws `SceneInterrupt('cut')`, and the code after `await s.fight(...)` never runs, as in v1.
- **`boss(id)` is the whole sequence:** the pre-scene (first time only) or "you go back in", an autosave, the fight (a loss offers *Run it back*, which restores your pre-fight state and retries), then on a win the post-scene, the next act and district unlock, and an autosave.

## Presenters

The `Presenter` interface is everything a scene or battle needs from the screen: `story`, `line`, `choose`, `confirm`, `sheet`, `levelUps`, `toast`, `sound`, `wait`, `route`, and a `battle` sub-interface (`open`, `play`, `intent`, `timing`, `timingResult`, `autoTiming`, `blues`, `victory`, `defeat`, `close`).

Every method that waits for the player takes an `AbortSignal`.

### ReactPresenter (`app/reactPresenter.ts`)

It writes **data** into the view store (`app/view.ts`), which React renders, and keeps the promises scenes are waiting on in a private map keyed by numeric ids:

1. `line()` appends a `StoryLine`, sets `prompt = { id, kind: 'continue' }`, and returns a promise stored under `id`.
2. The player taps Continue and the UI calls `app.advance()`. If the typewriter is still running, the tap finishes it; otherwise `answer(id)` resolves the promise.
3. Answers with a stale id are ignored. A late tap from a previous prompt can't answer the current one; v1 had a bug where a lexicon tap overwrote a pending confirm.

The view holds only serializable data. React never sees a promise or a callback in state.

Battle playback (`battle.play`) applies each `BattleEvent` to the battle view one at a time (Heart bars, floats, log lines, shake and flash) with v1's pacing. The pacing is scaled by reduce-motion and by `turbo`, which tests set to near zero.

### ScriptedPresenter (`app/testing/scriptedPresenter.ts`)

It answers everything from a **policy** (`choose`, `intent`, `timing`, `confirm`, `sheet`, `defeat`…) and records a transcript (lines, choices, toasts, sheets, fights). It lets the prologue, Tremé, Captain Hush and the Vox choice play headlessly in Vitest in milliseconds (`tests/integration/slice.test.ts`), and it powers the transcript parity oracle against v1.

## Battles

`fight()` and `boss()` call `runBattle(session, spec, signal, opts)` in `app/battleController.ts`, which runs v1's loop:

```
createBattle → presenter.battle.open
loop:
  runUntilPlayer(b)                 engine: enemies and allies act until it's the player's turn
  presenter.battle.play(events)     animate what happened
  if over → break
  intent = presenter.battle.intent(b)          the player picks RIFF / PLAY / SOLO / VAMP / BAG / SPLIT / BLUES
  timing:  manual → presenter.battle.timing(spec) → gradeTiming → timingResult
           auto   → rollAutoTiming(b.rng)       → autoTiming
           blues  → presenter.battle.blues()    → scoreBlues
  announceTiming(b, grade)                     the "ON THE ONE!" log line (UI-only in v1, so outside the engine call)
  playerAction(b, intent, grade)
  presenter.battle.play(events)
aftermath: resolveVictory / escape / applyStreetDefeat or restoreSnapshot
```

The engine never waits on the UI. It produces events and the controller pulls. `tools/sim.ts` uses the same engine without any presenter.

## Saves and checkpoints

The Session saves at explicit moments, never on a store subscription: entering a district (`goto`), before and after a boss, after every battle, on a manual save, and when a setting changes. Mid-scene state that must survive a reload is a `ResumePoint` on the save (`game.resume`). See [state-and-saves.md](state-and-saves.md).

## Extending the runtime

- **A new scene capability** (say, a minigame): add a member to `SceneContext` with a doc comment, implement it in `app/sceneContext.ts`, and add the presenter method to `Presenter`, `ReactPresenter` and `ScriptedPresenter`. The compiler lists every place left to update.
- **A new interrupt kind** (say, `'arrested'`): add it to `SceneInterrupt['kind']`. The `DirectorConfig.onInterrupt` record then fails to compile until you give it a handler.
- **A new authoring format** (Ink, say): compile it to `Scene` functions. Nothing below `narrative/` needs to change.
