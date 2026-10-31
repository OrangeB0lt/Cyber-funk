# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

CYBER FUNK is a phone-first text RPG shipped as one self-contained HTML file. Vanilla JS, no frameworks, no images or audio files (sound is synthesized via Web Audio). The only external resource is Google Fonts. See README.md for the full file-by-file layout.

## Commands

```
npm install                 # jsdom only (headless tests)
npm run build               # concatenate src/ -> dist/cyberfunk.html + dist/artifact.html
npm run sim                 # headless balance sim: every class vs every district and boss
node sim/trace.js <class> <boss> <level>   # print one fight's log, e.g. trumpet captain_hush 3
npm test                    # jsdom smoke test (~5 min), defaults to trumpet
node test/smoke.js <class>  # smoke test with a specific class
npm run test:natural        # no-cheat full playthrough (~15-20 min), default trombone
npm run test:stress         # repeated underleveled boss fights, detects battle-loop stalls
node test/click.js <class> <boss>   # trace one boss fight via the dev menu (default the_click)
npm run shots               # Playwright 360px screenshots + horizontal-overflow check (needs Python Playwright + Chromium)
```

There is no linter or unit-test framework. **All jsdom tests and shots.py load `dist/cyberfunk.html`, not `src/` — run `npm run build` after every src edit before testing.** `dist/` is committed, so rebuild before committing src changes too.

## Claude Code setup (`.claude/`, `.mcp.json`)

- **Rebuild hook.** A PostToolUse hook (`.claude/hooks/rebuild.js`) runs after every Write/Edit/Bash: if any `src/` file or `build.js` is newer than `dist/cyberfunk.html`, it runs `node --check` on the changed files and then `build.js`. Inside Claude Code you don't run `npm run build` by hand; a `dist/ NOT rebuilt` message means a syntax error to fix.
- **Playwright MCP** (`playwright` in `.mcp.json`, config in `.claude/playwright/`): headless 360×740 touch phone serving the build at `http://cyberfunk.local/`, with `data-act` as the test id. See the `playtest` skill.
- **TypeScript LSP plugin** + `jsconfig.json`: go-to-definition and find-references across the global-scope `src/*.js` files (`checkJs` is off).
- **Project skills** (`.claude/skills/`): `add-content` (where every kind of content row must also be referenced), `balance-check` (sim diff vs. a git ref, plus `compare.js`), `playtest` (driving the real UI, phone testing), and `fixing-accessibility` (vendored from ibelick/ui-skills, MIT).

## Architecture

- **No modules.** `build.js` concatenates `src/01_*.js` … `src/10_main.js` in numeric order into a single inline `<script>` (each file starts with `'use strict'`). Everything shares one global scope: top-level `const`/`function` in one file is visible in later files, and load order matters for top-level code. To add a source file, add it to the list in `build.js` (and to the sim's list if it is engine/data).
- **Data / engine / UI split.** Files 01–04 are pure data tables; 05 is the engine and must stay DOM-free, because `sim/sim.js` and `sim/trace.js` load only files 01–05 into a Node `vm` context. Those scripts pull engine names out via an explicit export line (`this.__E = { ... }`) — add any new engine function the sim needs there.
- **Single state `S`.** `newState()` in `05_engine.js` defines the save schema; `migrate()` in `10_main.js` back-fills missing fields on load. New persistent fields go in `newState()` so old saves pick them up. Saves live in `localStorage` under `cyberfunk_save_v1`.
- **Effect-list combat.** Skills, boss moves, assists, and items are arrays of effects (`dmg`, `status`, `heal`, `funk`, `cleanse`, `strip`, `guard`, `groove`, `fn`) resolved by the actor-agnostic `resolveSkill()`. The battle is a pull loop: `runUntilPlayer()` advances until player input is needed, `playerAction()` applies it, and the engine only pushes to `b.events`; the UI (`drainEvents` in `07_ui_combat.js`) animates them.
- **Click dispatch via `data-act`.** One delegated listener (`wireGlobal()` in `06_ui_core.js`) reads `data-act="key"` or `data-act="key:arg"` and calls a handler from `UI.h` (screen), `UI.sh` (open sheet), or `UI.ph` (open popup), passing the part after the first `:` as the argument. Popups block sheets, which block the screen. Use the `btn(act, label)` helper to render buttons. Tests drive the game entirely by clicking `data-act` elements, so keep act names stable.
- **Test hooks.** `window.CF` (end of `10_main.js`) exposes `S`, `UI`, and the main tables; tests also call globals like `newState`, `goDistrict`, `openDevMenu`, `exportSave`, `importSave` directly. Tests set `UI.titleSettings` (`textSpeed: 'instant'`, `rhythm: 'auto'`, `reduceMotion`) to skip typewriter and timing input.
- **Balance knobs:** `BALANCE` in `05_engine.js`, boss stats in `makeEnemy()`, XP curve in `xpToNext()`. Check changes with `npm run sim`.
- **Dev menu:** tap the version number on the title screen five times (`openDevMenu()`), which can grant items/gear/band and jump to any boss.

## Constraints

- Target is a ~360px-wide phone screen; nothing should cause horizontal overflow (`shots.py` flags it).
- `dist/artifact.html` is the same page without the `<html>/<head>/<body>` skeleton, for hosts that wrap it; both outputs come from `build.js` and should not be edited by hand.
