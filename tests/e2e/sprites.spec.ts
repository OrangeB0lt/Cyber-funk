/**
 * Character sprites in the 360×740 phone: the dev gallery shows every sprite at both sizes, and
 * sprites appear wherever a character does (battle cards, dialogue, shops, character creation)
 * without overflowing the screen.
 */
import { expect, test } from '@playwright/test';
import { SPRITE_IDS } from '../../src/core/ids/sprites';
import { cf, expectNoOverflow, playUntil, quickStart, tid, watchErrors } from './helpers';

test('the dev menu sprite gallery shows every sprite and fits at 360px', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (let i = 0; i < 5; i++) await tid(page, 'version').click();
  await tid(page, 'dev:sprites').click();
  await expect(page.getByRole('dialog', { name: 'Sprite gallery' })).toBeVisible();
  await expect(page.locator('[data-testid^="sprite:"]')).toHaveCount(SPRITE_IDS.length);
  await expectNoOverflow(page, 'sprite gallery at 3×');
  await tid(page, 'gallery-scale:2').click();
  await expectNoOverflow(page, 'sprite gallery at 2×');
  expect(errors).toEqual([]);
});

test('battle cards show each enemy, your hero, and a Session Clone as the clone of your class', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await quickStart(page, 'saxophone');
  await cf(page, app => {
    void app.session.run(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the page-side scene context
      (s: any) =>
        s.fight({ enemies: ['hush_patrol', 'session_clone', 'nutria'], level: 2, context: 'street' }),
      'e2e:sprites',
    );
  });
  await expect(tid(page, 'act:riff')).toBeVisible({ timeout: 15_000 });
  const cards = page.locator('[data-testid^="target:"]');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByTestId('sprite:hush_patrol')).toBeVisible();
  await expect(cards.nth(1).getByTestId('sprite:clone_saxophone')).toBeVisible();
  await expect(cards.nth(2).getByTestId('sprite:nutria')).toBeVisible();
  await expect(tid(page, 'pstat').getByTestId('sprite:hero_saxophone')).toBeVisible();
  await expectNoOverflow(page, 'battle with sprites');
  expect(errors).toEqual([]);
});

test('speakers get portraits in dialogue, and shopkeepers in their shop', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await tid(page, 'place:kitchen').click();
  await tid(page, 'opt:talk').click();
  const story = tid(page, 'story');
  await expect(story.getByTestId('sprite:mamaroux').first()).toBeVisible();
  await expectNoOverflow(page, 'dialogue with a portrait');
  await playUntil(page, async () => (await tid(page, 'leave').count()) > 0);
  await tid(page, 'leave').click();

  await tid(page, 'place:pawn').click();
  await tid(page, 'opt:gear').click();
  await playUntil(page, async () => (await tid(page, 'sheet').count()) > 0);
  const shop = page.getByRole('dialog', { name: "Ti-Jacques' Pawn & Horn" });
  await expect(shop.getByTestId('sprite:tijacques')).toBeVisible();
  await expectNoOverflow(page, 'shop with its keeper');
  expect(errors).toEqual([]);
});

test('character creation shows every class hero', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await tid(page, 'new').click();
  await tid(page, 'save:1').click();
  await page.getByLabel('Your name').fill('Dawlin');
  await tid(page, 'next').click();
  await tid(page, 'pick:yat').click();
  await tid(page, 'next').click();
  for (const cls of ['trumpet', 'trombone', 'sousaphone', 'saxophone', 'clarinet', 'snare', 'bassdrum'])
    await expect(tid(page, `pick:${cls}`).getByTestId(`sprite:hero_${cls}`)).toBeAttached();
  await expectNoOverflow(page, 'create: instrument with heroes');
  expect(errors).toEqual([]);
});
