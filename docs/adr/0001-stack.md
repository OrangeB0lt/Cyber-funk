# ADR-0001: TypeScript, React and a multi-file PWA

- **Status:** Accepted (2026-10-30)
- **Deciders:** project owner, with the refactor plan

## Context

CYBER FUNK 1.0 was ~3,700 dense lines of vanilla JavaScript. `build.js` concatenated ten files into one inline `<script>`, so everything shared a single global scope and load order mattered. Version 1 proved the game. The next phase is a team of five developers taking it much deeper: more districts, systems and story.

That shape fails a team in predictable ways:

- **Merge conflicts.** One 81 KB file held every place, NPC and quest.
- **Unvalidated string ids.** A typo in an enemy id or flag name fails silently at runtime, if at all.
- **No compiler help.** Nothing tells you every place that breaks when you change a data shape.
- **Hand-built UI.** `innerHTML` strings, a mutable handler bag and manual re-render calls. Keyboard and screen-reader support were never added.

## Decision

| Concern  | Choice                                                                                     | Why                                                                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language | **TypeScript 6.0**, `strict` + `noUncheckedIndexedAccess`                                  | Ids become union types, content rows are checked against documented interfaces, and refactors are compiler-guided. 6.0 rather than 7.x because typescript-eslint supports `<6.1`.                                                                           |
| UI       | **React 19**                                                                               | The largest pool of developers who already know it, the best tooling, and good AI-assistant support. The game's UI is mostly menus, lists and text, which is exactly what React is good at.                                                                 |
| State    | **Valtio 2**                                                                               | The engine mutates game state in place (it always has; it reads naturally for game rules). Valtio tracks those mutations through a proxy and hands React frozen snapshots, so the engine stays plain TypeScript and the UI cannot mutate state by accident. |
| Build    | **Vite 8**                                                                                 | Fast dev server, native TypeScript, built-in CSS Modules.                                                                                                                                                                                                   |
| Delivery | **Multi-file PWA** (`vite-plugin-pwa`)                                                     | Installable, works offline, and leaves room for real art and audio files later. The one-file `artifact.html` build is retired.                                                                                                                              |
| Saves    | **Zod 4**, only in `app/persistence`                                                       | Validates loads and imports at the boundary. The `GameState` type is hand-written in `core` so it reads as documentation; a compile-time check keeps the schema in sync.                                                                                    |
| Tests    | **Vitest** (unit, integration, headless playthroughs) + **Playwright** (360×740 phone e2e) | The old jsdom suites took 5–20 minutes and broke when labels changed. Most of the game is now testable without a browser.                                                                                                                                   |
| Lint     | **ESLint** + **dependency-cruiser**                                                        | ESLint for code rules (including "no `Math.random` in game logic"); dependency-cruiser for layer boundaries and import cycles (see ADR-0002).                                                                                                               |

## Consequences

- There is a build step, so contributors need Node 24 (`.nvmrc`).
- The single-file `artifact.html` distribution is gone; hosting becomes "any static host".
- Content authors write TypeScript. The authoring surface (data rows and the scene API, ADR-0004) is kept small and documented so writers don't need to know React or the engine.
- React's re-render model and the game's async narrative don't fit together on their own. ADR-0004 bridges them with a framework-free Director and a Presenter interface.

## Alternatives considered

- **Stay vanilla JS, reorganize into ES modules.** Cheapest, but keeps the biggest team problems: unchecked ids and a hand-rolled UI layer.
- **Vue 3 / Svelte 5.** Both fit mutable state natively and have built-in transitions. We rejected them for team familiarity: most developers we will hire know React.
- **A game engine (Phaser, Godot, Unity).** These are built for canvas rendering. A text RPG is mostly typography, layout and accessibility, which the DOM does better, and their web exports are heavy on phones.
- **Ink for narrative.** See ADR-0004.
