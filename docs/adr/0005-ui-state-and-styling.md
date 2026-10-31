# ADR-0005: Two Valtio stores, a presenter that owns the promises, CSS Modules, test ids

- **Status:** Accepted (2026-10-31), after building the P2 vertical slice.

## Context

v1's UI shared one global save object `S` with everything. It rendered with `innerHTML` strings, kept callbacks in a mutable handler bag (`UI.h`, `UI.sh`, `UI.ph`), re-rendered by hand (62 `renderTopbar()` calls), and was found by tests through English labels. The rebuild needed:

- React to re-render automatically when the engine changes the save, with the engine staying framework-free.
- Scenes to `await` a tap without the UI owning game flow.
- Styles that five people can change without breaking each other's screens.
- Tests that survive copy edits.

## Decision

1. **Two Valtio proxies, nothing else global.** `session.store.game` (the save) and `app.view` (presentation: the screen, story lines, the prompt, popups, the sheet, the battle view, the timing overlay). The engine mutates plain objects that happen to be proxies; React reads `useSnapshot`, which is frozen. Components change state only through `GameApp` commands. We chose Valtio over Redux and Zustand because the engine already mutates in place (a transliteration of v1), and proxies let it keep doing so without a reducer layer.
2. **The presenter owns the promises.** `ReactPresenter` stores pending waits in a private map keyed by numeric ids, and the view holds only those ids (`prompt.id`, `popup.id`, `timing.id`). An answer for a stale id is ignored. State stays serializable, and the "a lexicon tap answered the pending confirm" class of bug can't happen.
3. **CSS Modules plus one token file.** `tokens.css` holds the palette and sizes (ported 1:1 from v1); `global.css` holds the reset and a few utilities; every component's styles sit next to it in a `.module.css`. No CSS-in-JS runtime, no global class collisions.
4. **`data-testid` on everything interactive,** built from content ids and choice keys (`opt:talk`, `choice:spare`, `act:riff`, `buy:gumbo`). Tests and the Playwright MCP click by id, never by text.
5. **`window.CF` only in dev and test builds.** E2E builds with `vite build --mode test` to get it; production doesn't expose it. The dev menu (title → tap the version five times) stays in every build, as in v1.

## Consequences

- Every UI change is either rendering (a component) or a command (`GameApp`, or the engine for rules). Code review can check that boundary mechanically: snapshots are frozen, and ESLint's `react-hooks/immutability` flags writes to anything a hook returned.
- Headless runs use the same Session with a `ScriptedPresenter`. Nothing in `app/` imports React.
- A purely presentational bit of state (the battle targeting mode) may live in its own small proxy next to its component rather than in `ViewState`.
- Bundle: React, Valtio and the content are about 560 kB minified (180 kB gzipped). P5 adds code splitting (the dev menu, later districts) if load time on a mid-range phone needs it.

## Alternatives considered

- **Zustand or Redux:** immutable updates would mean rewriting every engine mutation, which breaks the transliteration and the parity oracles.
- **React state plus context:** the engine would need callbacks into React, which the layer rule forbids.
- **Tailwind:** fast to write, but v1's look is a small set of bespoke neon effects that read better as named classes, and markup heavy with utility classes is harder for a content-focused team to scan.
