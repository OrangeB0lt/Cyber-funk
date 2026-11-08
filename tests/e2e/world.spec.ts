/**
 * The world walk: in a 360×740 phone, visit every place of every ported district and tap every
 * option, playing through whatever it starts (story, choices, shops, fights), checking for sideways
 * overflow on every screen and sheet and for console errors. This is the UI path the empty French
 * Quarter broke; the headless crawler (tests/integration/explore.test.ts) covers every branch, this
 * covers the real screens.
 *
 * Districts still in src/content/pending.ts get a lighter check: every place says it's not built yet,
 * and nothing overflows.
 */
import { expect, test, type Page } from '@playwright/test';
import { DISTRICT_IDS } from '../../src/core/ids/world';
import { PENDING_DISTRICTS } from '../../src/content/pending';
import { cf, expectNoOverflow, playUntil, quickStart, tid, watchErrors } from './helpers';

const pending = new Set<string>(PENDING_DISTRICTS);
const PORTED = DISTRICT_IDS.filter(d => !pending.has(d));

/** Options that only start a fight; the boss and spar specs cover fights, and they're slow here. */
const FIGHT_KEYS = new Set(['boss', 'spar', 'spar2']);

interface At {
  screen: string;
  busy: boolean;
  sheet: boolean;
  popups: number;
  place: string | null;
  district: string;
}

const at = (page: Page) =>
  cf(page, app => ({
    screen: app.view.screen as string,
    busy: app.view.busy as boolean,
    sheet: !!app.view.sheet,
    popups: app.view.popups.length as number,
    place: app.view.route.kind === 'place' ? (app.view.route.id as string) : null,
    district: app.store.game?.district as string,
  })) as Promise<At>;

/** Nothing running, nothing on top: the player is on a district or place screen. */
async function atRest(page: Page): Promise<boolean> {
  const a = await at(page);
  return !a.busy && !a.sheet && a.popups === 0 && (a.screen === 'district' || a.screen === 'place');
}

/** Put the game in district `d` (as if every earlier boss were beaten), strong and stocked. */
async function arrive(page: Page, d: string): Promise<void> {
  await quickStart(page);
  await cf(
    page,
    (app, dist) => {
      app.dev.act(dist);
      const g = app.store.game;
      g.level = 15;
      // The timing bar has its own spec; here it would only make every fight slow.
      g.settings.rhythm = 'auto';
      app.dev.gear();
      app.dev.gold();
      app.dev.items();
      app.dev.heal();
    },
    d,
  );
  await playUntil(page, () => atRest(page));
  await expect(page.locator('[data-screen="district"]')).toBeVisible();
}

const ids = (page: Page, prefix: string) =>
  page
    .locator(`[data-testid^="${prefix}"]`)
    .evaluateAll((els, pre) => els.map(e => e.getAttribute('data-testid')!.slice(pre.length)), prefix);

for (const d of PORTED) {
  test(`${d}: every place and option works at 360px`, async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    await arrive(page, d);
    const places = await ids(page, 'place:');
    let tapped = 0;
    for (const place of places) {
      const enter = async () => {
        const a = await at(page);
        if (a.district !== d) await cf(page, (app, dist) => app.travel(dist), d);
        await playUntil(page, () => atRest(page));
        if ((await at(page)).screen === 'place') await tid(page, 'leave').click();
        await tid(page, `place:${place}`).click();
        await expect(page.locator('[data-screen="place"]')).toBeVisible();
      };
      await enter();
      await expectNoOverflow(page, `${d} ${place}`);
      await expect(tid(page, 'not-built'), `${place} says it isn't built`).toHaveCount(0);
      // Options change as you use them (talking to someone opens their quest), so look again
      // after each pass and tap whatever is new.
      const done = new Set<string>();
      for (let pass = 0; pass < 3; pass++) {
        if ((await at(page)).place !== place) await enter();
        const fresh = (await ids(page, 'opt:')).filter(k => !done.has(k) && !FIGHT_KEYS.has(k));
        if (!fresh.length) break;
        for (const key of fresh) {
          done.add(key);
          if ((await at(page)).place !== place) await enter();
          const opt = tid(page, `opt:${key}`);
          if (!(await opt.count())) continue; // an earlier option changed what's on offer
          await opt.click();
          tapped++;
          await playUntil(page, () => atRest(page), {
            // Where a scene offers "later" (the Ball's duel, a quest's next step), take it: the
            // crawler plays both branches headlessly; this walk is about the screens.
            choose: 'later',
            closeSheets: true,
            onSheet: () => expectNoOverflow(page, `${d} ${place}:${key} sheet`),
            onScreen: sc => expectNoOverflow(page, `${d} ${place}:${key} ${sc}`),
          });
        }
      }
      if ((await at(page)).screen === 'place') await tid(page, 'leave').click();
    }
    expect(places.length, 'places on the district screen').toBeGreaterThan(0);
    expect(tapped, 'options tapped').toBeGreaterThanOrEqual(places.length);
    expect(errors).toEqual([]);
  });
}

for (const d of PENDING_DISTRICTS) {
  test(`${d} (not ported yet): every place says so, and fits at 360px`, async ({ page }) => {
    const errors = watchErrors(page);
    await arrive(page, d);
    await expectNoOverflow(page, `${d} district`);
    for (const place of await ids(page, 'place:')) {
      await tid(page, `place:${place}`).click();
      await expect(tid(page, 'not-built')).toBeVisible();
      await expectNoOverflow(page, `${d} ${place}`);
      if (process.env.WORLD_SHOTS)
        await page.screenshot({ path: `${process.env.WORLD_SHOTS}/${d}-${place}.png` });
      await tid(page, 'leave').click();
    }
    expect(errors).toEqual([]);
  });
}
