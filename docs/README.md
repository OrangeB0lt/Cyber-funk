# CYBER FUNK documentation

Start here if you're new. Suggested reading order:

1. **[Design pillars](vision/design-pillars.md)**: what the game is and what it must always feel like.
2. **[Engineering principles](vision/engineering-principles.md)**: six rules that settle most "how should I…" questions.
3. **[Architecture overview](architecture/overview.md)**: the six layers and how one tap flows through them.
4. **[Onboarding](guides/onboarding.md)**: your first day and first week.
5. The guide for your first task: **[adding content](guides/adding-content.md)**, **[writing scenes](guides/writing-scenes.md)**, **[balancing](guides/balancing.md)**, **[testing](guides/testing.md)** or **[debugging](guides/debugging.md)**.

## Map

| Folder | What's in it |
|---|---|
| [vision/](vision/) | Pillars, world bible, tone and voice, engineering principles |
| [architecture/](architecture/) | How the code is built: layers, engine, content model, narrative runtime, combat presentation, UI, saves, platform |
| [systems/](systems/) | How the game works as a game: combat, progression, economy, gear, band, story and quests, exploration |
| [guides/](guides/) | Step-by-step how-tos |
| [reference/](reference/) | Generated tables of every skill, enemy, boss, status, item and story step (`npm run docs:reference`) |
| [adr/](adr/) | Architecture Decision Records: why things are the way they are |
| [team/](team/) | Workstreams and extension points for a five-person team |
| [known-issues.md](known-issues.md) | v1 behavior queued for fixing |

> **2.0 migration in progress.** The v1 game lives in `legacy/` and stays playable (`legacy/dist/cyberfunk.html`) until the TypeScript rebuild reaches parity. Docs marked *draft* describe the target design.
