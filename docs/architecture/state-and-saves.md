# State and saves

*What persists, how it is saved, loaded and resumed, and how to change the format safely. Code: [`src/core/types/state.ts`](../../src/core/types/state.ts) and [`src/app/save/format.ts`](../../src/app/save/format.ts).*

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
- before a boss fight, and after a boss win once the next act opens
- after every battle (win, escape, or a street loss)
- a manual save (Menu → Save)
- changing a setting

## The envelope

```json
{ "format": "cyberfunk", "version": 2, "savedAt": "2026-10-31T00:00:00.000Z", "rng": { "s": 123456, "draws": 812 }, "game": { … } }
```

- It's stored under `localStorage['cyberfunk_save_v2']`. v1's key is ignored and left alone (decision: fresh start, no migration).
- `rng` is the game's random-stream state, so a reload continues the same seeded sequence.
- **Loading validates with Zod** (`gameStateSchema`). A corrupt, invalid or too-new save is refused with a reason (`LoadError`: `empty`, `corrupt`, `too-new` or `invalid`), not half-loaded. "Too new" matters for a PWA, where an old cached build could meet a save written by a newer one.
- **Export codes** are `CF2:` + base64 of the envelope (Settings → Export Save). Import goes through the same validation. Bug reports should include one.

## Resume

`resume: ResumePoint | null` records where a reload should pick up when that isn't simply "the district screen":

```ts
type ResumePoint =
  | { kind: 'tutorial'; step: 1 | 2 }   // mid-prologue fight: replay from that fight
  | { kind: 'battle'; context: … };     // any other fight: it restarts when you go back in (toast on load)
```

`Session.resume()` reads and clears it. A pending tutorial replays the remaining tutorial fights; a save at the very start (before Mama Roux) replays the prologue; anything else goes to the saved district.

P4 extends `ResumePoint` for the tower climb and the post-boss choice, which v1 lost on reload.

## Changing the save format

The schema and the interface must agree, and a compile-time check in `save/format.ts` fails if `GameState` gains a field the schema doesn't know about.

1. Add the field to `GameState`, with its doc comment.
2. Initialize it in `engine/state.ts` (`newGame`).
3. Add it to `gameStateSchema` in `app/save/format.ts`.
4. If existing saves need a value filled in, bump `SAVE_VERSION` and add a step to `MIGRATIONS`. Never edit an old migration.
5. Extend the round-trip test in `app/save/format.test.ts`.
