/**
 * Every screen and layer of the game, checked with axe (WCAG 2.2 A and AA) at 360×740. Each test
 * also checks for horizontal overflow and a clean console. Known violations live in A11Y_ALLOW
 * (tests/e2e/a11y.ts) and may only shrink.
 *
 * Not covered: the dev menu and the sprite gallery (developer tools, not part of the game).
 */
import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from './a11y';
import { cf, expectNoOverflow, playUntil, quickStart, screenOf, tid, watchErrors } from './helpers';

/** Axe and overflow on whatever is showing. */
async function check(page: Page, label: string): Promise<void> {
  await expectNoOverflow(page, label);
  await expectAccessible(page, label);
}

const noPopup = async (page: Page) => (await tid(page, 'popup').count()) === 0;

test('title, slot picker, character creation, how to play, the first story line', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await cf(page, app => (app.turbo = true));
  await check(page, 'title');

  await tid(page, 'settings').click();
  await check(page, 'sheet:settings');
  await tid(page, 'set:textSpeed:instant').click();
  await tid(page, 'sheet-close').click();

  await tid(page, 'howto').click();
  await check(page, 'sheet:howto');
  await tid(page, 'sheet-close').click();

  await tid(page, 'new').click();
  await check(page, 'sheet:saves');
  await tid(page, 'save:1').click();
  await check(page, 'create:name');
  await page.getByLabel('Your name').fill('Dawlin');
  await tid(page, 'next').click();
  await check(page, 'create:roots');
  await tid(page, 'pick:yat').click();
  await tid(page, 'next').click();
  await check(page, 'create:instrument');
  await tid(page, 'pick:snare').click();
  await tid(page, 'next').click();
  await expect(tid(page, 'go')).toBeVisible();
  await check(page, 'sheet:howto');
  await tid(page, 'go').click();

  await expect(tid(page, 'continue')).toBeVisible();
  await check(page, 'story');
  expect(errors).toEqual([]);
});

test('district, place, story with choices', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await check(page, 'district');
  await tid(page, 'place:kitchen').click();
  await check(page, 'place');
  // A scene that narrates, then asks: the story screen with its choices.
  await cf(page, app => {
    void app.session.run(
      async (s: { narrate(t: string): Promise<void>; choose(o: object, p?: string): Promise<string> }) => {
        await s.narrate('Mama Roux sets down a bowl.');
        await s.choose({ eat: 'Eat', later: 'Later' }, 'She waits.');
      },
      'a11y:choices',
    );
  });
  await playUntil(page, async () => (await page.locator('[data-testid^="choice:"]').count()) > 0, {
    maxSteps: 40,
  });
  await check(page, 'story:choices');
  expect(errors).toEqual([]);
});

test('every sheet', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => {
    app.dev.items();
    app.dev.gold();
    app.dev.band();
  });
  await tid(page, 'menu').click();
  await check(page, 'sheet:menu');
  await tid(page, 'sheet-close').click();
  for (const m of ['status', 'bag', 'gear', 'band', 'journal', 'book', 'lexicon', 'settings']) {
    await tid(page, 'menu').click();
    await tid(page, `m:${m}`).click();
    await expect(tid(page, 'sheet')).toBeVisible();
    await check(page, `sheet:${m}`);
    if (m === 'gear') {
      await tid(page, 'slot:charm').click();
      await check(page, 'sheet:slot');
    }
    await tid(page, 'sheet-close').click();
  }
  await tid(page, 'travel').click();
  await check(page, 'sheet:travel');
  await tid(page, 'sheet-close').click();

  for (const [label, spec] of [
    ['sheet:bounties', { kind: 'bounties' }],
    ['sheet:saves', { kind: 'saves', mode: 'continue' }],
    ['sheet:history', { kind: 'history', slot: 1 }],
  ] as const) {
    await cf(page, (app, sp) => app.openSheet(sp), spec);
    await expect(tid(page, 'sheet')).toBeVisible();
    await check(page, label);
    await tid(page, 'sheet-close').click();
  }

  await tid(page, 'place:pawn').click();
  await tid(page, 'opt:accessories').click();
  await playUntil(page, async () => (await tid(page, 'sheet').count()) > 0);
  await check(page, 'sheet:shop');
  await tid(page, 'tab:sell').click();
  await check(page, 'sheet:shop:sell');
  await tid(page, 'sheet-close').click();
  expect(errors).toEqual([]);
});

test('every popup', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);

  await tid(page, 'menu').click();
  await tid(page, 'm:title').click();
  await expect(tid(page, 'popup')).toBeVisible();
  await check(page, 'popup:confirm');
  await tid(page, 'no').click();
  await expect(tid(page, 'popup')).toHaveCount(0);
  if (await tid(page, 'sheet').count()) await tid(page, 'sheet-close').click();

  await cf(page, app => app.dev.xp());
  await expect(tid(page, 'popup')).toBeVisible();
  await check(page, 'popup:levelup');
  while (!(await noPopup(page))) await tid(page, 'ok').first().click();

  await cf(page, app => app.showTerm('krewe'));
  await expect(tid(page, 'popup')).toBeVisible();
  await check(page, 'popup:lexicon');
  await tid(page, 'popup-close').click();

  await cf(page, app => app.showStatus('blues'));
  await expect(tid(page, 'popup')).toBeVisible();
  await check(page, 'popup:status');
  await tid(page, 'popup-close').click();
  expect(errors).toEqual([]);
});

