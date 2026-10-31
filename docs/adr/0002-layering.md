# ADR-0002: Six layers, imports point down

- **Status:** Accepted (2026-10-30)

## Context

In v1 every file could touch everything. Game rules leaked into UI files: timing math, Blues scoring, quest counters, encounter rigging and shop pricing all lived in rendering code, and the UI mutated game state at about 210 sites. Content data called into the UI through a `G` facade. Adding a boss meant editing about 10 tables in 5 files.

With five people working in parallel, each person should be able to answer two questions without reading the whole codebase: "where does this belong?" and "what can this affect?"

## Decision

The code lives in six layers. A module may import only from its own layer or the layers below it. `dependency-cruiser` enforces this in CI (`.dependency-cruiser.cjs`), along with "no import cycles".

```
ui/         React components. Reads state snapshots; changes state only by calling app commands.
app/        Stores, commands, the scene-context implementation, battle controller, presenters,
            persistence, audio. No React.
engine/     Game systems: stats, progression, economy, combat loop and effects, rewards, encounters.
content/    The game's data and the small functions that belong to it (boss AI, custom effects,
            quest hooks), plus *.scene.ts files with story scripts.
narrative/  The scene runtime: Director, SceneContext and Presenter interfaces, define* helpers.
core/       Ids, types, the seeded Rng, the EffectOps interface, pure helpers. Imports nothing.
```

Rules worth knowing:

1. **Content never imports the engine.** Boss AI, custom skill effects and quest hooks need engine capabilities (summon an enemy, steal Doubloons, apply a status). They get them as arguments through `EffectOps` (declared in `core`, implemented by `engine`). This replaces v1's `b.helpers` object and keeps the dependency graph acyclic.
2. **Prose stays out of the engine.** Only `*.scene.ts` files in `content/` may import `narrative/`, and `engine/` may not import `*.scene.ts` or `content/index.ts`. The engine and the balance sim load data, never story. The engine reaches content through `content/data.ts` (data and rules only).
3. **No barrels inside content.** Files in `content/` import each other directly, never `content/index.ts` or `content/data.ts`. This prevents the circular-initialization bugs barrels cause.
4. **`app/` has no React.** That is what lets headless playthroughs in Vitest run the real scene runtime and battle controller with a scripted presenter.
5. **Every id kind lives in `core/ids/`.** The save format, the engine and content all reference ids, so they belong to the floor layer. Each list is `as const` and its union type is derived from it. Tables are typed `Record<Id, Def>`, so an id with no row (or a row with no id) is a compile error.

## Consequences

- When you can't decide where code goes, ask what it depends on. If it needs React, it goes in `ui`. If it needs the presenter or stores, `app`. If it needs content tables, `engine`. If it is data or a rule that belongs to one piece of content, `content`.
- Hard-coded content ids in engine logic (v1 had many: `grisgris`, `sm_swing`, `the_click`…) move into data fields as the engine is ported.
- Folder-level aliases (`@core/…`, `@engine/…`) make the layer of every import visible at a glance.

## Alternatives considered

- **Dependency injection of a content registry into every engine function.** It is more "pure", but threads a context parameter through ~60 functions for no practical gain. The engine always runs against the game's real content, and tests do too.
- **npm workspaces per layer.** Stronger isolation but more ceremony. dependency-cruiser gives the same guarantee in one package.
