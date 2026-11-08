/**
 * Character sprites in the 360×740 phone: the dev gallery shows every sprite at both sizes, and
 * sprites appear wherever a character does (battle cards, dialogue, shops, character creation)
 * without overflowing the screen.
 */
import { expect, test } from '@playwright/test';
import { SPRITE_IDS } from '../../src/core/ids/sprites';
import { expectNoOverflow, tid, watchErrors } from './helpers';

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