/** Through the boss's pre-scene until the action buttons show. */
async function untilIntent(page: Page): Promise<void> {
  for (let i = 0; i < 200 && !(await tid(page, 'act:riff').count()); i++) {
    if (await tid(page, 'continue').count()) await tid(page, 'continue').click();
    else await page.waitForTimeout(50);
  }
  await expect(tid(page, 'act:riff')).toBeVisible();
}

test('battle: actions, skills, bag, targets, the timing bar, auto rhythm, victory', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => {
    app.dev.items();
    app.dev.gear();
    app.store.game.settings.rhythm = 'manual';
    // Two opponents, so RIFF asks for a target.
    void app.session.run(
      (s: { fight(spec: object): Promise<string> }) =>
        s.fight({ enemies: ['hush_patrol', 'hush_patrol'], level: 1, context: 'quest' }).then(() => {}),
      'a11y:fight',
    );
  });
  await untilIntent(page);
  await check(page, 'battle');

  await tid(page, 'act:play').click();
  await check(page, 'battle:skills');
  await tid(page, 'back').click();

  await tid(page, 'act:bag').click();
  await check(page, 'battle:bag');
  await tid(page, 'sheet-close').click();

  await tid(page, 'act:riff').click();
  await check(page, 'battle:target');
  await page.locator('[data-testid^="target:"]:not([disabled])').first().click();
  // The bar resolves itself after about a second and a half, so check it straight away.
  await expect(tid(page, 'timing')).toBeVisible();
  await expectAccessible(page, 'battle:timing', { settle: false });

  await cf(page, app => {
    app.store.game.settings.rhythm = 'auto';
    app.turbo = true;
  });
  await untilIntent(page);
  await tid(page, 'act:riff').click();
  const target = page.locator('[data-testid^="target:"]:not([disabled])');
  await expect(target.or(tid(page, 'timing')).first()).toBeVisible();
  if (await target.count()) await target.first().click();
  await expect(tid(page, 'timing')).toBeVisible();
  await expectAccessible(page, 'battle:auto', { settle: false });

  await playUntil(page, async () => (await page.locator('[data-testid^="out:"]').count()) > 0, {
    maxSteps: 1500,
  });
  await check(page, 'battle:victory');
  expect(errors).toEqual([]);
});

test('battle: defeat', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => {
    app.store.game.settings.rhythm = 'auto';
    app.turbo = true;
    app.dev.boss('captain_hush');
  });
  // Every time the game asks for an action, the player is down to 1 Heart.
  await cf(page, app => {
    const intent = app.presenter.battle.intent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- page-side battle object
    app.presenter.battle.intent = (b: any, signal: AbortSignal) => {
      b.player.hp = 1;
      return intent(b, signal);
    };
  });
  await untilIntent(page);
  for (let i = 0; i < 100 && !(await tid(page, 'out:retry').count()); i++) {
    if (await tid(page, 'act:vamp').count()) await tid(page, 'act:vamp').click();
    else await page.waitForTimeout(50);
  }
  await expect(tid(page, 'out:retry')).toBeVisible();
  await check(page, 'battle:defeat');
  expect(await screenOf(page)).toBe('story');
  expect(errors).toEqual([]);
});

/** Is the focused element inside the element with this test id? */
const focusIn = (page: Page, testId: string) =>
  page.evaluate(id => !!document.activeElement?.closest(`[data-testid="${id}"]`), testId);
const focusedTestId = (page: Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

test('keyboard: focus moves into a sheet and comes back to what opened it', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await tid(page, 'menu').focus();
  await page.keyboard.press('Enter');
  await expect(tid(page, 'sheet')).toBeVisible();
  expect(await focusIn(page, 'sheet')).toBe(true);
  // Menu → Status, then Escape: back on Menu, the button that opened the first sheet.
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Status' })).toBeVisible();
  expect(await focusIn(page, 'sheet')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(tid(page, 'sheet')).toHaveCount(0);
  expect(await focusedTestId(page)).toBe('menu');
  expect(errors).toEqual([]);
});

test('keyboard: Escape closes only the top layer', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await tid(page, 'menu').click();
  await tid(page, 'm:journal').click();
  // A lexicon term opened from inside the sheet (as tapping a [[term]] in its text does).
  await tid(page, 'sheet-close').focus();
  await cf(page, app => app.showTerm('krewe'));
  await expect(tid(page, 'popup')).toBeVisible();
  expect(await focusIn(page, 'popup')).toBe(true);
  await page.keyboard.press('Escape');
  await expect(tid(page, 'popup')).toHaveCount(0);
  await expect(tid(page, 'sheet')).toBeVisible();
  expect(await focusedTestId(page)).toBe('sheet-close');
  await page.keyboard.press('Escape');
  await expect(tid(page, 'sheet')).toHaveCount(0);
  expect(await focusedTestId(page)).toBe('menu');
  expect(errors).toEqual([]);
});

test('keyboard: a text-only sheet scrolls from the keyboard', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await tid(page, 'menu').click();
  await tid(page, 'm:journal').click();
  const body = tid(page, 'sheet').locator('[tabindex="0"]');
  await expect(body).toBeFocused();
  expect(errors).toEqual([]);
});
