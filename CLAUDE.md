# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CYBER FUNK is a phone-first text RPG. **It is mid-migration** from v1 (vanilla JS in one global scope, shipped as one HTML file) to v2 (TypeScript + React 19 + Valtio, a multi-file PWA built with Vite). The approved plan is in `docs/` (ADRs 0001–0005) and the phases are below. To find your way around the code, start at `docs/architecture/code-map.md` (flows and wiring) and `docs/reference/code-map/` (generated: every function with its callers).

- **v1 lives in `legacy/`** and stays runnable and unchanged until cutover: `legacy/src/01–10_*.js`, `legacy/build.js` → `legacy/dist/cyberfunk.html`. It is the source of truth for behavior.
- **v2 lives in `src/`**, in six layers (ADR-0002): `core ← narrative ← content ← engine ← app ← ui`. Imports point down only, and `npm run depcruise` enforces it.
- **The cloud-save server lives in `server/`** (Fastify + Drizzle + PostgreSQL, ADR-0006). It may import only `src/core/*` and `src/app/save/{format,protocol}.ts`, and `src/` never imports it. The game still runs without it (`VITE_CLOUD=off`).

## Commands

```
npm run check            # typecheck + lint + format + layer rules + tests (the pre-commit hook runs it)
npm test                 # Vitest project `game`: unit, integration, parity oracles (no database)
npm run test:server      # Vitest project `server`: real Postgres (docker compose -f compose.dev.yaml up -d db)
npm run dev              # Vite dev server (the v2 game; window.CF is the GameApp)
npm run e2e              # Playwright at 360×740: builds in test mode (cloud off), runs tests/e2e (fails on overflow)
npm run dev:server       # the API on :8787 (needs DATABASE_URL); `npm run dev` forwards /api to it
npm run db:generate      # after editing server/db/schema.ts: write the SQL migration (commit it)
docker compose up --build -d --wait                       # production stack: game + API + Postgres on :8080
E2E_STACK_URL=http://localhost:8080 npx playwright test   # tests/e2e/stack against that stack
docker compose -f compose.dev.yaml up --build             # develop in Docker: :5173 (HMR), :8787, Postgres
npm run docker:check / docker:e2e                         # check + server tests / e2e inside containers
npm run build            # production build -> dist/ (gitignored)
npm run parity:coverage  # corpus vs legacy engine under c8; fails below 95% branch coverage
npm run docs:codemap     # regenerate docs/reference/code-map after code changes (npm test fails when stale)
npm run sprites:export   # regenerate docs/reference/sprites after art changes (npm test fails when stale)
npm run legacy:build     # rebuild legacy/dist (the hook does this automatically)
npm run legacy:sim       # v1 balance sim
npx tsx tools/parity/legacyShots.ts   # v1 reference screenshots at 360px -> legacy/shots/
```

Node 24 (`.nvmrc`). `npm run depcruise` calls dependency-cruiser's API (`tools/depcruise.ts`), so it also works on newer Node versions.

## Migration rules (ADR-0003)

- **Parity first.** Port v1 behavior exactly, prove it with the oracles in `tools/parity/`, and fix bugs afterwards in separate commits (`docs/known-issues.md`).
- The engine port is a **transliteration**: same statement and expression order, same field names on battle/actor objects, and every RNG draw preserved. Mark load-bearing oddities with `// PARITY:`.
- No `Math.random` in game logic. Use the seeded `Rng` from `src/core/rng.ts`; functions that consume randomness take it explicitly.
- Every id kind gets an `as const` list in `src/core/ids/`. Tables are `satisfies Record<Id, Def>`. Every field of a `core/types` interface has TSDoc (ESLint enforces it).
- Content never imports the engine. It gets engine capabilities through `EffectOps` arguments. Only `*.scene.ts` content files may import `narrative/`.
- Every opponent, class and speaker has a pixel-art sprite in `src/content/sprites/`, and a missing one doesn't compile. Draw to the spec in `docs/vision/character-design.md` (one card per sprite, the 80-colour palette, 24×24 grids, 32×32 bosses), then run `npm run sprites:export`. Only `ui/` and `tools/` may import `content/sprites/` (ADR-0007).

## Phases

- P0 groundwork and oracles (done)
- P1 core + content data + engine (exact parity gate) (done)
- P2 vertical slice (prologue + Tremé + Captain Hush, React shell) (done; SceneContext v1 accepted, ADR-0004)
- P2.5 Docker + Compose + cloud saves in PostgreSQL (three slots, history, anonymous player codes; ADR-0006) (done)
- P3 remaining districts (all five, Quarter through Garden, with the Ball) and the accessibility pass (done; axe on every screen, no allowlist)
- P4 finale + persistence (done, pending the owner's playtest): the second line, the Tower, the ending, credits, New Game+; save format v3
- P5 PWA, cutover (delete `legacy/`), docs
- P6 post-parity fixes

Details per phase: `docs/roadmap.md`.

## Claude Code setup (`.claude/`, `.mcp.json`)

- **Rebuild hook** (`.claude/hooks/rebuild.js`): keeps `legacy/dist/` in sync when legacy sources change. It does nothing for `src/`.
- **Check hook** (`.claude/hooks/check.js`, a Stop hook): when a turn changed code, it runs `npm run check` before handing back, and a failure sends Claude back to fix it. It skips unchanged code and gives up after 3 blocks in a row.
- **Git hooks** (`.githooks/`, installed by `npm install`): pre-commit runs `npm run check`, pre-push runs `npm run e2e` (minutes; run `git push` in the background, or `SKIP_E2E=1` when e2e just ran).
- **Playwright MCP**: serves `legacy/dist/cyberfunk.html` at `http://cyberfunk.local/` until P5 repoints it at the v2 build. See the `playtest` skill (it still describes v1's `data-act` ids). To see v2, run `npm run dev` and navigate to the dev server; v2 uses `data-testid` (conventions in `docs/architecture/ui.md`). `init-page.ts` must stay CommonJS (`.claude/package.json`); if the MCP reports "Cannot use import statement", restart the MCP server.
- **Project skills** (`add-content`, `balance-check`, `playtest`) describe **v1**. They are rewritten in P5.
- `.claude/package.json` and `legacy/package.json` mark those folders as CommonJS. The repo root is ESM.

## Constraints

- Target is a ~360px-wide phone; nothing may cause horizontal overflow.
- Keep `legacy/` byte-for-byte unchanged unless a parity tool needs it. It is the oracle.
- Saves are local-first: `SaveStorage` stays synchronous; cloud sync (`src/app/save/sync.ts`) runs behind it. Schema changes go through `npm run db:generate`; never edit a shipped migration.
