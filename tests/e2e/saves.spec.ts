/**
 * Save slots on one device: autosave into the slot you picked, continue from the slot picker, start a
 * second character in another slot, import a code into a slot, delete a slot.
 */
import { expect, test, type Page } from '@playwright/test';
import { cf, expectNoOverflow, playUntil, quickStart, screenOf, tid, watchErrors } from './helpers';

const toTitle = async (page: Page) => {
  await tid(page, 'menu').click();
  await tid(page, 'm:title').click();
  await tid(page, 'yes').click();
  await expect(tid(page, 'new')).toBeVisible();
};

test('three slots: continue, a second character, import, delete', async ({ page }) => {
  const errors = watchErrors(page);
  await quickStart(page);
  await tid(page, 'menu').click();
  await tid(page, 'm:save').click();
  await toTitle(page);

  // Continue lists slot 1 with the character; slots 2 and 3 are empty.
  await tid(page, 'continue-game').click();
  await expect(tid(page, 'save:1')).toContainText('Tester');
  await expect(tid(page, 'save:2')).toContainText('Empty');
  await expectNoOverflow(page, 'slot picker');
  await tid(page, 'save:2').click({ force: true }); // aria-disabled: a toast, nothing loads
  await expect(tid(page, 'toast')).toContainText('empty');
  expect(await screenOf(page)).toBe('title');
  await tid(page, 'save:1').click();
  await playUntil(page, async () => (await screenOf(page)) === 'district');
  expect(await cf(page, app => [app.slots.active, app.store.game.name])).toEqual([1, 'Tester']);
  const code = await cf(page, app => app.exportSave());
  await toTitle(page);

  // A second character in slot 2 leaves slot 1 alone.
  await tid(page, 'new').click();
  await tid(page, 'save:2').click();
  await page.getByLabel('Your name').fill('Second');
  await tid(page, 'next').click();
  await tid(page, 'next').click();
  await tid(page, 'next').click();
  await cf(page, app => {
    app.closeSheet();
    app.dev.act('treme');
  });
  await playUntil(page, async () => (await screenOf(page)) === 'district');
  await toTitle(page);
  await tid(page, 'continue-game').click();
  await expect(tid(page, 'save:1')).toContainText('Tester');
  await expect(tid(page, 'save:2')).toContainText('Second');
  await tid(page, 'sheet-close').click();

  // Importing from the title asks for a slot (and confirms before overwriting one).
  await tid(page, 'settings').click();
  await tid(page, 'import').click();
  await tid(page, 'import-text').fill(code);
  await tid(page, 'doimport').click();
  await tid(page, 'save:2').click();
  await tid(page, 'yes').click();
  await playUntil(page, async () => (await screenOf(page)) === 'district');
  expect(await cf(page, app => [app.slots.active, app.store.game.name])).toEqual([2, 'Tester']);
  await toTitle(page);

  // Delete slot 2 from the picker.
  await tid(page, 'continue-game').click();
  await tid(page, 'save-del:2').click();
  await tid(page, 'yes').click();
  await expect(tid(page, 'save:2')).toContainText('Empty');
  await expect(tid(page, 'save:1')).toContainText('Tester');
  expect(errors).toEqual([]);
});
