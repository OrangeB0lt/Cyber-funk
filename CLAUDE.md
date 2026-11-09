# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CYBER FUNK is a phone-first text RPG: TypeScript, React 19 and Valtio, built with Vite into an installable, offline-capable PWA. It started as a single-file vanilla JS game (v1) and was ported to this codebase at exact parity; v1 was deleted at cutover (its source is in git history, `git show 555a9fd:legacy/src/08_world.js`). To find your way around, start at `docs/architecture/code-map.md` (flows and wiring) and `docs/reference/code-map/` (generated: every function with its callers).

- **The game lives in `src/`**, in six layers (ADR-0002): `core ← narrative ← content ← engine ← app ← ui`. Imports point down only, and `npm run depcruise` enforces it.
- **The cloud-save server lives in `server/`** (Fastify + Drizzle + PostgreSQL, ADR-0006). It may import only `src/core/*` and `src/app/save/{format,protocol}.ts`, and `src/` never imports it. The game runs without it (`VITE_CLOUD=off`).
- **Tools live in `tools/`** (the balance sim, the fight trace, the engine baselines, the content validator, the code map and sprite generators), and the tests in `tests/` plus `*.test.ts` beside the code.

## Commands

```
npm run check            # typecheck + lint + format + layer rules + tests (the pre-commit hook runs it)
npm test                 # Vitest project `game`: unit, integration, baselines (no database)
npm run test:server      # Vitest project `server`: real Postgres (docker compose -f compose.dev.yaml up -d db)
npm run dev              # Vite dev server (window.CF is the GameApp)
npm run e2e              # Playwright at 360×740: builds in test mode (cloud off), runs tests/e2e (axe, overflow, PWA)
npm run dev:server       # the API on :8787 (needs DATABASE_URL); `npm run dev` forwards /api to it
npm run db:generate      # after editing server/db/schema.ts: write the SQL migration (commit it)
docker compose up --build -d --wait                       # production stack: Caddy (HTTPS :8443) + game + API + Postgres
E2E_STACK_URL=https://localhost:8443 npx playwright test  # tests/e2e/stack against that stack
docker compose -f compose.dev.yaml up --build             # develop in Docker: :5173 (HMR), :8787, Postgres
npm run docker:check / docker:e2e                         # check + server tests / e2e inside containers
npm run build            # production build -> dist/ (gitignored)
npm run build:test       # test-mode build -> dist-e2e/ (what e2e and the Playwright MCP serve)
npm run sim              # balance sim (-- --seed N, -- --json); npm run trace -- <class> <opponent> <level>
npm run sim:baseline / rules:baseline / transcripts:baseline   # rewrite a baseline in tests/fixtures (on purpose only)
npm run docs:codemap     # regenerate docs/reference/code-map after code changes (npm test fails when stale)
npm run sprites:export   # regenerate docs/reference/sprites after art changes (npm test fails when stale)
```

Node 24 (`.nvmrc`). `npm run depcruise` calls dependency-cruiser's API (`tools/depcruise.ts`), so it also works on newer Node versions.

## Rules

- **Behavior is pinned by baselines** (`tests/fixtures/`, `docs/guides/testing.md`): the sim's output for three seeds, the engine's rules (enemy groups, field items, shops, victories), and every scene transcript. A refactor changes none of them. A change that's meant to alter behavior re-baselines in the same commit, and the fixture diff is the review; name it in the commit message.
- **Determinism.** No `Math.random` in game logic (ESLint allows it only for cosmetics in `ui/` and `app/audio`). Use the seeded `Rng` from `src/core/rng.ts`; functions that consume randomness take it explicitly. The RNG state is saved, so a reload replays the same draws.
- `// PARITY:` marks a load-bearing v1 oddity kept on purpose during the port (statement order, a quirk the baselines depend on). The bugs among them are in `docs/known-issues.md`; P6 fixes each with a failing test first, or records it there as an owner decision.
- Every id kind gets an `as const` list in `src/core/ids/`. Tables are `satisfies Record<Id, Def>`. Every field of a `core/types` interface has TSDoc (ESLint enforces it).
- Content never imports the engine. It gets engine capabilities through `EffectOps` arguments. Only `*.scene.ts` content files may import `narrative/`.
- Every opponent, class and speaker has a pixel-art sprite in `src/content/sprites/`, and a missing one doesn't compile. Draw to the spec in `docs/vision/character-design.md` (one card per sprite, the 80-colour palette, 24×24 grids, 32×32 bosses), then run `npm run sprites:export`. Only `ui/` and `tools/` may import `content/sprites/` (ADR-0007).
- Adding content: the `add-content` skill. Balance: the `balance-check` skill.

## Phases

- P0–P2.5 groundwork, engine at parity, vertical slice, Docker and cloud saves (done)
- P3 all five districts and the accessibility pass (done; axe on every screen, no allowlist)
- P4 finale and persistence (done; the owner played it): the second line, the Tower, the ending, credits, New Game+; save format v3
- P5 PWA, HTTPS via Caddy, cutover (v1 and the parity oracles deleted), docs (in progress)
- P6 post-parity fixes (`docs/known-issues.md`)

Details per phase: `docs/roadmap.md`.

## Claude Code setup (`.claude/`, `.mcp.json`)

- **Check hook** (`.claude/hooks/check.js`, a Stop hook): when a turn changed code, it runs `npm run check` before handing back, and a failure sends Claude back to fix it. It skips unchanged code and gives up after 3 blocks in a row.
- **Git hooks** (`.githooks/`, installed by `npm install`): pre-commit runs `npm run check`, pre-push runs `npm run e2e` (minutes; run `git push` in the background, or `SKIP_E2E=1` when e2e just ran).
- **Playwright MCP**: serves the test-mode build (`dist-e2e/`; `npm run build:test`) at `http://cyberfunk.local/` as a 360×740 phone, with `window.CF`, service workers blocked, and `data-testid` as the test id. See the `playtest` skill. `init-page.ts` must stay CommonJS (`.claude/package.json`); if the MCP reports "Cannot use import statement", restart the MCP server.
- **Project skills**: `add-content`, `balance-check`, `playtest`.
- `.claude/package.json` marks that folder as CommonJS. The repo root is ESM.

## Constraints

- Target is a ~360px-wide phone; nothing may cause horizontal overflow (e2e fails on it).
- Saves are local-first: `SaveStorage` stays synchronous; cloud sync (`src/app/save/sync.ts`) runs behind it. A `GameState` change follows `docs/architecture/state-and-saves.md` (schema, `SAVE_VERSION`, a migration). Database schema changes go through `npm run db:generate`. Never edit a shipped migration of either kind.
