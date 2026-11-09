/**
 * The PWA against the real Docker stack (cloud saves on), with service workers allowed. Once the
 * worker has installed, the game loads with no network; a save made offline stays on the phone and
 * uploads when the signal is back; and the cloud API is never cached or answered from the cache.
 *
 *   docker compose up --build -d --wait
 *   E2E_STACK_URL=https://localhost:8443 npx playwright test stack/pwa.spec.ts
 */
import { expect, test, type Page } from '@playwright/test';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { encodeSave } from '@app/save/format';
import { playUntil, screenOf, tid } from '../helpers';

test.use({ serviceWorkers: 'allow' });

/** A character standing in Tremé after the prologue, with instant text. */
function seededSave(): string {
  const g = newGame('Offline', 'yat', 'snare', undefined, 0);
  g.story = { act: 'treme', step: 'win_street_fights' };
  g.flags.metRoux = true;
  g.districtIntros = ['treme'];
  g.settings.textSpeed = 'instant';
  return encodeSave(g, createRng(5).save());
}

/** The slot's sync bookkeeping: true while it has changes the server hasn't seen. */
const dirty = (page: Page, slot: number) =>
  page.evaluate(s => JSON.parse(localStorage.getItem(`cyberfunk_sync_v2:${s}`) ?? '{}').dirty === true, slot);

test('offline: the game loads from the service worker, and the save syncs when the signal is back', async ({
  page,
  context,
}) => {
  await context.addInitScript(raw => {
    if (!localStorage.getItem('e2e_seeded')) {
      localStorage.setItem('cyberfunk_save_v2:3', raw);
      localStorage.setItem('e2e_seeded', '1');
    }
  }, seededSave());
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect.poll(() => dirty(page, 3), { timeout: 20_000 }).toBe(false);

  // The API answers online, and nothing under /api lands in a cache.
  expect(await page.evaluate(() => fetch('/api/health').then(r => r.status))).toBe(200);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
    return urls;
  });
  expect(cached.filter(u => u.startsWith('/api/'))).toEqual([]);

  await context.setOffline(true);
  try {
    await page.reload();
    await tid(page, 'continue-game').click();
    await tid(page, 'save:3').click();
    await playUntil(page, async () => (await screenOf(page)) === 'district');
    await tid(page, 'menu').click();
    await tid(page, 'm:save').click();
    await expect(tid(page, 'toast')).toContainText('Saved');
    expect(await dirty(page, 3)).toBe(true);
    // The API isn't answered from a cache while offline.
    expect(
      await page.evaluate(() =>
        fetch('/api/health').then(
          () => 'answered',
          () => 'failed',
        ),
      ),
    ).toBe('failed');
  } finally {
    await context.setOffline(false);
  }
  await expect.poll(() => dirty(page, 3), { timeout: 30_000 }).toBe(false);
});
