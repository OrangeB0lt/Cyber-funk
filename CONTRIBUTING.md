# Contributing to CYBER FUNK

Thanks for joining the band. Read [docs/README.md](docs/README.md) first; it has the reading order. This page covers how work moves from your machine into `main`.

> **Behavior is pinned by baselines.** Refactors don't change behavior: the sim, the engine's rules and every scene transcript must still match `tests/fixtures/`. A change that's meant to alter behavior (a bug fix, a balance change, new content in a pool) re-baselines in the same commit (`npm run sim:baseline`, `rules:baseline`, `transcripts:baseline`), names it in the commit message, and the fixture diff is the review. See [ADR-0003](docs/adr/0003-determinism-and-parity.md#amendment-cutover-2026-11-09) and [testing](docs/guides/testing.md#baselines).

## Setup

```sh
nvm use            # Node 24
npm install        # also turns on the git hooks in .githooks/
npx playwright install chromium   # once, for e2e
npm run dev        # http://localhost:5173
```

`npm install` points git at `.githooks/` (the `prepare` script), so two checks run on their own:

| When | What runs | Skip it once |
|---|---|---|
| `git commit` | `npm run check` (about 15 s); only `format:check` when no code is staged | `git commit --no-verify` |
| `git push` | `npm run e2e` (about a minute), when the push changes the game | `SKIP_E2E=1 git push` or `git push --no-verify` |

CI runs everything again on every push, on every branch.

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `content/…`, `refactor/…`, `docs/…`.
2. Keep each PR to one kind of change: content, rules, UI, refactor or tooling. A refactor never changes behavior; a behavior change is never hidden inside a refactor.
3. The pre-commit hook runs `npm run check` and the pre-push hook runs e2e. CI runs both again, plus the build, the server tests and the Docker stack, on every push.
4. Open a PR using the template. One approving review merges it.

### Definition of done

- [ ] `npm run check` is green: types, lint, formatting, layer rules, tests (including the completeness tests and the crawler, which cover new places, options and content automatically).
- [ ] Behavior changes come with a test:
  - engine rule → unit test
  - scene → headless scene test
  - an important flow → Playwright
- [ ] A baseline that moved was re-baselined on purpose, named in the commit message, and its fixture diff shows only what the change meant to move. Balance changes also include the balance diff (`node .claude/skills/balance-check/compare.js`, or `npm run sim` before and after) in the PR.
- [ ] Generated docs are fresh: `npm run docs:codemap` after code changes, `npm run docs:tables` after content changes, `npm run sprites:export` after art changes (`npm test` fails when one is stale).
- [ ] UI changes are checked at 360px wide, are keyboard-reachable, pass axe (`npm run e2e`), and don't overflow horizontally.
- [ ] Docs are updated if you changed a system, an API or a content workflow.

## Commit messages

Imperative mood, under ~72 characters, with a body that says *why* when it isn't obvious:

```
Fix assist helper death ending the battle as a loss

Assist helpers were side:'player' actors, so a countered assist ran the
player death path. They now die like summons. Adds a regression test.
```

## Code review norms

- Review the change against the [engineering principles](docs/vision/engineering-principles.md).
- Prefer questions to commands ("what happens if the target dies mid-loop?").
- Approve once it's correct and clear; style nits that Prettier or ESLint don't catch are optional.
- Anything that touches `core/` types or the `SceneContext` API needs a second reviewer, because everyone builds on those.
