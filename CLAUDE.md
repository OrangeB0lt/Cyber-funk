# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CYBER FUNK is a phone-first text RPG. **It is mid-migration** from v1 (vanilla JS in one global scope, shipped as one HTML file) to v2 (TypeScript + React 19 + Valtio, a multi-file PWA built with Vite). The approved plan is in `docs/` (ADRs 0001–0004) and the phases are below.

- **v1 lives in `legacy/`** and stays runnable and unchanged until cutover: `legacy/src/01–10_*.js`, `legacy/build.js` → `legacy/dist/cyberfunk.html`. It is the source of truth for behavior.
- **v2 lives in `src/`**, in six layers (ADR-0002): `core ← narrative ← content ← engine ← app ← ui`. Imports point down only, and `npm run depcruise` enforces it.

## Commands

```
npm run check            # typecheck + lint + layer rules + tests (run before committing)
npm test                 # Vitest: unit, integration, parity oracles
npm run dev              # Vite dev server
npm run build            # production build -> dist/ (gitignored)
npm run parity:coverage  # corpus vs legacy engine under c8; fails below 95% branch coverage
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

## Phases

- P0 groundwork and oracles (done)
- P1 core + content data + engine (exact parity gate)
- P2 vertical slice (prologue + Tremé + Captain Hush, React shell)
- P3 remaining districts
- P4 finale + persistence
- P5 PWA, cutover (delete `legacy/`), docs
- P6 post-parity fixes

## Claude Code setup (`.claude/`, `.mcp.json`)

- **Rebuild hook** (`.claude/hooks/rebuild.js`): keeps `legacy/dist/` in sync when legacy sources change. It does nothing for `src/`.
- **Playwright MCP**: serves `legacy/dist/cyberfunk.html` at `http://cyberfunk.local/` until P5 repoints it at the v2 build. See the `playtest` skill (it still describes v1's `data-act` ids).
- **Project skills** (`add-content`, `balance-check`, `playtest`) describe **v1**. They are rewritten in P5.
- `.claude/package.json` and `legacy/package.json` mark those folders as CommonJS. The repo root is ESM.

## Constraints

- Target is a ~360px-wide phone; nothing may cause horizontal overflow.
- Keep `legacy/` byte-for-byte unchanged unless a parity tool needs it. It is the oracle.
