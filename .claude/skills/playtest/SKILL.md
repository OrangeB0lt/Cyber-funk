---
name: playtest
description: Launch and drive the real CYBER FUNK build in a 360px mobile browser through the Playwright MCP — screenshot screens, check horizontal overflow, accessibility and console errors, jump to any act or boss with the dev API, or load a player's exported CF2 save to reproduce a bug. Also covers getting the game onto a real phone and installing it. Use to see a change working in the actual UI, to check layout at phone width, or whenever asked to run, open, play or screenshot the game.
---

# Playtest

The `playwright` MCP server (`.mcp.json`, config in `.claude/playwright/`) runs headless Chrome as a
360×740 touch phone (DPR 2). It serves the **test-mode build** in `dist-e2e/` at
**http://cyberfunk.local/**: production code, cloud saves off, and `window.CF` (the `GameApp`).
Files are read fresh on every request and service workers are blocked, so after a rebuild a reload
shows the new code. `data-testid` is Playwright's test id (`page.getByTestId('act:riff')`). The
browser profile is in memory: every new Claude session starts with no save.

- **Build first:** `npm run build:test` (about 10 s; `npm run e2e` also builds it). Rebuild after
  every code change you want to see. Without a build the page says so.
- If the `mcp__playwright__*` tools are missing, the server needs approving (`/mcp`) or a restart.
  If it reports "Cannot use import statement", restart it (`init-page.ts` must stay CommonJS).
- For hot reload instead, run `npm run dev` in the background and navigate to the URL it prints
  (`window.CF` exists there too, and the cloud is on, forwarding `/api` to `npm run dev:server`).

## Start

1. `browser_navigate` → `http://cyberfunk.local/`
2. A new game in Tremé after the prologue, in one `browser_run_code_unsafe` call (the same steps as
   `quickStart` in `tests/e2e/helpers.ts`):
   ```js
   async (page) => {
     await page.evaluate(() => {
       CF.turbo = true;                                   // near-instant battle playback
       CF.view.titleSettings.textSpeed = 'instant';       // carries into the new save
       CF.view.titleSettings.rhythm = 'auto';             // skip the timing bar
       CF.createCharacter('Dawlin', 'creole', 'snare');
       CF.closeSheet();
       CF.dev.act('treme');
     });
     for (let i = 0; i < 300; i++) {
       const screen = await page.locator('[data-screen]').getAttribute('data-screen');
       if (screen === 'district' && !(await page.getByTestId('popup').count())) return 'district after ' + i;
       for (const id of ['ok', 'yes', 'popup-close', 'continue']) {
         const b = page.getByTestId(id);
         if (await b.count()) { await b.first().click(); break; }
       }
       const choice = page.locator('[data-testid^="choice:"]');
       if (await choice.count()) await choice.first().click();
       await page.waitForTimeout(50);
     }
     return 'gave up on ' + (await page.locator('[data-screen]').getAttribute('data-screen'));
   }
   ```
   Roots: `creole cajun yat`. Classes: `trumpet trombone sousaphone saxophone clarinet snare bassdrum`.
   To play through the UI instead (name, roots, instrument), start from the `new` button.
3. For a fight, `playUntil` in `tests/e2e/helpers.ts` is the reference loop: popups, the timing bar,
   Play the Blues, `act:riff` then a `target:`, `out:` buttons, `continue`, `choice:`.

Screens (`[data-screen]`): `title create story district place battle`.

## Jump anywhere (the dev API)

Needs a save (do Start first). `browser_evaluate` with one of:

- `() => CF.dev.act('quarter')`: the start of an act, every earlier boss beaten
  (`treme quarter storyville bayou cemetery garden tower`)
- `() => CF.dev.boss('rougarou')`: straight into a boss (`captain_hush vox_perfecta mr_ledger rougarou
  archivist isolde conductor the_click`); the Tower's two start their climb floor
- `CF.dev.xp()` (+500), `gold()`, `heal()`, `items()`, `gear()`, `band()`, `notes()`, `unlock()`,
  `cutting()` (the Cutting Contest)

The same menu is in the UI: tap the version on the title screen five times.

To reproduce a bug from a player's save (Settings → Saves → Export gives a `CF2:` code):
`async () => (await CF.importSave('CF2:...')) ? 'loaded' : 'not a save this version can load'`.
From the title it asks which slot; in a game it replaces the current one and resumes.

## Check

- **Screenshot**: `browser_take_screenshot` with no filename returns the image inline at CSS size
  (360×740). For files, pass `filename: '.playwright-mcp/<name>.png'` (gitignored).
- **Overflow** (the 360px rule), the same test as `expectNoOverflow` in `tests/e2e/helpers.ts`:
  `() => { const w = document.documentElement.clientWidth; const bad = [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5); }).slice(0, 5).map(el => el.tagName + '.' + el.className); return { scrolls: document.documentElement.scrollWidth > w, bad }; }`
  Check it on every screen you touched: sheets (`m:status`, `m:journal`, `m:bag`, `m:settings`),
  popups, long battle logs, the story cards.
- **Console**: `browser_console_messages`. Any error is a finding.
- **Accessibility**: `browser_snapshot` for the tree (pair with the `fixing-accessibility` skill).
  The e2e suite runs axe on every screen (`tests/e2e/a11y.spec.ts`); run `npm run e2e` for the verdict.
- **State**: `() => CF.session.game` (or a slice of it) to confirm a change took effect.

Things this can't verify: synthesized audio (headless has no sound output), how manual On the One
timing feels, and the service worker (blocked here; `tests/e2e/pwa.spec.ts` covers offline play and
installability). Say so rather than claiming them.

## Test ids

Conventions are in `docs/architecture/ui.md` ("Test ids"): `place:congo`, `opt:talk`, `choice:spare`,
`out:retry`, `act:riff`, `skill:tr_s1`, `target:<actor id>`, `m:bag`, `sheet-close`, `sheet-back`,
`buy:gumbo`, `set:textSpeed:instant`, `save:2`. Keys come from content ids, never labels.

## On a real phone

- **Try a change (same Wi-Fi):** `npm run dev -- --host` in the background, then open the Network URL
  it prints on the phone. Hot reload, `window.CF`, no service worker. It serves the dev build to the
  whole local network, so stop it when done.
- **Install it (the PWA):** run the production stack with the Mac's LAN address as the site:
  `SITE_ADDRESS=$(ipconfig getifaddr en0) docker compose up --build -d --wait`, then follow
  `docs/guides/docker.md` ("Play and install on your phone") to trust Caddy's root certificate on the
  phone, open `https://<ip>:8443`, and add it to the home screen. `docker compose down` when done.
