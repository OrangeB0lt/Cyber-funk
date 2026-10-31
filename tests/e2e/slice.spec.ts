/**
 * The P2 vertical slice in a 360×740 touch phone: the prologue through the UI, every menu sheet,
 * the pawn shop, a street fight, and Captain Hush. Every screen is checked for horizontal overflow
 * and the console must stay clean.
 */
import { expect, test } from '@playwright/test';
import { cf, expectNoOverflow, playUntil, quickStart, screenOf, tid, watchErrors } from './helpers';

test('new game: create, walk the dirge, win the tutorial, reach Tremé', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expectNoOverflow(page, 'title');
  await cf(page, app => (app.turbo = true));

  await tid(page, 'settings').click();
  await tid(page, 'set:textSpeed:instant').click();
  await expectNoOverflow(page, 'settings');
  await tid(page, 'sheet-close').click();

  await tid(page, 'new').click();
  await expectNoOverflow(page, 'slot picker');
  await tid(page, 'save:1').click();
  await page.getByLabel('Your name').fill('Dawlin');
  await expectNoOverflow(page, 'create: name');
  await tid(page, 'next').click();
  await tid(page, 'pick:yat').click();
  await expectNoOverflow(page, 'create: roots');
  await tid(page, 'next').click();
  await tid(page, 'pick:snare').click();
  await expectNoOverflow(page, 'create: instrument');
  await tid(page, 'next').click();

  await expect(tid(page, 'go')).toBeVisible();
  await expectNoOverflow(page, 'how to play');
  await tid(page, 'go').click();

  await playUntil(
    page,
    async () => (await screenOf(page)) === 'district' && (await tid(page, 'popup').count()) === 0,
    {
      onScreen: sc => expectNoOverflow(page, sc),
    },
  );
  await expect(page.getByRole('heading', { name: 'Tremé' })).toBeVisible();
  const g = await cf(page, app => ({
    name: app.store.game.name,
    cls: app.store.game.cls,
    story: app.store.game.story,
  }));
  expect(g).toEqual({ name: 'Dawlin', cls: 'snare', story: { act: 'treme', step: 'win_street_fights' } });
  expect(errors).toEqual([]);
});

test('every menu sheet opens and fits', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => app.dev.items());
  for (const m of ['status', 'bag', 'gear', 'band', 'journal', 'book', 'lexicon', 'settings']) {
    await tid(page, 'menu').click();
    await expectNoOverflow(page, 'menu');
    await tid(page, `m:${m}`).click();
    await expect(tid(page, 'sheet')).toBeVisible();
    await expectNoOverflow(page, `sheet ${m}`);
    await tid(page, 'sheet-close').click();
    await expect(tid(page, 'sheet')).toHaveCount(0);
  }
  await tid(page, 'travel').click();
  await expectNoOverflow(page, 'travel');
  await page.keyboard.press('Escape');
  await expect(tid(page, 'sheet')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('pawn shop: buy, then sell', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => app.dev.gold());
  await tid(page, 'place:pawn').click();
  await expectNoOverflow(page, 'place');
  await tid(page, 'opt:accessories').click();
  await playUntil(page, async () => (await tid(page, 'sheet').count()) > 0);
  await expectNoOverflow(page, 'shop');
  const before = await cf(page, app => app.store.game.doubloons);
  await page.locator('[data-testid^="buy:"]:not([aria-disabled])').first().click();
  const after = await cf(page, app => app.store.game.doubloons);
  expect(after).toBeLessThan(before);
  await tid(page, 'tab:sell').click();
  await expectNoOverflow(page, 'shop sell');
  await page.locator('[data-testid^="sell:"]').first().click();
  expect(await cf(page, app => app.store.game.doubloons)).toBeGreaterThan(after);
  await tid(page, 'sheet-close').click();
  await playUntil(page, async () => (await tid(page, 'leave').count()) > 0);
  await tid(page, 'leave').click();
  await expect(page.locator('[data-screen="district"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test('hit the streets and come back', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => app.dev.gear());
  await tid(page, 'streets').click();
  let fought = false;
  await playUntil(
    page,
    async () => (await screenOf(page)) === 'district' && (await tid(page, 'popup').count()) === 0,
    {
      onScreen: async sc => {
        await expectNoOverflow(page, sc);
        if (sc !== 'battle') return;
        fought = true;
        await expect(tid(page, 'act:riff')).toBeVisible();
        await tid(page, 'act:play').click();
        await expectNoOverflow(page, 'skill picker');
        await tid(page, 'back').click();
        await tid(page, 'act:bag').click();
        await expectNoOverflow(page, 'battle bag');
        await tid(page, 'sheet-close').click();
      },
    },
  );
  // Street events sometimes replace the fight; either way we end up home with a clean console.
  test.info().annotations.push({ type: 'fought', description: String(fought) });
  expect(errors).toEqual([]);
});

test('Captain Hush: fight, win, take the note', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await cf(page, app => {
    app.dev.gear();
    app.dev.items();
    app.store.game.settings.rhythm = 'auto';
    app.dev.boss('captain_hush');
  });
  await playUntil(
    page,
    async () =>
      (await cf(page, app => app.store.game.bossesDefeated.includes('captain_hush'))) &&
      (await screenOf(page)) === 'district',
    {
      onScreen: sc => expectNoOverflow(page, sc),
      maxSteps: 1500,
    },
  );
  const g = await cf(page, app => ({ notes: app.store.game.notes, unlocked: app.store.game.unlocked }));
  expect(g.notes).toContain('C');
  expect(g.unlocked).toContain('quarter');
  expect(errors).toEqual([]);
});
