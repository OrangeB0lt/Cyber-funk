# CYBER FUNK documentation

Start here if you're new. Suggested reading order:

1. **[Design pillars](vision/pillars.md)**: what the game is and what it must always feel like.
2. **[Engineering principles](vision/engineering-principles.md)**: six rules that settle most "how should I…" questions.
3. **[Architecture overview](architecture/overview.md)**: the six layers and how one tap flows through them.
4. **[Code map](architecture/code-map.md)**: a guided tour of the code. Every runtime object, how they're wired, and step-by-step traces from a tap down to the engine and the database. Its [generated reference](reference/code-map/README.md) lists every file and function with who calls what.
5. **[Onboarding](guides/onboarding.md)**: your first day and first week.
6. The guide for your first task: **[adding content](guides/adding-content.md)**, **[writing scenes](guides/writing-scenes.md)**, **[balancing](guides/balancing.md)**, **[testing](guides/testing.md)** or **[debugging](guides/debugging.md)**.

## Map

| Folder | What's in it |
|---|---|
| [vision/](vision/) | Pillars, world bible, tone and voice, character design, engineering principles |
| [architecture/](architecture/) | How the code is built: the overview, the code map, core and engine, the content model, the narrative runtime, UI, state and saves, the server |
| [systems/](systems/) | How the game works as a game: combat |
| [guides/](guides/) | Step-by-step how-tos |
| [reference/](reference/) | Generated: the [code map](reference/code-map/README.md) of every file and function (`npm run docs:codemap`), the [content tables](reference/tables/README.md) (`npm run docs:tables`), the [sprite gallery](reference/sprites/README.md) (`npm run sprites:export`); and [v1's screens](reference/v1-shots/README.md), frozen at cutover |
| [adr/](adr/) | Architecture Decision Records: why things are the way they are |
| [team/](team/) | Workstreams and extension points |
| [known-issues.md](known-issues.md) | v1 behavior queued for fixing in P6 |
| [roadmap.md](roadmap.md) | The phases of the rebuild |

## Every doc

| Doc | What it covers |
|---|---|
| [vision/pillars.md](vision/pillars.md) | The design pillars, and what each rules out |
| [vision/world-bible.md](vision/world-bible.md) | Neon Orleans: the premise, the districts in story order, the band, the Tower, the endings |
| [vision/tone-and-voice.md](vision/tone-and-voice.md) | How the narrator, the characters and the UI sound |
| [vision/character-design.md](vision/character-design.md) | Art direction, the master palette, the sprite spec, and a design card for every character |
| [vision/engineering-principles.md](vision/engineering-principles.md) | The six rules |
| [architecture/overview.md](architecture/overview.md) | The system on one page: layers, the runtime flow, saves, the PWA, the server, tests |
| [architecture/code-map.md](architecture/code-map.md) | The code map: runtime objects, wiring, and traces of boot, story, battles, saves and sync |
| [architecture/core-and-engine.md](architecture/core-and-engine.md) | Core types, the Rng, the engine's modules and combat loop |
| [architecture/content-model.md](architecture/content-model.md) | Typed content tables, ids, sprites, functions in content |
| [architecture/narrative-runtime.md](architecture/narrative-runtime.md) | Scenes, the Director, routes, presenters, battles |
| [architecture/ui.md](architecture/ui.md) | The React layer: stores, layout, battle view, accessibility, test ids |
| [architecture/state-and-saves.md](architecture/state-and-saves.md) | GameState, the save envelope, slots, resume points, changing the format |
| [architecture/server.md](architecture/server.md) | The cloud-save server: API, database, sync rules, player codes |
| [systems/combat.md](systems/combat.md) | How combat works as a game |
| [guides/onboarding.md](guides/onboarding.md) | Setup, the rules every change follows, a first week |
| [guides/adding-content.md](guides/adding-content.md) | Step by step for every kind of content |
| [guides/writing-scenes.md](guides/writing-scenes.md) | Cookbook for story content |
| [guides/balancing.md](guides/balancing.md) | The sim and how to read it |
| [guides/testing.md](guides/testing.md) | Every kind of test, the baselines, the hooks and CI |
| [guides/debugging.md](guides/debugging.md) | The dev menu, save codes, seeds, traces, headless sessions, common failures |
| [guides/docker.md](guides/docker.md) | Running the stack over HTTPS, installing on a phone, developing in Docker, the database |
| [team/workstreams.md](team/workstreams.md) | How the work splits into lanes, and where they hand off |
| [team/extension-points.md](team/extension-points.md) | The seams for extending the game, and what changes together |
| [reference/code-map/](reference/code-map/README.md) | Generated: every file, declaration and call edge in `src/`, `server/`, `tools/`, `tests/` |
| [reference/tables/](reference/tables/README.md) | Generated: every enemy, boss, skill, status, item, gear piece, place and quest |
| [reference/sprites/](reference/sprites/README.md) | Generated: every character sprite as the game draws it, and the palette |
| [roadmap.md](roadmap.md) | The phases of the 2.0 rebuild and what's left |
| [adr/](adr/) | 0001 stack · 0002 layering · 0003 determinism and parity (amended at cutover) · 0004 scene API · 0005 UI state and styling · 0006 server and cloud saves · 0007 character sprites |

> **2.0 history.** The game was rebuilt from v1, a single HTML file, and proven identical before v1 was deleted (2026-11-09, [ADR-0003](adr/0003-determinism-and-parity.md#amendment-cutover-2026-11-09)). v1's source is in git history (`git show 555a9fd:legacy/src/08_world.js`).
