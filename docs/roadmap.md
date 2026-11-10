# Roadmap

*Where the 2.0 rebuild stands and what's left. Each phase ends with a commit at a gate and a short report. The rules are in [ADR-0003](adr/0003-determinism-and-parity.md): v1 was ported exactly first and proven with oracles; since cutover, baselines pin that behavior, and each fix is its own commit that re-baselines on purpose.*

| Phase | What | Status |
|---|---|---|
| P0 | Groundwork: move v1 to `legacy/`, toolchain, parity oracles, ADRs 0001–0004 | done |
| P1 | Core, typed content, engine at exact parity with v1 | done |
| P2 | Vertical slice: prologue, Tremé, Captain Hush, the React shell | done (played through to the Quarter; SceneContext v1 accepted) |
| P2.5 | Docker, Docker Compose, cloud saves in PostgreSQL (three slots, history, player codes) | done ([ADR-0006](adr/0006-server-and-cloud-saves.md)) |
| P3 | The remaining districts, the accessibility pass | done |
| P4 | Finale and persistence | done (the owner played the finale, 2026-11-09) |
| P5 | PWA, HTTPS, cutover, docs | done (2026-11-09) |
| P6 | Post-parity fixes | done (2026-11-09) |

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

  Play the Blues stays timed under auto rhythm, an owner decision in P6 ([known-issues](known-issues.md#owner-decisions)). The rules are in [ui.md](architecture/ui.md#accessibility-phone-first-but-not-phone-only).
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
- **Owner's playtest (done, 2026-11-09):** the Garden District through the credits into New Game+. Merged to `main`.

## P5: PWA, HTTPS, cutover, docs (done)

- **Baselines first (done):** while the oracles still proved v2 = v1, their results were frozen in `tests/fixtures/`: the sim for three seeds, 940 rule cases, and every scene transcript at three random values. v1's screens went to `docs/reference/v1-shots/`. See [ADR-0003's amendment](adr/0003-determinism-and-parity.md#amendment-cutover-2026-11-09).
- **PWA (done):** manifest, icons rendered from Gus's sprite, the build precached for offline play; the service worker never caches `/api/*`; a new version is offered only at a hub screen and applied after a save; `navigator.storage.persist()` after the first save. `tests/e2e/pwa.spec.ts` checks offline play and Chromium's installability.
- **HTTPS (done):** Caddy in front of the game in `compose.yaml`, with the site address from `SITE_ADDRESS` (an internal CA for localhost and LAN addresses, ACME for a real domain). The stack e2e runs over HTTPS.
- **Cutover (done):** `legacy/`, `tools/parity/` and `tools/migrate/` deleted, with the scripts, devDependencies, hook and config entries that served them. The Claude Code skills, CLAUDE.md and the Playwright MCP (now the test-mode build) describe 2.0.
- **Docs (done):** [pillars](vision/pillars.md), [world bible](vision/world-bible.md), [tone and voice](vision/tone-and-voice.md), the [architecture overview](architecture/overview.md), [onboarding](guides/onboarding.md), [adding content](guides/adding-content.md), [debugging](guides/debugging.md), `team/` ([workstreams](team/workstreams.md), [extension points](team/extension-points.md)), generated [content tables](reference/tables/README.md), and CONTRIBUTING.

## P6: post-parity fixes (done)

- Every v1 issue in [known-issues.md](known-issues.md) is settled: fixed in its own commit, with a test that failed first and a deliberate re-baseline of whatever it moved, or kept as an owner decision.
- **Bugs, determinism, text and dead data (fixes 23–34):** turn order no longer depends on the JavaScript engine's sort (this was CI's failing sim baseline); an assist helper's death no longer ends the battle; Second Line Smoke can't escape bosses; a runaway fight is called off, not lost; spars pay half; the broadcaster's flee path; New Game+ no longer duplicates story gear or the legendary, and keeps the ending count; the climb's fight resets with its floor; four text fixes; dead fields, a dead flag and a dead item removed (save format v4).
- **Design calls (owner decisions, 2026-11-09):** fixed: auto rhythm honors the ONE zone's modifiers, tone boosts and Dirge cover every hit, boss telegraphs come a turn before the move, newcomers join the second line at each climb. Kept: fixed prices, Play the Blues stays hands-on, leaving the Tower restarts the climb.
- **CI:** green on every job (check, server, e2e, stack), including two e2e races fixed under load.
