/**
 * Shared e2e helpers. Tests reach states through the UI where that's what's being tested, and
 * through `window.CF` (the GameApp; test builds only) when they just need to get somewhere fast.
 */
import { expect, type Page } from '@playwright/test';

/** Click by data-testid. */
export const tid = (page: Page, id: string) => page.getByTestId(id);

/** Collect console errors and uncaught exceptions; assert none at the end of a test. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', m => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

/** Fail if anything sticks out past the 360px viewport. */
export async function expectNoOverflow(page: Page, label: string): Promise<void> {
  const bad = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > w + 0.5 || r.left < -0.5);
      })
      .slice(0, 5)
      .map(el => `<${el.tagName.toLowerCase()} class="${(el as HTMLElement).className}">`);
    return document.documentElement.scrollWidth > w ? ['document scrolls sideways', ...offenders] : offenders;
  });
  expect(bad, `horizontal overflow on ${label}`).toEqual([]);
}

/**
 * Run app code in the page: `fn(app, arg)` where app is the GameApp (window.CF). `fn` is serialized,
 * so it can only use its parameters.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the page-side app isn't typed here
export function cf<T, A = undefined>(page: Page, fn: (app: any, arg: A) => T, arg?: A): Promise<T> {
  return page.evaluate(
    ({ src, arg }) => (0, eval)(`(${src})`)((window as unknown as { CF: unknown }).CF, arg),
    { src: fn.toString(), arg },
  ) as Promise<T>;
}

/** The current screen (data-screen on the app root). */
export const screenOf = (page: Page) => page.locator('[data-screen]').getAttribute('data-screen');

/**
 * Tap through whatever the game asks (Continue, first choice, dialogs, timing bar, RIFF at the first
 * target, outcome buttons) until `done` holds. Optional hooks see each screen once.
 */
export async function playUntil(
  page: Page,
  done: () => Promise<boolean>,
  opts: { onScreen?: (screen: string) => Promise<void>; choose?: string; maxSteps?: number } = {},
): Promise<void> {
  const seen = new Set<string>();
  const has = async (id: string) => (await page.getByTestId(id).count()) > 0;
  for (let i = 0; i < (opts.maxSteps ?? 600); i++) {
    if (await done()) return;
    const sc = (await screenOf(page)) ?? '';
    if (opts.onScreen && !seen.has(sc)) {
      seen.add(sc);
      await opts.onScreen(sc);
    }
    if (await has('popup')) {
      for (const id of ['ok', 'yes', 'popup-close']) {
        if (await has(id)) {
          await tid(page, id).first().click();
          break;
        }
      }
    } else if (await has('timing')) {
      await page.waitForTimeout(350);
      await tid(page, 'timing')
        .click({ force: true, timeout: 1000 })
        .catch(() => {});
    } else if (await has('act:riff')) {
      await tid(page, 'act:riff').click();
      const target = page.locator('[data-testid^="target:"]:not([disabled])');
      if (await target.count()) await target.first().click();
    } else if ((await page.locator('[data-testid^="out:"]').count()) > 0) {
      await page.locator('[data-testid^="out:"]').first().click();
    } else if (await has('continue')) {
      await tid(page, 'continue').click();
    } else if ((await page.locator('[data-testid^="choice:"]').count()) > 0) {
      const preferred = opts.choose ? page.getByTestId(`choice:${opts.choose}`) : null;
      if (preferred && (await preferred.count())) await preferred.click();
      else await page.locator('[data-testid^="choice:"]').first().click();
    } else {
      await page.waitForTimeout(50);
    }
  }
  throw new Error(`playUntil: gave up on ${await screenOf(page)}`);
}

/** A new game in Tremé after the prologue, fast: text instant, playback in turbo. */
export async function quickStart(page: Page, cls = 'trumpet'): Promise<void> {
  await page.goto('/');
  await cf(page, app => {
    app.turbo = true;
    app.view.titleSettings.textSpeed = 'instant';
  });
  await cf(
    page,
    (app, c) => {
      app.createCharacter('Tester', 'creole', c);
      app.closeSheet();
      app.dev.act('treme');
    },
    cls,
  );
  await playUntil(
    page,
    async () => (await screenOf(page)) === 'district' && (await page.getByTestId('popup').count()) === 0,
  );
}
