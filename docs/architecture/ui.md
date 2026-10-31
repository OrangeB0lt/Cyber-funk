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
- **Sheets** (`sheets/`) share one frame, `sheets/Sheet.tsx`: heading, `‹ Menu` back button, ✕ close, a scrolling body, an optional footer, and Escape to close. A sheet opened by a scene (`s.sheet({ kind: 'shop', … })`) is *awaited*: the scene continues when the player closes it.

## Battle view

`ReactPresenter` builds `view.battle` (`BattleView`: actor views, the visible log, floats, the active actor, shake and flash counters, and `legal` while waiting for the player) and steps it event by event as the engine reports what happened.

- `combat/BattleScreen.tsx`: enemy cards (tap to target), the log (last six lines, `aria-live`), the player panel (Heart, Funk, Groove, the Big Four beat for Bass Drum).
- `combat/BattleActions.tsx`: RIFF, PLAY (skill picker), SOLO, VAMP, BAG, SPLIT, plus PLAY THE BLUES when it's available. Unavailable actions stay tappable and toast why (v1 behavior), using `aria-disabled` rather than `disabled`.
- `combat/TimingOverlay.tsx`: the On the One bar (driven by `requestAnimationFrame`; tap anywhere, Space or Enter), the auto-rhythm result, and the six Blues pads. Grading happens in the engine (`gradeTiming`, `scoreBlues`); the component only measures when you tapped.

## Accessibility (phone-first, but not phone-only)

- Everything tappable is a real `<button>` (the `Button` component), at least 48px tall.
- Dialogs and sheets use `role="dialog"` and `aria-modal`, move focus inside on open, close on Escape, and make the rest of the app `inert`.
- The typewriter puts the full text in a screen-reader-only copy and hides the partially typed characters (`Typewriter.tsx`, `LexText.tsx`).
- Meters (`Bar`) are `role="meter"` with values. The battle log is a polite live region.
- Settings: text size S/M/L and reduce motion (it also follows the OS `prefers-reduced-motion`).
- The 360px layout must never scroll sideways. The e2e suite fails on any overflow.

## Styling

- `ui/styles/tokens.css`: the palette, tone colors, fonts, tap size and radius as CSS variables, ported 1:1 from v1.
- `ui/styles/global.css`: the reset, headings, utility classes (`dim`, `small`, `good`, `bad`, `gold`, `sr-only`), shared keyframes and reduce-motion.
- Everything else is a **CSS Module** next to its component (`Button.module.css`…). No global class names leak between components.
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

Keys come from content ids and choice keys, never from labels, so rewording copy never breaks a test.

## Dev and test hooks

- **Dev menu:** tap the version on the title screen five times. It gives XP, gold, gear and items, and jumps to any boss or act. It ships in every build, as in v1.
- **`window.CF`:** the `GameApp`, exposed only in dev and `test`-mode builds (`src/main.tsx`). The e2e suite builds with `vite build --mode test`. Set `CF.turbo = true` to make battle playback near-instant.

## Adding a screen, sheet or popup

1. **Sheet:** add a variant to `SheetView` in `app/view.ts`, write the component in `sheets/`, and add a `case` to `SheetLayer`. Open it with `app.openSheet({ kind: … })`, or from a scene with `s.sheet(...)` after adding it to `SheetRequest`.
2. **Screen:** add it to `Screen` in `app/view.ts`, export `XScreen` and `XActions`, and add them to `App.tsx` and `ActionBar.tsx`. TypeScript flags the missing `case`s.
3. **Popup:** add a variant to `Popup`, render it in `PopupLayer`, and answer it with `app.answerPopup(id, value)`.
4. Add the screen to `tests/e2e/` with `expectNoOverflow`.
