# ADR-0004: Story is written as typed TypeScript scenes

- **Status:** Proposed (2026-10-30). Becomes Accepted, and the API is frozen as v1, after the vertical slice (prologue + Tremé + Captain Hush) is ported and played.

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
export const lucienSpared: Scene = async s => {
  await s.narrate('The rougarou falls ...');
  const pick = await s.choose({
    spare: 'Spare him. Smash the implant.',
    finish: 'Finish him. Take the Chrome Fang.',
  });
  if (pick === 'spare') s.flags.set('lucien', 'spared');
  ...
};
```

- **`Scene = (s: SceneContext) => Promise<void>`.** `SceneContext` is the only API scene authors use: `narrate`, `say(npcId, …)`, `choose`, `confirm`, `sheet`, `give`/`take`/`gold`/`xp`, `check`, `fight`, `boss`, `minigame`, `story.advance`, typed flags, and more. Every id argument is a union type, so typos don't compile.
- **Keyed choices.** `choose({ key: label })` resolves to the typed key. Buttons get `data-testid="choice:<key>"`, so tests survive rewording and reordering.
- **Places are routes, not scenes.** A place hub is persisted navigation state. Tapping an option runs one scene; when it settles, the player returns to the current route automatically. This makes the silent dead end impossible.
- **Director.** It runs one scene at a time (single-flight) and owns an `AbortController`: going to the title aborts the running scene cleanly. A street defeat throws a typed `SceneInterrupt('cut')`, which the Director handles by running the wake-up-at-the-club scene.
- **Presenter interface.** Scenes never touch the DOM. `ReactPresenter` writes to a view store that React renders; `ScriptedPresenter` auto-answers prompts in tests. Story flows and full playthroughs therefore run headlessly in Vitest.
- **Checkpoints.** Moments that must survive a reload (a boss's post-fight choice, the tower climb) call `s.checkpoint(...)`. This fixes v1's lost-choice-on-reload bug.

## Consequences

- Writers work in TypeScript. The scene API is small, documented in `docs/guides/writing-scenes.md`, and enforced by the compiler.
- Templates (`definePlace`, `defineBossPlace`, `defineNpc`, quest helpers) will be **extracted from the slice**, not designed in advance, so they fit real scenes.
- The runtime sits behind interfaces, so a different authoring format (such as Ink) could plug in later without touching the UI or the engine.

## Alternatives considered

- **Ink (inkle).** Excellent for branching dialogue written by non-programmers. But CYBER FUNK's scenes interleave story with fights, shops, minigames and state changes, and Ink would need a large bridge to all of that, plus a second language for the team. The developers writing the story chose typed TypeScript.
- **YAML or Markdown dialogue trees.** Readable, but we would own the format, its parser, its validator and its editor tooling forever.
