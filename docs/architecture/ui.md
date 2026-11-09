# UI architecture

*How the React layer is built and the rules it follows. Code: [`src/ui/`](../../src/ui/), with [`src/app/view.ts`](../../src/app/view.ts) and [`src/app/game.ts`](../../src/app/game.ts).*

## The one rule

**The UI renders and dispatches. It owns no game rules and never mutates state.**

Components read **snapshots** and call **commands** on the `GameApp`:

```tsx
const app = useApp();        // commands: app.enterPlace(id), app.chooseIntent(intent), app.buy(id, price)…
const g = useGame();         // frozen snapshot of the save (null on the title screen)
const v = useView();         // frozen snapshot of the presentation state
```

Snapshots are frozen, so writing to one throws in development. ESLint's `react-hooks/immutability` rule also catches writes to anything a hook returned. If a component needs to change something, add a command to `GameApp` (or to the engine, if it's a rule) and call it.

Rules the UI needs (prices, what a skill costs, whether SOLO is ready, the journal step text) come from engine functions called on the snapshot, for example `shopRow(g, entry, district)`, `legalActions` (already computed into `v.battle.legal`), `currentStep(g)` and `displayStats(g)`. The UI computes display strings only.

## Two stores

| Store | Type | Who writes | What's in it |
|---|---|---|---|
| `app.store.game` | `GameState` (Valtio proxy) | engine and scene helpers, via commands | The save: everything that persists |
| `app.view` | `ViewState` (Valtio proxy) | `ReactPresenter` and `GameApp` | Everything on screen that isn't the save: the screen, story lines, the prompt, popups, the open sheet, the battle view, the timing overlay, toasts, character-creation drafts, the save slots and cloud status |

Both are serializable data. The promises scenes wait on live inside `ReactPresenter`, keyed by the numeric ids in `view.prompt`, `view.popups[n]` and `view.timing`. Battles, content tables and deferreds are never proxied.

One more tiny store, `ui/combat/targeting.ts`, holds battle-input UI state (skills menu open? waiting for a target tap?). It's purely presentational, so it stays out of `ViewState`.

## Layout

```
<App app={gameApp}>                       ui/App.tsx — provider + shell; text size and reduce-motion classes
  ├─ Topbar                               layers/Topbar.tsx — name, Heart, Funk, Doubloons (tap → Status)
  ├─ <main>  Screen by view.screen        screens/: Title, Create, Story, District, Place; combat/BattleScreen
  ├─ <footer> ActionBar by view.screen    layers/ActionBar.tsx — each screen exports its *Actions component
  ├─ TimingOverlay                        combat/TimingOverlay.tsx — On the One bar, auto result, Blues pads
  ├─ SheetLayer                           layers/SheetLayer.tsx — bottom sheets (sheets/*)
  ├─ PopupLayer                           layers/PopupLayer.tsx — confirm, level-up, lexicon term, status chip
  └─ Toast
```

