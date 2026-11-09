/**
 * The PWA (vite-plugin-pwa), with service workers allowed (the `pwa` project): once the worker has
 * installed, the game loads and plays offline; Chromium finds the app installable; the cloud API is
 * never cached or served from the cache; and a waiting update is only offered at a hub screen.
 */
import { expect, test, type Page } from '@playwright/test';
import { cf, quickStart, screenOf, tid, watchErrors } from './helpers';

/** Wait for the service worker, then reload so it controls the page. */
async function installed(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
}

test('the game loads and plays offline once the service worker is installed', async ({ page, context }) => {
  const errors = watchErrors(page);
  await installed(page);
  await quickStart(page);
  await cf(page, app => app.save());
  await context.setOffline(true);
  try {
    await page.reload();
    await tid(page, 'continue-game').click();
    await tid(page, 'save:1').click();
    await expect(page.locator('[data-screen="district"]')).toBeVisible();
    await tid(page, 'place:kitchen').click();
    await tid(page, 'opt:talk').click();
    await expect(tid(page, 'continue')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  // Offline, the browser logs failed requests (fonts, cloud checks) as errors; none came from the game.
  expect(errors.filter(e => !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([]);
});

test('Chromium finds the app installable', async ({ page }) => {
  await installed(page);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
  const manifest = await page.evaluate(() => fetch('/manifest.webmanifest').then(r => r.json()));
  expect(manifest).toMatchObject({ name: 'CYBER FUNK', display: 'standalone', start_url: '/' });
});

test('the cloud API is never cached or served from the cache', async ({ page, context }) => {
  await installed(page);
  await page.evaluate(() => fetch('/api/health').catch(() => null));
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.filter(u => u.startsWith('/api/'))).toEqual([]);
  // Offline, an /api page is not answered with the cached app.
  await context.setOffline(true);
  try {
    await expect(page.goto('/api/health')).rejects.toThrow();
  } finally {
    await context.setOffline(false);
  }
});

test('a waiting update is offered at a hub, never mid-battle', async ({ page }) => {
  await quickStart(page);
  await cf(page, app => {
    (window as unknown as { installed: number }).installed = 0;
    app.store.game.settings.rhythm = 'auto';
    app.turbo = true;
    app.dev.boss('captain_hush');
  });
  // In the boss scene and its fight, the update waits.
  await expect(page.locator('[data-screen="story"], [data-screen="battle"]').first()).toBeVisible();
  await cf(page, app =>
    app.offerUpdate(async () => {
      (window as unknown as { installed: number }).installed++;
    }),
  );
  await expect(tid(page, 'update-banner')).toHaveCount(0);
  await cf(page, app => app.session.director.abort('test'));
  await cf(page, app => app.leavePlace());
  await expect.poll(() => screenOf(page)).toBe('district');
  await expect(tid(page, 'update-banner')).toBeVisible();
  await tid(page, 'update').click();
  expect(await page.evaluate(() => (window as unknown as { installed: number }).installed)).toBe(1);
});
