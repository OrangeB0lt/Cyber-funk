/**
 * Cloud saves against the real Docker stack (docker compose up): the production image, the API
 * and Postgres. Two browser contexts play the part of two phones.
 *
 *   docker compose up --build -d --wait
 *   E2E_STACK_URL=http://localhost:8080 npx playwright test
 *
 * The production build has no window.CF, so states are set up the way a player would, plus a save
 * seeded into localStorage (as if it had been played on this phone before).
 */
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { encodeSave } from '@app/save/format';
import { expectNoOverflow, playUntil, screenOf, tid } from '../helpers';

/** Chrome logs failed requests as console errors; offline and 409 conflicts are expected here. */
const EXPECTED = /ERR_INTERNET_DISCONNECTED|status of 409/;

function watch(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', m => {
    if (m.type() === 'error' && !EXPECTED.test(m.text())) errors.push(m.text());
  });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

/** A character standing in Tremé after the prologue, with instant text. */
function seededSave(name: string): string {
  const g = newGame(name, 'creole', 'trumpet', undefined, 0);
  g.story = { act: 'treme', step: 'win_street_fights' };
  g.flags.metRoux = true;
  g.districtIntros = ['treme'];
  g.settings.textSpeed = 'instant';
  return encodeSave(g, createRng(3).save());
}

async function phone(context: BrowserContext, seed?: { slot: number; raw: string }): Promise<Page> {
  if (seed) {
    await context.addInitScript(
      ([slot, raw]) => {
        if (!localStorage.getItem('e2e_seeded')) {
          localStorage.setItem(`cyberfunk_save_v2:${slot}`, raw as string);
          localStorage.setItem('e2e_seeded', '1');
        }
      },
      [seed.slot, seed.raw] as const,
    );
  }
  const page = await context.newPage();
  await page.goto('/');
  await expect(tid(page, 'new')).toBeVisible();
  return page;
}

async function openSettings(page: Page) {
  await tid(page, 'settings').click();
  await expect(tid(page, 'cloud:status')).toBeVisible();
}

async function slotText(page: Page, slot: number): Promise<string> {
  await tid(page, 'continue-game').click();
  const text = (await tid(page, `save:${slot}`).innerText()).replace(/\s+/g, ' ');
  await tid(page, 'sheet-close').click();
  return text;
}

async function play(page: Page, slot: number) {
  await tid(page, 'continue-game').click();
  await tid(page, `save:${slot}`).click();
  await playUntil(
    page,
    async () => (await screenOf(page)) === 'district' && (await tid(page, 'popup').count()) === 0,
  );
}

async function saveByHand(page: Page) {
  await tid(page, 'menu').click();
  await tid(page, 'm:save').click();
  await expect(tid(page, 'toast')).toContainText('Saved');
  await expect(tid(page, 'sheet')).toHaveCount(0); // Save closes the menu
}

async function toTitle(page: Page) {
  await tid(page, 'menu').click();
  await tid(page, 'm:title').click();
  await tid(page, 'yes').click();
  await expect(tid(page, 'new')).toBeVisible();
}

test('two phones share saves through the cloud', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await phone(ctxA, { slot: 2, raw: seededSave('Dawlin') });
  const errorsA = watch(a);

  // Phone A uploads the save it already had, which creates its anonymous player.
  await expect.poll(() => slotText(a, 2)).toContain('synced');
  await openSettings(a);
  await expect(tid(a, 'cloud:status')).toContainText('backed up');
  const code = (await tid(a, 'cloud:code').innerText()).trim();
  expect(code).toMatch(/^CFP-/);
  await expectNoOverflow(a, 'settings with cloud');
  await tid(a, 'sheet-close').click();

  const api = async () =>
    (await (await request.get('/api/slots', { headers: { authorization: `Bearer ${code}` } })).json()) as {
      slots: { slot: number; revision: number; summary: { name: string } | null }[];
    };
  expect((await api()).slots).toEqual([expect.objectContaining({ slot: 2, revision: 1 })]);
  const revision = async () => (await api()).slots[0]!.revision;
  /** Wait until slot 2 reaches at least `min` and stops moving; return it. */
  const settledRevision = async (min: number) => {
    await expect.poll(revision, { timeout: 30_000 }).toBeGreaterThanOrEqual(min);
    await new Promise(r => setTimeout(r, 1500));
    return revision();
  };

  // Phone B links with the code and gets slot 2.
  const b = await phone(ctxB);
  const errorsB = watch(b);
  await openSettings(b);
  await tid(b, 'cloud:link').click();
  await tid(b, 'cloud:link-text').fill(code.toLowerCase());
  await expectNoOverflow(b, 'link a player code');
  await tid(b, 'cloud:dolink').click();
  await expect(tid(b, 'toast')).toContainText('Linked');
  await tid(b, 'sheet-close').click();
  expect(await slotText(b, 2)).toContain('Dawlin');

  // B plays offline: the save stays on the phone, then uploads when the signal is back.
  await play(b, 2); // entering Tremé autosaves, and that uploads
  const r1 = await settledRevision(2);
  await ctxB.setOffline(true);
  await saveByHand(b);
  await b.waitForTimeout(2000);
  expect(await revision()).toBe(r1);
  await ctxB.setOffline(false);
  await expect.poll(revision, { timeout: 30_000 }).toBe(r1 + 1);

  // Both play slot 2. A saves while B is offline; when B's save reaches the server, B chooses.
  await a.reload();
  await expect.poll(() => slotText(a, 2)).toContain('synced');
  await play(a, 2);
  const r2 = await settledRevision(r1 + 2);
  await ctxB.setOffline(true);
  await saveByHand(a);
  await expect.poll(revision).toBe(r2 + 1);
  await saveByHand(b);
  await ctxB.setOffline(false);
  await expect(tid(b, 'popup')).toContainText('changed on another device', { timeout: 30_000 });
  await expectNoOverflow(b, 'conflict prompt');
  await tid(b, 'no').click(); // keep mine
  await expect.poll(revision, { timeout: 30_000 }).toBe(r2 + 2);

  // History on A: roll slot 2 back to the first checkpoint.
  await toTitle(a);
  await tid(a, 'continue-game').click();
  await tid(a, 'save-history:2').click();
  await expect(tid(a, 'restore:1')).toBeVisible();
  await expectNoOverflow(a, 'history');
  await tid(a, 'restore:1').click();
  await tid(a, 'yes').click();
  await expect(tid(a, 'toast')).toContainText('Restored');
  await expect.poll(revision).toBe(r2 + 3);

  expect(errorsA).toEqual([]);
  expect(errorsB).toEqual([]);
  await ctxA.close();
  await ctxB.close();
});
