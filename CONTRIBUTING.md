# Contributing to CYBER FUNK

Thanks for joining the band. Read [docs/README.md](docs/README.md) first; it has the reading order. This page covers how work moves from your machine into `main`.

> **2.0 migration in progress.** Until cutover, behavior changes to the game are frozen: the TypeScript port must match v1 exactly (see [ADR-0003](docs/adr/0003-determinism-and-parity.md)). Fixes queue in [docs/known-issues.md](docs/known-issues.md).

## Setup

```sh
nvm use            # Node 24
npm install
npx playwright install chromium   # once, for e2e
npm run dev        # http://localhost:5173
```

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `content/…`, `refactor/…`, `docs/…`.
2. Keep each PR to one kind of change: content, rules, UI, refactor or tooling. A refactor never changes behavior; a behavior change is never hidden inside a refactor.
3. Run `npm run check` before you push. CI runs it too, plus the build and Playwright e2e.
4. Open a PR using the template. One approving review merges it.

### Definition of done

- [ ] `npm run check` is green: types, lint, layer rules, tests.
- [ ] Behavior changes come with a test:
  - engine rule → unit test
  - scene → headless scene test
  - an important flow → Playwright
- [ ] Balance changes include the `npm run sim` diff in the PR.
- [ ] UI changes are checked at 360px wide, are keyboard-reachable, and don't overflow horizontally.
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
