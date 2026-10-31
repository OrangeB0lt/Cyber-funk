# Roadmap

*Where the 2.0 rebuild stands and what's left. Each phase ends with a commit at a gate and a short report. The rules every phase follows are in [ADR-0003](adr/0003-determinism-and-parity.md): port v1 exactly first, prove it with the oracles, fix bugs afterwards in separate commits.*

| Phase | What | Status |
|---|---|---|
| P0 | Groundwork: move v1 to `legacy/`, toolchain, parity oracles, ADRs 0001–0004 | done |
| P1 | Core, typed content, engine at exact parity with v1 | done |
| P2 | Vertical slice: prologue, Tremé, Captain Hush, the React shell | built; waiting on a phone playtest |
| P2.5 | Docker, Docker Compose, cloud saves in PostgreSQL (three slots, history, player codes) | done ([ADR-0006](adr/0006-server-and-cloud-saves.md)) |
| P3 | The remaining districts | next |
| P4 | Finale and persistence | |
| P5 | PWA, cutover, docs | |
| P6 | Post-parity fixes | |

## P2 close-out

- The owner plays the Tremé slice on a phone.
- Freeze SceneContext v1. Rewrite [ADR-0004](adr/0004-scene-api.md) to match the API as built (`story.set`; there is no `checkpoint`, `story.advance` or `minigame`) and mark it Accepted. After that, scene API changes go through an ADR.
- Extract the templates the slice needed: `defineBossPlace`, `defineNpc` (first meeting plus idle lines) and quest helpers (recruiting, escort waves).

## P3: the remaining districts

- **Districts:** French Quarter, Storyville, Bayou, Cemetery, Garden District. For each: places, NPCs, quests, street events, the boss and its pre/post scenes. One commit per district.
- **Minigames:** crawfish races, sit-in, tarot, blessing, whispers.
- **An accessibility pass.**
- **Gate per district:**
  - transcript parity with v1
  - the headless playthrough extended through it
  - e2e at 360px

## P4: finale and persistence

- **Story:** the Ball, the second line, the tower floors, the Conductor, the Click with Play the Blues, the ending, credits, New Game+.
- **`ResumePoint` for every unfinished state:** a tower floor or fight, and the post-boss choice (v1 loses both on reload).
- **Gate:**
  - a headless playthrough to the ending for every combination of the three boss choices (vox × contracts × lucien)
  - a Playwright full flow
  - screenshots side by side with v1

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
