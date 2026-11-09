# Roadmap

*Where the 2.0 rebuild stands and what's left. Each phase ends with a commit at a gate and a short report. The rules every phase follows are in [ADR-0003](adr/0003-determinism-and-parity.md): port v1 exactly first, prove it with the oracles, fix bugs afterwards in separate commits.*

| Phase | What | Status |
|---|---|---|
| P0 | Groundwork: move v1 to `legacy/`, toolchain, parity oracles, ADRs 0001–0004 | done |
| P1 | Core, typed content, engine at exact parity with v1 | done |
| P2 | Vertical slice: prologue, Tremé, Captain Hush, the React shell | done (played through to the Quarter; SceneContext v1 accepted) |
| P2.5 | Docker, Docker Compose, cloud saves in PostgreSQL (three slots, history, player codes) | done ([ADR-0006](adr/0006-server-and-cloud-saves.md)) |
| P3 | The remaining districts, the accessibility pass | done |
| P4 | Finale and persistence | done, pending the owner's playtest |
| P5 | PWA, cutover, docs | |
| P6 | Post-parity fixes | |

## P2 close-out (done)

- The owner played the Tremé slice through to the French Quarter (2026-11-08). The Quarter turned out to be empty, which started P3 and the completeness tests below.
- SceneContext v1 is frozen. [ADR-0004](adr/0004-scene-api.md) now describes the API as built, plus `timing` and `board` for P3's minigames, and it's Accepted. Scene API changes go through an ADR.
- Templates: P3 didn't need `defineBossPlace` or `defineNpc`. Helpers shared by districts live in `src/content/world/shared.scene.ts`: instrument stock, rumors, the ball invitation. Revisit if P4 repeats a shape.

## P3: the remaining districts

- **Districts (done):** French Quarter, Storyville, Bayou, Cemetery, Garden District, one commit each. Each has its places, NPCs, quests and its boss's pre/post scenes. The street events were already ported. The Ball moved here from P4, because it's the only way from `attend_ball` to `duel_isolde`.
- **Sprites (done):** every shop has a `keeper`. Shopkeepers who never speak are listed in `SHOPKEEPERS` (`src/content/sprites/refs.ts`). The Restless Haints speak with `speak(…, 'haint')`.
- **Minigames (done):**
  - crawfish races (`s.board`)
  - sit-in (`s.timing`)
  - tarot, blessing, whispers (choices and rolls)
- **Accessibility (done):** WCAG 2.2 AA, checked by axe on every screen with no allowlist (`tests/e2e/a11y.spec.ts`):
  - focus into and back out of every layer
  - Label in Name
  - no nested controls
  - an announcer that reads each story line once
  - contrast tokens, and reduced motion stopping transitions
  - 44px+ targets

  Play the Blues staying timed under auto rhythm is a P6 design call. The rules are in [ui.md](architecture/ui.md#accessibility-phone-first-but-not-phone-only).
- **Gate per district** (all green):
  - transcript parity with v1 for every option in each meaningful state
  - off the pending list (now deleted), so that:
    - the completeness test and the crawler (every place, option, choice branch, quest and item) cover it
    - the playthrough plays through it, down every branch of the boss choices
    - the e2e world walk taps it at 360px

## P4: finale and persistence

- **Story (done):** the second line at the club, the Tower's five floors (two fights each on the Lobby and Server Floors, the Studio Floor's vending machine, the Conductor, the Click with Play the Blues), the ending with its epilogue, the credits and New Game+. Each is a transliteration of v1, proven by the transcript oracle (the Tower's floors under scripted retries, walk-aways and a street loss; the ending under all 8 choice combinations; the whole New Game+ save).
- **Scene API (done):** `bossFight`, `cards`, `newGamePlus` and `clampVitals`, an amendment to [ADR-0004](adr/0004-scene-api.md).
- **Persistence (done):** save format v3. The Tower climb is kept across a reload (v1 restarted it). A boss win checkpoints the save (`afterBoss`), so a reload during a post-fight choice replays the choice, not the fight.
- **Scaffolding (done):** `src/content/pending.ts` is gone, the scene registries are total records, and the place screen's "not built yet" notice is gone.
- **Gate (green):**
  - the playthrough reaches the ending in all 8 combinations, checks each epilogue, and starts New Game+ from each
  - `tests/e2e/finale.spec.ts` plays the whole game at 360px
  - screenshots side by side with v1 (`tools/shots.ts`)
  - the crawler and completeness cover the Tower
- **Still to do:** the owner's playtest from the Garden District through the credits into New Game+.

## P5: PWA, cutover, docs

- **PWA:**
  - manifest, icons, precache
  - the update prompt only at hubs, never mid-battle
  - `navigator.storage.persist()`
  - the service worker must never cache `/api/*`
- **TLS for the Docker stack** (Caddy in front of `app`), which installing the app on a phone needs.
- **Tests:** an every-screen e2e with axe; the sim baseline as a regression check.
- **Cutover:**
  - delete `legacy/`, `tools/parity` and `tools/migrate`
  - rewrite the Claude Code skills, hooks and Playwright MCP setup for v2
- **Docs:**
  - design pillars, world bible, tone and voice
  - the architecture overview
  - onboarding, adding content, debugging
  - `team/` (workstreams, extension points)
  - generated reference tables, CONTRIBUTING

## P6: post-parity fixes

- Work through [known-issues.md](known-issues.md), one commit and one test per fix.
- Design calls go to the project owner first.
