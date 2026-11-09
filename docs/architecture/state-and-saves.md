# State and saves

*What persists, how it is saved, loaded and resumed, and how to change the format safely. Code: [`src/core/types/state.ts`](../../src/core/types/state.ts) and [`src/app/save/`](../../src/app/save/). Cloud sync and the server: [server.md](server.md).*

## GameState

`GameState` (in `core/types/state.ts`) is everything that persists, and every field has a doc comment. Some highlights for anyone coming from v1:

| v1 | v2 |
|---|---|
| `S.main = { act, step: 2 }` (index) | `story: { act: 'treme', step: 'congo_square' }` (named, typed per act) |
| `S.flags['boss_' + id]` | `bossesDefeated: BossId[]` |
| `S.flags['bosspre_' + id]` | `bossIntros: BossId[]` |
| `S.flags['intro_' + d]` | `districtIntros: DistrictId[]` |
| `S.flags.vox = 'redeemed'` | `choices.vox` (typed values) |
| other `S.flags.*` | `flags: Partial<Record<FlagId, true>>`, each flag documented in `core/ids/flags.ts` |
| `S.pendingBattle` | `resume: ResumePoint \| null` |

At runtime the save is a Valtio proxy (`session.store.game`). The engine and scene helpers mutate it; React renders frozen snapshots of it.

## When the game saves

Only at explicit checkpoints, never on every change. A subscription would save mid-battle states that can't be resumed. The checkpoints:

- entering a district (`s.goto`)
- before a boss fight; on a boss win (the `afterBoss` checkpoint); after its post-fight scene, once the next act opens
- at every Tower floor and fight, and the Studio Floor's vending machine (manual)
- after the ending's XP, and the new New Game+ save
- after every battle (win, escape, or a street loss)
- a manual save (Menu → Save)
- changing a setting

## The envelope

```json
{ "format": "cyberfunk", "version": 3, "savedAt": "2026-10-31T00:00:00.000Z", "rng": { "s": 123456, "draws": 812 }, "game": { … } }
```

- It's stored per slot under `localStorage['cyberfunk_save_v2:<slot>']` (slots 1–3). v1's key is ignored and left alone (decision: fresh start, no migration).
- `rng` is the game's random-stream state, so a reload continues the same seeded sequence.
- **Loading validates with Zod** (`gameStateSchema`). A corrupt, invalid or too-new save is refused with a reason (`LoadError`: `empty`, `corrupt`, `too-new` or `invalid`), not half-loaded. "Too new" matters for a PWA, where an old cached build could meet a save written by a newer one.
- **Export codes** are `CF2:` + base64 of the envelope (Settings → Export Save). Import goes through the same validation. Bug reports should include one.

## Slots and the cloud

There are three slots per device (`SAVE_SLOT_IDS` in `core/ids/saves.ts`). Continue, New Game and Import pick one in the slot picker, and the `Session` saves through `slots.current`, which is whichever slot is active.

Saving is always **local and synchronous**: a checkpoint writes `localStorage` and returns. If the build has cloud saves (the Docker stack; see [server.md](server.md)), `CloudSync` uploads the changed slot in the background a second later. It keeps a little bookkeeping per slot under `cyberfunk_sync_v2:<slot>`: the server revision the copy is based on, and whether it has unsynced changes. The device's anonymous player is kept under `cyberfunk_player`.

The server checks every upload with the same `decodeSave`, so a save the game can't load never reaches the database.

| Module | Holds |
|---|---|
| `app/save/format.ts` | the envelope, the Zod schema, migrations, `CF2:` codes, `summarize` (shared with the server) |
| `app/save/storage.ts` | `SaveStorage` (sync) and the key-value stores (localStorage, memory) |
| `app/save/slots.ts` | the three slots and their sync bookkeeping |
| `app/save/protocol.ts`, `cloud.ts`, `sync.ts` | the cloud: the API contract, the HTTP client, the sync engine |

## Resume

`resume: ResumePoint | null` records where a reload should pick up when that isn't simply "the district screen":

```ts
type ResumePoint =
  | { kind: 'tutorial'; step: 1 | 2 }        // mid-prologue fight: replay from that fight
  | { kind: 'battle'; context: … }           // any other fight: it restarts when you go back in (toast on load)
  | { kind: 'afterBoss'; boss: BossId };     // a boss beaten, its post-fight scene unfinished: replay that scene
```

`Session.resume()` reads and clears it:
- A pending tutorial replays the remaining tutorial fights.
- An `afterBoss` checkpoint replays the boss's post-fight scene through `finishBoss`. The checkpoint stays in the save until that scene's final save; the Click's scene, the ending, clears it before its own save, so the credits never pay the XP twice.
- A save at the very start (before Mama Roux) replays the prologue.
- Anything else goes to the saved district.

**The Tower climb** isn't a `ResumePoint`, because `runBattle` clears `resume` after every fight. It's two save fields, `towerFloor` and `towerFight`, kept the way v1 kept them:
- Travel resets the floor (not the fight), as v1's `goDistrict` did.
- A reload keeps both (`gotoDistrict(…, { keepClimb: true })`), so the lobby offers "Continue the climb". v1 restarted the climb on every reload, though its tutorial says otherwise.

**Format versions:**
- v2: the first v2 format.
- v3 (P4): `towerFloor`, `towerFight`, and the `afterBoss` resume point. `MIGRATIONS[2]` fills the two fields with 0.

## Changing the save format

The schema and the interface must agree, and a compile-time check in `save/format.ts` fails if `GameState` gains a field the schema doesn't know about.

1. Add the field to `GameState`, with its doc comment.
2. Initialize it in `engine/state.ts` (`newGame`).
3. Add it to `gameStateSchema` in `app/save/format.ts`.
4. If existing saves need a value filled in, bump `SAVE_VERSION` and add a step to `MIGRATIONS`. Never edit an old migration.
5. Extend the round-trip test in `app/save/format.test.ts`.