- **Screens** fill the scrolling middle. **Actions** live in the thumb-reach bar at the bottom. Each screen file exports both (`DistrictScreen` and `DistrictActions`), and `ActionBar` picks by `view.screen`.
- **Overlays stack** in order: timing, then sheet, then popup, then toast. Everything behind an open sheet or popup is marked `inert` (no focus, no taps, hidden from screen readers).
- **Sheets** (`sheets/`) share one frame, `sheets/Sheet.tsx`: heading, an optional `lead` before it (a shop shows its keeper's portrait there), `‹ Menu` back button, ✕ close, a scrolling body, an optional footer, and Escape to close. A sheet opened by a scene (`s.sheet({ kind: 'shop', … })`) is *awaited*: the scene continues when the player closes it.

## Sprites

`components/Sprite.tsx` draws a character's pixel art as inline SVG at a whole-number scale (`shape-rendering="crispEdges"`). It is decorative: the name is always shown as text beside it, so the SVG is `aria-hidden`. It uses only spans and an svg, so it fits inside a `<p>` or a `<button>`. The art, its rules and the reasons are in `content/sprites/`, [character-design.md](../vision/character-design.md) and [ADR-0007](../adr/0007-character-sprites.md).

| Where | Sprite | Scale |
|---|---|---|
| Battle enemy cards | the opponent; a Session Clone draws the clone of the class it copied (`actorSprite`) | 3×: 72px, bosses 96px |
| Battle player panel | your class hero | 2×: 48px |
| Story lines | the speaker (`StoryLine.npc` or `.sprite`), floated left, first line of a run only; your echoed choices show your hero, flipped, on the right | 2×: 48px (boss art 64px) |
| Shop sheets | the keeper (`keeper` on the shop request), before the title | 2× |
| Create, step 3 | each class's hero | 3× |
| Blue Book, Band, Bounty Board, Status | the opponent, bandmate, elite or your hero (`ItemRow`'s `lead` slot) | 2× (Status 3×) |
| Dev menu → Sprite gallery | every sprite, grouped | 3× or 2× |

- **Motion is CSS only:** the accent glow, a two-frame idle bob in battle, and a white hit flash. The flash works by keying the svg on the newest damage float's id, so each hit remounts it and replays the animation.
- **Effects** (`ghost`, `holo`, `glitch`) each keep a static look when reduce motion stops the animation.
- **Damage numbers** rise from a 160px strip anchored at the sprite, so they stay on screen.

## Battle view

`ReactPresenter` builds `view.battle` (`BattleView`: actor views, the visible log, floats, the active actor, shake and flash counters, and `legal` while waiting for the player) and steps it event by event as the engine reports what happened.

- `combat/BattleScreen.tsx`: enemy cards (a sprite column, then name, Heart, statuses and weakness; tap to target), the log (last six lines, `aria-live`), the player panel (your hero, Heart, Funk, Groove, the Big Four beat for Bass Drum). The enemy list may take 55% of the battle area before it scrolls. Crit shakes and shatter flashes play with `element.animate()` on the screen root, so nothing remounts.
- `combat/BattleActions.tsx`: RIFF, PLAY (skill picker), SOLO, VAMP, BAG, SPLIT, plus PLAY THE BLUES when it's available. Unavailable actions stay tappable and toast why (v1 behavior), using `aria-disabled` rather than `disabled`.
- `combat/TimingOverlay.tsx`: the On the One bar (driven by `requestAnimationFrame`; tap anywhere, Space or Enter), the auto-rhythm result, and the six Blues pads. Grading happens in the engine (`gradeTiming`, `scoreBlues`); the component only measures when you tapped.

## Accessibility (phone-first, but not phone-only)

The target is WCAG 2.2 AA. `tests/e2e/a11y.spec.ts` runs axe on every screen and layer, and **any violation fails**: there's no allowlist. Fix a new one; don't list it. `A11Y_REPORT=1` collects violations into `test-results/a11y-report.jsonl` instead of failing, for when a change trips several.

**Controls**
- Everything tappable is a real `<button>` (the `Button` component): at least 48px tall, and small buttons at least 44px wide. Chips are 32px with 8px gaps. Lexicon links get a 24px+ hit area from padding that a negative margin takes back, so lines don't move.
- Buttons never nest. A control that holds other controls (an enemy card with status chips) is a container with a tap-target button and the other controls beside it.
- A control's accessible name starts with its visible text (Label in Name, so voice control works). Don't put an `aria-label` on a button with visible text. Add what's missing as `sr-only` text after it, the way the Topbar adds "Heart 70 of 70, Funk 25 of 25. Status and skills."
- A `Bar` inside a button is `decorative` (no meter role). A button flattens its children's roles, and the meter's label would replace the numbers in the button's name.

**Layers** (sheets, dialogs, the timing overlay)
- `role="dialog"`, `aria-modal`, and the rest of the app `inert`.
- Focus moves in when a layer opens:
  - a sheet: `[data-autofocus]`, else the first control in its body, else the body (it's focusable, so the keyboard can scroll it)
  - a dialog: its first button
  - the timing bar and Blues pads: the overlay (Space or Enter taps)
- `useFocusReturn` gives focus back to the control that opened the layer, or to `<main>` if that control is gone or disabled.
- Escape closes only the top layer.
- Dialogs have `aria-describedby` pointing at their text (`desc`).

**What a screen reader hears**
- The `Announcer` (`layers/Announcer.tsx`) is a hidden polite log. It reads each story line once as it starts, a new screen's title, the battle outcome, and timing results.
- The visible transcript isn't a live region. The Typewriter swaps its text when typing ends, which made a live transcript read every line twice.
- The battle log is `role="log"`. Meters (`Bar`) are `role="meter"` with values.
- Headings: one `h1` per screen (its title), `h2` for sheet and dialog titles, `h3` for sections.

**Colour and motion**
- Body text is at least 4.5:1 on every surface. Faded states (locked, downed, unavailable) use `--dim`, never opacity on text.
- `--edge` (3.5:1 or better) outlines controls. `--line` is for dividers and card outlines only.
- Settings: text size S/M/L, and reduce motion. Reduce motion follows the OS `prefers-reduced-motion` too, and stops both animations and transitions.
- The 360px layout must never scroll sideways. The e2e suite fails on any overflow.
- Play the Blues is always timed, even with auto rhythm. That's a known gap, logged as a P6 design call in known-issues.

## The PWA

`vite-plugin-pwa` ([vite.config.ts](../../vite.config.ts)) builds the manifest and a service worker. [main.tsx](../../src/main.tsx) registers the worker in production builds only.

- **Offline.** The worker precaches the build (JS, CSS, HTML, fonts, icons), so once it has installed, the game loads and plays with no network. Saves are local first anyway; cloud sync waits for the signal.
- **Never the API.** Nothing under `/api` is cached, and `/api` is excluded from the navigation fallback. A save upload reaches the server or fails, and `CloudSync` retries.
- **Updates wait for a hub.** A new version downloads in the background, then `GameApp.offerUpdate` sets `view.updateReady`. The `UpdateBanner` shows only on the district and place screens, never mid-scene or mid-battle. Tapping **Update** saves, then reloads into the new version.
- **Icons** are Gus, drawn from his sprite by `tools/icons.ts` into `public/icons/` (192, 512, a maskable 512, Apple's 180). Rerun it after redrawing him.
- **Storage.** Once a game exists, the app asks the browser to keep its storage (`navigator.storage.persist()`, [save/persist.ts](../../src/app/save/persist.ts)).
- **Installing on a phone** needs HTTPS, which the Docker stack's Caddy provides ([docker.md](../guides/docker.md)).

## Styling

- `ui/styles/tokens.css`: the palette, tone colors, fonts, tap size and radius as CSS variables, ported 1:1 from v1.
- `ui/styles/global.css`: the reset, headings, utility classes (`dim`, `small`, `good`, `bad`, `gold`, `sr-only`) and reduce-motion.
- Everything else is a **CSS Module** next to its component (`Button.module.css`…). No global class names leak between components.
- **Keyframes live in the module that uses them.** CSS Modules rename every keyframe name a module's `animation` refers to, so a module can't use a global `@keyframes` by name (it silently never runs).
- Animations started from script (the battle shake and flash use `element.animate()`) aren't covered by the global reduce-motion rule, so they check the setting and `prefers-reduced-motion` themselves.
- Fonts are self-hosted with `@fontsource` so the game works offline.

## Test ids

Every interactive element gets a stable `data-testid`, and Playwright uses `testIdAttribute: 'data-testid'`. Conventions:

| Pattern | Example |
|---|---|
| Place, place option | `place:congo`, `opt:talk` |
| Choice, outcome button | `choice:spare`, `out:retry` |
| Battle action, skill, target | `act:riff`, `skill:tr_s1`, `target:a3` (the battle actor id) |
| Menu item, sheet controls | `m:bag`, `sheet-close`, `sheet-back` |
| Shop, bag, gear | `buy:gumbo`, `sell:gumbo`, `use:gumbo`, `slot:charm`, `equip:ch_gator` |
| Settings | `set:textSpeed:instant` |
| Save slots, history | `save:2`, `save-del:2`, `save-history:2`, `restore:7` (a server revision) |
| Cloud saves (Settings) | `cloud:status`, `cloud:code`, `cloud:link`, `cloud:link-text`, `cloud:dolink`, `cloud:unlink` |
| Sprites (not interactive; for tests), gallery size | `sprite:hush_patrol`, `sprite:hero_trumpet`, `gallery-scale:2` |
| Story cards (the roster, the epilogue, the credits) | `cards:roster`, `cards:epilogue`, `cards:credits` |
| A waiting update (hub screens), its button | `update-banner`, `update` |
| The announcer (hidden live log) | `announcer` |

Keys come from content ids and choice keys, never from labels, so rewording copy never breaks a test.

## Dev and test hooks

- **Dev menu:** tap the version on the title screen five times. It gives XP, gold, gear and items, and jumps to any boss or act. It ships in every build, as in v1.
- **`window.CF`:** the `GameApp`, exposed only in dev and `test`-mode builds (`src/main.tsx`). The e2e suite builds with `vite build --mode test`. Set `CF.turbo = true` to make battle playback near-instant.

## Adding a screen, sheet or popup

1. **Sheet:** add a variant to `SheetView` in `app/view.ts`, write the component in `sheets/`, and add a `case` to `SheetLayer`. Open it with `app.openSheet({ kind: … })`, or from a scene with `s.sheet(...)` after adding it to `SheetRequest`.
2. **Screen:** add it to `Screen` in `app/view.ts`, export `XScreen` and `XActions`, and add them to `App.tsx` and `ActionBar.tsx`. TypeScript flags the missing `case`s.
3. **Popup:** add a variant to `Popup`, render it in `PopupLayer`, and answer it with `app.answerPopup(id, value)`.
4. Add the screen to `tests/e2e/` with `expectNoOverflow`.
