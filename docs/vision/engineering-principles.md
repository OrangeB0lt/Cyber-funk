# Engineering principles

These six rules settle most "how should I do this?" questions. If a change breaks one, the PR description should say why.

## 1. Parity first, improvements second

The 2.0 rebuild ports v1 faithfully and proves it with automated parity oracles (ADR-0003). Bug fixes, balance changes and new ideas land afterwards as small, separate commits, each with a test. A reviewer should never have to ask whether a behavior change was intended.

After cutover, the same rule applies at a smaller scale: refactors don't change behavior, and behavior changes aren't hidden inside refactors.

## 2. The engine is deterministic

Game logic never calls `Math.random`; it draws from a seeded `Rng` (`core/rng.ts`). Same seed, same fight. That one property is what makes these possible:

- an exact, reviewable balance-sim diff
- a bug report that carries a seed
- tests that assert exact numbers instead of probabilities

Randomness that only affects presentation (a float's jitter, an audio noise buffer) may use `Math.random`, and only in `ui/` or `app/audio`.

## 3. Mistakes shouldn't compile

Every id is a union type (`core/ids/`). Every content table is `Record<Id, Def>`, so a missing row, an extra row or a misspelled reference is a compile error. Every field of every `Def` is documented with TSDoc, so hovering over a field in a data row tells you what it does. What types can't express, the content validator test checks: every enemy spawns somewhere, every `[[lexicon]]` link resolves, every item can be obtained.

When you find yourself writing "remember to also update X", make X derived or validated instead.

## 4. One way to do each thing

- Story code uses one API, `SceneContext`. There is no second facade and no direct state pokes from scenes.
- Conditions are one shape: `when`.
- Choices are keyed by name, never by index.
- Engine capabilities reach content one way: `EffectOps`.
- State changes from the UI go one way: `app/commands`.

Before adding a second way, change the first.

## 5. The UI renders state and dispatches commands. It owns no rules.

React components read frozen Valtio snapshots, and mutating a snapshot throws in development. A rule that decides an outcome (how much damage, what something costs, whether an action is legal) lives in `engine/` and is unit-tested there. The UI asks the engine (`legalActions`, `priceFor`) and shows the answer.

## 6. Phone-first and accessible

- The target device is a 360px-wide phone held in one hand.
- No horizontal overflow (e2e fails on it).
- Primary actions stay in the thumb zone.
- Tap targets are at least 48px.
- Every interactive element is a real `<button>`; dialogs trap focus and close on Escape.
- Narration is announced to screen readers.
- Every timing minigame has a keyboard path and an auto mode, and reduced motion is honored.

---

### Working habits that follow from these

- **Comments explain why.** The code says what. A `// PARITY:` comment marks code kept odd on purpose during the port.
- **Small modules with a header comment** saying what the module is for and what it must not do.
- **Tests come with the change.** Engine rule → unit test. Scene → headless scene test. Screen → Playwright, when it is a flow worth protecting.
- **Balance changes include the sim diff** (`npm run sim`) in the PR description.
