---
name: playtest
description: Launch and drive the real CYBER FUNK build in a 360px mobile browser through the Playwright MCP — screenshot screens, check horizontal overflow and console errors, jump to any act or boss with the dev menu, or load a player's exported save to reproduce a bug. Also covers getting the build onto a real phone. Use to see a change working in the actual UI, to check layout at phone width, or whenever asked to run, open, play or screenshot the game.
---

# Playtest

The `playwright` MCP server (`.mcp.json`, config in `.claude/playwright/`) runs headless Chrome as a
360×740 touch phone (DPR 2). It serves `dist/cyberfunk.html` at **http://cyberfunk.local/**, read
fresh on every request, so after an edit (the hook rebuilds `dist/`) a reload shows the new build.
`data-act` is configured as Playwright's test id, so `page.getByTestId('act:riff')` and the target
`internal:testid=[data-act="act:riff"s]` both work. The browser profile is in memory: every new
Claude session starts with no save.

If the `mcp__playwright__*` tools are missing, the server needs approving (`/mcp`) or a restart.

## Start

1. `browser_navigate` → `http://cyberfunk.local/`
2. Skip the typewriter and the timing minigame unless they are what you're testing:
   `browser_evaluate` → `() => Object.assign(CF.UI.titleSettings, { textSpeed: 'instant', rhythm: 'auto', reduceMotion: true })`
   (these carry into the new save's settings; for an existing save set `CF.S.settings.rhythm = 'auto'`).
3. Create a character in one `browser_run_code_unsafe` call:
   ```js
   async (page) => {
     await page.getByTestId('new').click(); await page.fill('#name-input', 'Dawlin'); await page.getByTestId('next').click();
     await page.getByTestId('next').click(); await page.getByTestId('pick:snare').click(); await page.getByTestId('next').click();
     await page.getByTestId('go').click(); return 'ok';
   }
   ```
   Classes: `trumpet trombone sousaphone saxophone clarinet snare bassdrum`.
4. Advance through narration and fights until the district hub (the prologue takes ~85 steps, ~10 s):
   ```js
   async (page) => {
     for (let i = 0; i < 300; i++) {
       if (await page.getByTestId('streets').count()) return 'district after ' + i + ' steps';
       const popup = page.locator('#popup:not([hidden]) [data-act]');
       if (await popup.count()) { await popup.first().click(); continue; }
       const cont = page.getByTestId('continue');
       if (await cont.count()) { await cont.first().click(); continue; }
       const target = page.locator('.ecard.targetable');
       if (await target.count()) { await target.first().click(); continue; }
       const riff = page.getByTestId('act:riff');
       if (await riff.count()) { await riff.click(); continue; }
       await page.waitForTimeout(150);
     }
     return 'gave up: ' + (await page.locator('#screen').innerText()).slice(0, 200);
   }
   ```
   Change the first `if` to stop somewhere else (e.g. on `act:play` to inspect a battle).

## Jump anywhere (dev menu)

Needs a save (do Start first). `browser_evaluate` → `() => openDevMenu()`, then click a `data-act`:
`act:<treme|quarter|storyville|bayou|cemetery|garden|tower>`, `boss:<id>`
(`captain_hush vox_perfecta mr_ledger rougarou archivist isolde conductor the_click`), `xp` (+500),
`gold`, `heal`, `items`, `gear`, `band`, `notes`, `unlock`. Close it with `sheet-close`.

To reproduce a bug from a player's exported save (Settings → Export):
`() => { if (!importSave('CF1:...')) return 'bad code'; resumeGame(); return 'ok'; }`

## Check

- **Screenshot**: `browser_take_screenshot` with no filename returns the image inline at CSS size
  (360×740). For files, pass `filename: '.playwright-mcp/<name>.png'` (gitignored).
- **Overflow** (the 360px rule), the same test as `test/shots.py`:
  `() => { const w = innerWidth, s = document.querySelector('#screen'); const r = { inner: w, doc: document.documentElement.scrollWidth, body: document.body.scrollWidth, screen: s ? s.scrollWidth : 0 }; r.overflow = r.doc > w || r.body > w || r.screen > w + 1; return r; }`
  Check it on every screen you touched: open sheets (`menu`, `m:status`, `m:journal`, `m:settings`,
  `act:bag`), popups, and long battle logs.
- **Console**: `browser_console_messages`. Warnings and errors only; any error is a finding.
- **Accessibility tree**: `browser_snapshot` (useful with the `fixing-accessibility` skill).
- **State**: `browser_evaluate` with `() => CF.S` (or a slice of it) to confirm the change took effect.

Things this can't verify: synthesized audio (headless has no sound output) and how manual
On the One timing feels. Say so rather than claiming them.

## Common act names

`continue`, `choice:N`, `menu`, `m:status|journal|settings|bag|gear|band|book|lexicon`,
`sheet-close`, `sheet-back`, `streets`, `place:<placeId>`, `opt:N`, `leave`, `act:riff|play|bag|vamp|solo|blues`.
Grep `btn('` in `src/` for the rest.

## On a real phone

- **Same Wi-Fi (cheapest):** start `python3 -m http.server 8765 --bind 0.0.0.0 -d dist` in the
  background, get the Mac's LAN address with `ipconfig getifaddr en0`, and have the person open
  `http://<ip>:8765/cyberfunk.html`. A refresh picks up each rebuild. This serves `dist/` to the whole
  local network, so stop it when done.
- **A link to share:** publish `dist/artifact.html` (the build made for Claude Artifact hosting) with
  the Artifact tool, `icon: "game"`. Re-publishing the same path in the same conversation keeps the
  URL. The Artifact tool requires reading the whole file first, and it is ~360 KB, so this uses a lot
  of context. Only do it when the person asks for a link.
