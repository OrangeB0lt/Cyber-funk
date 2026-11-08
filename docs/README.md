# CYBER FUNK documentation

Start here if you're new. Suggested reading order:

1. **[Design pillars](vision/design-pillars.md)**: what the game is and what it must always feel like.
2. **[Engineering principles](vision/engineering-principles.md)**: six rules that settle most "how should I…" questions.
3. **[Architecture overview](architecture/overview.md)**: the six layers and how one tap flows through them.
4. **[Code map](architecture/code-map.md)**: a guided tour of the code. Every runtime object, how they're wired, and step-by-step traces from a tap down to the engine and the database. Its [generated reference](reference/code-map/README.md) lists every file and function with who calls what.
5. **[Onboarding](guides/onboarding.md)**: your first day and first week.
6. The guide for your first task: **[adding content](guides/adding-content.md)**, **[writing scenes](guides/writing-scenes.md)**, **[balancing](guides/balancing.md)**, **[testing](guides/testing.md)** or **[debugging](guides/debugging.md)**.

## Map

| Folder | What's in it |
|---|---|
| [vision/](vision/) | Pillars, world bible, tone and voice, character design, engineering principles |
| [architecture/](architecture/) | How the code is built: layers, engine, content model, narrative runtime, UI, state and saves, platform |
| [systems/](systems/) | How the game works as a game: combat, progression, economy, gear, band, story and quests, exploration |
| [guides/](guides/) | Step-by-step how-tos |
| [reference/](reference/) | Generated reference: the [code map](reference/code-map/README.md) of every file and function (`npm run docs:codemap`); later, tables of every skill, enemy, boss, status, item and story step (`npm run docs:reference`) |
| [adr/](adr/) | Architecture Decision Records: why things are the way they are |
| [team/](team/) | Workstreams and extension points for a five-person team |
| [known-issues.md](known-issues.md) | v1 behavior queued for fixing |
| [roadmap.md](roadmap.md) | The phases of the rebuild |

## Written so far

| Doc | What it covers |
|---|---|
| [vision/engineering-principles.md](vision/engineering-principles.md) | The six rules |
| [vision/character-design.md](vision/character-design.md) | Art direction, the master palette, the sprite spec, and a design card for every character |
| [architecture/code-map.md](architecture/code-map.md) | The code map: runtime objects, wiring, and traces of boot, story, battles, saves and sync |
| [reference/code-map/](reference/code-map/README.md) | Generated: every file, declaration and call edge in `src/`, `server/`, `tools/`, `tests/` |
| [architecture/core-and-engine.md](architecture/core-and-engine.md) | Core types, the Rng, the engine's modules and combat loop |
| [architecture/content-model.md](architecture/content-model.md) | Typed content tables, ids, renames from v1 |
| [architecture/narrative-runtime.md](architecture/narrative-runtime.md) | Scenes, the Director, routes, presenters, battles |
| [architecture/ui.md](architecture/ui.md) | The React layer: stores, layout, battle view, a11y, test ids |
| [architecture/state-and-saves.md](architecture/state-and-saves.md) | GameState, the save envelope, slots, resume points, changing the format |
| [architecture/server.md](architecture/server.md) | The cloud-save server: API, database, sync rules, player codes |
| [systems/combat.md](systems/combat.md) | How combat works as a game |
| [guides/writing-scenes.md](guides/writing-scenes.md) | Cookbook for story content |
| [guides/balancing.md](guides/balancing.md) | The sim and how to read it |
| [guides/testing.md](guides/testing.md) | Unit, oracles, server tests, headless playthroughs, e2e |
| [guides/docker.md](guides/docker.md) | Running the stack, developing in Docker, the database |
| [roadmap.md](roadmap.md) | The phases of the 2.0 rebuild and what's left |
| [adr/](adr/) | 0001 stack · 0002 layering · 0003 determinism and parity · 0004 scene API (draft) · 0005 UI state and styling · 0006 server and cloud saves · 0007 character sprites |

Links to docs not yet written point to their planned location; they arrive with later phases.

> **2.0 migration in progress.** The v1 game lives in `legacy/` and stays playable (`legacy/dist/cyberfunk.html`) until the TypeScript rebuild reaches parity. Docs marked *draft* describe the target design.
