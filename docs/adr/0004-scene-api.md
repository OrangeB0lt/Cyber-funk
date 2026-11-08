# ADR-0004: Story is written as typed TypeScript scenes

- **Status:** Accepted (2026-11-08). The owner played the Tremé slice through to the French Quarter. This page describes the API as built, plus the two members P3's minigames needed (`timing`, `board`). From here on, a change to `SceneContext` or `Presenter` goes through an ADR.

## Context

v1's story code was async JavaScript with the prose inline:

```js
await narrate('The rougarou falls ...');
const c = await choose([{ label: 'Spare him. Smash the implant.' }, { label: 'Finish him. Take the Chrome Fang.' }]);
if (c === 0) { S.flags.lucien = 'spared'; ... } else { ... }
```

The `async`/`await` style itself is good: it reads like a script, top to bottom. The problems were around it:

- **Index-based choices.** Reordering options changes their meaning, and tests broke when wording changed.
- **Three APIs for one job.** Events used the `G` facade; places and quests mutated `S` directly and called UI functions.
- **No cancellation.** Returning to the title left promises dangling.
- **Silent dead ends.** A scene that forgot `await enterPlace(...)` left the player with a Continue button that did nothing.
- **Untyped references.** Speakers, items, flags and story steps were plain strings, so typos failed silently.

## Decision

Keep the script style and give it a typed, single API.

```ts
export const post: Scene = async s => {
  await s.narrate('The rougarou falls ...');
  const pick = await s.choose({
    spare: 'Spare him. Smash the implant.',
    finish: 'Finish him. Take the Chrome Fang.',
  });
  if (pick === 'spare') s.choice('lucien', 'spared');
  else {
    s.choice('lucien', 'finished');
    s.gainGear('ch_fang');
  }
  await s.giveNote('G');
};
```

- **`Scene = (s: SceneContext) => Promise<void>`.** `SceneContext` (`src/narrative/types.ts`) is the only API scene authors use. Every id argument is a union type, so typos don't compile.

  | Group | Members |
  |---|---|
  | Showing things | `title`, `narrate`, `say(npcId, …)`, `speak(name, color, text, sprite?)`, `choose`, `confirm`, `toast`, `sheet` (shop, band, journal, bounties), `wait` |
  | Minigames (P3) | `timing()`: one On the One bar outside battle, which resolves with the grade (the Feu Follet sit-in). `board(text)`: a fixed-width block that redraws in place (the crawfish race) |
  | Moving | `goto(district)`, `returnTo(route)` |
  | Items, money, character | `give`, `take`, `count`, `gold`, `xp`, `heal`, `funk`, `rest`, `check`, `scaleXp`, `scaleGold`, `nextFight`, `bookHint`, `permStat` (any of the six stats), `keyItem`, `gainGear`, `recruit`, `giveNote` |
  | Story state | `flags.has/set`, `story.is/reached/set`, `quest`, `setQuest`, `counter`, `choice` (the three big boss decisions), `save` |
  | Fights | `fight(spec)` returns `'win' \| 'fled'`. A lost street fight never returns: it throws `SceneInterrupt('cut')`. `boss(id)` runs the pre-scene, the fight with retries, the post-scene and the next act |
  | Escape hatches | `game` (read anything; write simple fields directly), `rng` (the seeded stream; never `Math.random`), `signal` |

- **Keyed choices.** `choose({ key: label })` resolves to the typed key. Buttons get `data-testid="choice:<key>"`, so tests survive rewording and reordering.
- **Places are routes, not scenes.** A place is persisted navigation state. `definePlace(id, { intro?, options })` computes its options from the save every time it's shown. Tapping an option runs one scene, and when that scene settles the player is back on the current route. This makes the silent dead end impossible.
- **Director.** It runs one scene at a time (single-flight) and owns an `AbortController`, so going to the title aborts the running scene cleanly. A street defeat throws a typed `SceneInterrupt('cut')`, which the Director handles by running the wake-up-at-the-club scene. An unexpected error goes to `onError`, which toasts and returns to the district.
- **Presenter interface.** Scenes never touch the DOM. `ReactPresenter` writes to a view store that React renders. `ScriptedPresenter` auto-answers prompts in tests and records a transcript. Story flows and full playthroughs therefore run headlessly in Vitest (the crawler, the playthrough, the transcript oracle).
- **Surviving a reload** is handled by the save's typed `ResumePoint` (P4), not by a scene-level `checkpoint` call. That fixes v1's lost-choice-on-reload bug.

### Why `timing` and `board`, not a generic `minigame`

v1 had two interactive bits outside battle. The sit-in plays eight On the One bars, and the crawfish race draws a `<pre>` straight into the story. Both reuse existing pieces: the timing rules and overlay from battle, and story lines for the race. A generic `minigame(kind)` would have needed a registry and a presenter case per game anyway. The rest of P3's "minigames" (tarot, whispers, blessings) are dialogue, choices and random rolls, so they need nothing new.

## Consequences

- Writers work in TypeScript. The scene API is small, documented in `docs/guides/writing-scenes.md`, and enforced by the compiler.
- Shared shapes are extracted from real scenes, not designed in advance. `definePlace` and `defineEvent` exist. Helpers used by more than one district (instrument stock, bar rumors, the ball invitation) live in `src/content/world/shared.scene.ts`. A `defineBossPlace` or `defineNpc` gets added when enough scenes share that shape to justify it.
- Completeness is tested, not assumed. `tools/completeness.test.ts` and `tests/integration/explore.test.ts` check that every place outside `src/content/pending.ts` has scenes and that every option runs.
- The runtime sits behind interfaces, so a different authoring format (such as Ink) could plug in later without touching the UI or the engine.

## Alternatives considered

- **Ink (inkle).** Excellent for branching dialogue written by non-programmers. But CYBER FUNK's scenes interleave story with fights, shops, minigames and state changes, and Ink would need a large bridge to all of that, plus a second language for the team. The developers writing the story chose typed TypeScript.
- **YAML or Markdown dialogue trees.** Readable, but we would own the format, its parser, its validator and its editor tooling forever.
