# Extension points

*The seams built for extending the game, and for each one, the files that change together. When something here is "enforced", the compiler or a test tells you what's left; when it isn't, the list below is the only reminder. Adding ordinary content (an enemy, an item, a place) isn't an extension, it's data: see [adding content](../guides/adding-content.md).*

| Seam | Contract | Implemented in | Process |
|---|---|---|---|
| [Effect kinds and `EffectOps`](#effect-kinds-and-effectops) | `src/core/types/effects.ts` | `src/engine/combat/resolve.ts` | Normal review, second reviewer for `core/` types |
| [SceneContext members](#scenecontext-members) | `src/narrative/types.ts` | `src/app/sceneContext.ts` | An ADR-0004 amendment |
| [Presenters](#presenters) | `Presenter` in `src/narrative/types.ts` | `ReactPresenter`, `ScriptedPresenter` | An ADR-0004 amendment for new methods |
| [Screens, sheets and popups](#screens-sheets-and-popups) | `src/app/view.ts` | `src/ui/` | Normal review |
| [Save format](#save-format) | `GameState` in `src/core/types/state.ts` | `src/app/save/format.ts` | A migration; never edit a shipped one |
| [Server protocol and routes](#server-protocol-and-routes) | `src/app/save/protocol.ts` | `server/routes/`, `server/repo/` | A generated SQL migration for schema changes |
| [Content registries](#content-registries) | `src/content/index.ts` and friends | `*.scene.ts` files | Normal review |
| [Sprite families](#sprite-families) | `src/core/ids/sprites.ts`, `src/core/types/sprites.ts` | `src/content/sprites/` | Normal review |
| [The balance sim](#the-balance-sim) | `tools/sim.ts` | | Re-baseline on purpose |

## Effect kinds and `EffectOps`

Every skill, boss move, assist and item is a list of effects, resolved in order by `resolveSkill` in [`src/engine/combat/resolve.ts`](../../src/engine/combat/resolve.ts). Content reaches engine capabilities only through `EffectOps`, which [`src/core/types/effects.ts`](../../src/core/types/effects.ts) declares and the engine implements, so content never imports the engine.

**A new `EffectOps` method** (content needs the engine to do something new: summon, steal, charge a move):
1. Add the method to `EffectOps` with a doc comment saying what it does and for whom.
2. Implement it in `makeOps` (`resolve.ts`). The compiler enforces this: `makeOps` returns an `EffectOps`.
3. Call it from content: `{ kind: 'custom', run: c => c.ops.yourMethod(…) }`, or `ops` in a boss's `ai`/`onHalf` hooks.
4. Add a unit test for the mechanic in the engine.

**A new effect kind** (a mechanic more than one skill needs):
1. Add its interface, with TSDoc on every field, and add it to the `Effect` union in `effects.ts`.
2. Add a branch to the `if … else if` chain in `resolveSkill`. **Not enforced:** the chain has no exhaustiveness check, so a kind without a branch compiles and silently does nothing.
3. If it needs a target, teach `legalActions` (`src/engine/combat/legal.ts`). If the sim's player should value it, teach `chooseAction` in `tools/sim.ts`.
4. Use it in at least one skill or item, so combat coverage (`src/engine/combat/coverage.test.ts`) reaches it.
5. If the kind's name collides with a content id, add it to `MECHANIC_WORDS` in `tools/validate-content.test.ts`, the list of engine words allowed to look like content ids.

**A status with its own mechanic** (beyond a stat `mod`): a row in `src/content/combat/statuses.ts`, the hook in the engine (grep `scorched` in `src/engine/` for examples), and its id in `MECHANIC_STATUSES` in `resolve.ts`. Engine code may name status ids; it may never name an enemy, item, place or skill id (a test fails if one sneaks in).

**A passive bonus** (sheet music, bandmates): a field on `PassiveMods` (`src/core/types/content.ts`) and its handling in the engine. `activePassives` collects them; stat bonuses are applied in `derivedStats` (`src/engine/stats.ts`), battle effects in `makePlayerActor` (`src/engine/combat/actors.ts`) and the hook that uses them. Grep an existing field such as `funkRegen` to see the path.

Any of these that changes combat numbers moves the sim baseline. Deeper: [core and engine](../architecture/core-and-engine.md#how-content-talks-to-the-engine).

## SceneContext members

`SceneContext` is the only API story code uses. It was frozen when [ADR-0004](../adr/0004-scene-api.md) was accepted, and every change since goes through an amendment, as P4's four finale members did.

1. **Amend ADR-0004.** Add a dated "Amended" line to its status and a section saying what the member is for, why existing members can't do it, and why it's generic rather than specific to one scene. Get a second reviewer.
2. **Declare it** on `SceneContext` in [`src/narrative/types.ts`](../../src/narrative/types.ts), with a doc comment (ESLint requires one on everything in `narrative/`).
3. **Implement it** in `createSceneContext` ([`src/app/sceneContext.ts`](../../src/app/sceneContext.ts)). If it needs more of the session than `SessionPort` ([`src/app/sessionPort.ts`](../../src/app/sessionPort.ts)) exposes, add it there. That interface exists because `Session` imports `sceneContext.ts`, so importing `Session` back would make a cycle.
4. **If it shows something,** add a `Presenter` method too ([below](#presenters)).
5. **Document it** in [writing scenes](../guides/writing-scenes.md) and the member table in [narrative runtime](../architecture/narrative-runtime.md#scenecontext).
6. Run `npm run docs:codemap`: `SceneContext` is one of the interfaces the code map tracks member by member.

**A new interrupt kind** (a scene ending some other way than a street loss): add it to `SceneInterrupt['kind']`, and the `onInterrupt` record in the `Session` constructor stops compiling until you give it a handler.

## Presenters

`Presenter` (with `BattlePresenter`) in [`src/narrative/types.ts`](../../src/narrative/types.ts) is everything scenes and battles need from a screen. Every method that waits for the player takes an `AbortSignal`, so going back to the title can cancel it.

| Implementation | File | How it answers |
|---|---|---|
| `ReactPresenter` | [`src/app/reactPresenter.ts`](../../src/app/reactPresenter.ts) | Writes serializable data into the view store, keeps the pending promise in a private map keyed by an id, and resolves it when a `GameApp` command answers that id |
| `ScriptedPresenter` | [`src/app/testing/scriptedPresenter.ts`](../../src/app/testing/scriptedPresenter.ts) | Answers instantly from a policy and records a transcript |

**A new presenter method:**
1. Add it to `Presenter` with a doc comment (an ADR-0004 amendment, as above).
2. `ReactPresenter`: write what React needs into `ViewState` (`src/app/view.ts`), render it in `src/ui/`, and add the `GameApp` command that answers it.
3. `ScriptedPresenter`: a default answer, a policy hook if tests need to steer it, and a `TranscriptEntry` if tests should see it.
4. If the transcript baseline should record it, add it to `tsTranscript` in `tests/integration/support/transcriptCases.ts` and re-baseline. Otherwise the baseline ignores it.

Both classes `implements Presenter`, so the compiler lists whichever is missing the method. A third presenter (a command-line player, a replay recorder) only has to implement the interface and be passed to `new Session({ presenter, storage })`.

**A new battle animation:** a variant of `BattleEvent` (`src/core/types/battle.ts`), emitted by the engine, and a case in `ReactPresenter.applyEvent`. **A new sound:** a `SoundCue` variant, its synth in `src/app/audio/sfx.ts`, and a branch in `ReactPresenter.sound` (an `if` chain, so not enforced).

## Screens, sheets and popups

The full recipe is [UI → Adding a screen, sheet or popup](../architecture/ui.md#adding-a-screen-sheet-or-popup). In short:

| Adding | Change together |
|---|---|
| A sheet | A `SheetView` variant in `src/app/view.ts`, a component in `src/ui/sheets/`, a `case` in `SheetLayer`. To open it from a scene, a `SheetRequest` variant too, which changes the scene API |
| A screen | `Screen` in `view.ts`, an `XScreen` and `XActions` pair, cases in `App.tsx` and `layers/ActionBar.tsx` (TypeScript flags the missing ones) |
| A popup | A `Popup` variant, its rendering in `PopupLayer`, answered with `app.answerPopup(id, value)` |
| A setting | `Settings` in `src/core/types/state.ts`, `defaultSettings` (`src/engine/state.ts`), the `settings` schema in `format.ts` with a save migration, and its row in `ROWS` (`src/ui/sheets/SettingsSheet.tsx`; the compiler requires one) |

Every new control gets a `data-testid` built from content ids or keys, never labels. Every new screen or sheet goes into an e2e spec with `expectNoOverflow` and `expectAccessible`.

## Save format

The save is `GameState`, validated by `gameStateSchema` everywhere it's read: on load, on import, and on the server for every upload. The full procedure is [state and saves → Changing the save format](../architecture/state-and-saves.md#changing-the-save-format):

1. The field on `GameState`, with a doc comment.
2. Its initial value in `newGame` (`src/engine/state.ts`), and in `newGamePlus` if New Game+ should carry it.
3. The schema in `src/app/save/format.ts`. A compile-time check fails if `GameState` has a field the schema doesn't.
4. If old saves need a value: bump `SAVE_VERSION` and add a step to `MIGRATIONS`, keyed by the version it upgrades *from*.
5. The round trip in `src/app/save/format.test.ts`, and `npm run test:server`.

The schema derives its enums from the `core/ids` lists, so adding an id needs no migration, but **renaming or removing one does** (a story step, an item): old saves holding it would fail as `invalid`. Never edit a migration that has shipped; saves on phones and on the server depend on it.

## Server protocol and routes

The client and the server share exactly two files: `src/app/save/format.ts` and `src/app/save/protocol.ts`. Both may import only `core` and Zod, so they run in both places. The design and the current routes are in [server and cloud saves](../architecture/server.md); the reasons in [ADR-0006](../adr/0006-server-and-cloud-saves.md).

**A new route or a change to one:**
1. The request and response schemas in `protocol.ts`.
2. The client: a method on `CloudClient` and its implementation in `CloudApi` (`src/app/save/cloud.ts`). The fake in `src/app/save/sync.test.ts` implements `CloudClient` too, so the compiler flags it. Use it from `CloudSync` (`sync.ts`) if sync needs it.
3. The server: the handler in `server/routes/` (parse with the shared schema; `authed` for anything but health and player creation), the rule in `server/repo/saves.ts` inside a transaction, and registration in `buildApp` (`server/app.ts`).
4. Tests: `server/app.test.ts` with `app.inject`, and `server/sync.test.ts`, which runs the browser's sync engine against the real server.
5. The API table in [server.md](../architecture/server.md#api).

Keep every route under `/api`: the service worker excludes that prefix from its cache and its navigation fallback ([`vite.config.ts`](../../vite.config.ts)).

**A database change:** edit `server/db/schema.ts`, run `npm run db:generate`, review and commit the SQL it writes to `server/db/migrations/`. The server applies pending migrations at startup. Never edit a shipped migration.

## Content registries

These records tie content to the runtime. The total ones are enforced by the compiler; the rest by tests.

| Registry | Where | Enforced by |
|---|---|---|
| `PLACE_SCENES` | `src/content/index.ts` | The compiler (total over `PlaceId`), then the crawler and `tools/completeness.ts` |
| `BOSS_SCENES` | `src/content/index.ts` | The compiler (total over `BossId`) |
| `ARRIVALS` | `src/content/world/arrivals.scene.ts` | The compiler (total over every district but Tremé) |
| `ACTS` (journal, hints, automatic progress) | `src/content/story/acts.ts` | The compiler (total over every act and step) |
| `NPC_SPRITE` | `src/content/sprites/refs.ts` | The compiler (total over `NpcId`) |
| `STREET_EVENTS` | `src/content/world/streetEvents.scene.ts` | The crawler, and the transcript baseline (a case per option). Order matters: append |
| `SECOND_LINE` | `src/content/band/secondLine.ts` | The validator (no duplicate ids). Order is the marching order |
| `TOWER_FLOORS` | `src/content/world/tower.ts` | The playthrough climbs it. `towerFloor` in the save indexes it, so reordering floors needs a save migration |
| `CHOICE_BOSSES` | `tests/integration/playthrough.test.ts` | Nothing. Add a boss's choice keys by hand, or the playthrough plays only one branch |

The dev menu's jumps (`src/app/devStates.ts`) read `ACT_ORDER`, `ACTS`, the district rows, `PLACES` and `BOSSES`, so they pick up ordinary new acts and bosses without edits. A boss jump finds its story step through the step whose `hintPlace` is the boss's place, and falls back to the act's last step. Two things are hard-coded: `setupAct` frees Gus from the sixth act on (by index, so inserting an earlier act shifts it), and the Tower's two bosses are special-cased in `GameApp.dev.boss` and `towerBossSetup`.

## Sprite families

Art is data: each row is a 24×24 grid (32×32 for bosses) or a variant of another sprite ([ADR-0007](../adr/0007-character-sprites.md)).

- **Ids.** An opponent's id is its sprite id. Heroes and Session Clones are template ids (`hero_<class>`, `clone_<class>`), and everyone else is in `PERSON_SPRITE_IDS` (`src/core/ids/sprites.ts`).
- **Families.** Each file in `src/content/sprites/art/` holds one family: a district's cast, heroes, people, shopkeepers or rivals. A new family file must be spread into `SPRITES` in `src/content/sprites/table.ts`, which is a full table over `SpriteId`. The clone rows are generated there from the heroes.
- **Effects.** `fx` (`ghost`, `holo`, `glitch`) is typed in `src/core/types/sprites.ts` and drawn by CSS in `src/ui/components/Sprite.module.css`. A new effect needs both, plus a static look for reduced motion.
- **The palette** (`src/content/sprites/palette.ts`) must equal the table in [character-design.md](../vision/character-design.md), and the validator checks that, along with a card per sprite.

## The balance sim

[`tools/sim.ts`](../../tools/sim.ts) plays every class against every district's streets and every boss with a scripted player. `runSim(seed)` returns the text table and rows (`--json`).

| Part | What it decides |
|---|---|
| `loadout(s, L)` | The gear a player owns at level L |
| `chooseAction` | The scripted player: heals when low, braces for telegraphs, uses tone beads, SOLOs when ready |
| The boss loop | Every boss in `BOSSES`; bosses with `bluesTarget` (the Click) go through `runClick` instead. A boss that needs special setup needs a branch like it |
| `BASELINE_SEEDS` | The seeds `tests/fixtures/sim/` holds (`tools/simBaseline.ts`) |

What changes together:
- `tools/trace.ts` reuses `loadout`, `chooseAction` and the timing helpers, so a change there shows up in traces too.
- The balance-check script (`.claude/skills/balance-check/compare.js`) parses the sim's **text** output with regular expressions. Changing the output format means updating it.
- Changing the sim's player or loadouts moves the baseline without changing the game. Say which it was in the commit message, and re-baseline with `npm run sim:baseline`.

Deeper: [balancing](../guides/balancing.md).
