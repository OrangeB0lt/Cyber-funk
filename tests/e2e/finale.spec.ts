/**
 * The whole game in a 360×740 phone: a new character through the UI, the prologue, every district's
 * boss (dev shortcuts between districts), the second line at the club, the Tower floor by floor (the
 * Studio Floor's rest, then up), the Conductor, the Click with Play the Blues, the ending, the credits,
 * and New Game+ into the prologue again. Every screen is checked for overflow and, where the finale
 * adds a screen, with axe. The console must stay clean.
 *
 * Fights are short: whenever the game asks for an action, the player is at full Heart and every
 * opponent at 1. The battle, timing and boss specs cover fighting; this one is about every screen of
 * the story in order. The Click still needs Play the Blues before anything can touch it.
 */
import { expect, test, type Page } from '@playwright/test';
import { expectAccessible } from './a11y';
import { cf, expectNoOverflow, playUntil, screenOf, tid, watchErrors } from './helpers';

const BOSSES = ['captain_hush', 'vox_perfecta', 'mr_ledger', 'rougarou', 'archivist', 'isolde'] as const;

const choiceShown = async (page: Page, key: string) => (await tid(page, `choice:${key}`).count()) > 0;
const atDistrict = async (page: Page) =>
  (await screenOf(page)) === 'district' && (await tid(page, 'popup').count()) === 0;

/** Every fight ends in a turn or two, and nobody gets cut (see the file comment). */
async function shortFights(page: Page): Promise<void> {
  await cf(page, app => {
    const intent = app.presenter.battle.intent;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- page-side battle object
    app.presenter.battle.intent = (b: any, signal: AbortSignal) => {
      b.player.hp = b.player.maxHp;
      for (const e of b.enemies) if (e.alive && e.hp > 1) e.hp = 1;
      return intent(b, signal);
    };
  });
}

/** Strong and stocked: the Tower can't be fled, and this spec is about screens, not balance. */
async function gearUp(page: Page): Promise<void> {
  await cf(page, app => {
    const g = app.store.game;
    g.level = 15;
    g.settings.rhythm = 'auto';
    app.dev.gear();
    app.dev.items();
    app.dev.gold();
    app.dev.heal();
  });
}

test('new game to the credits and into New Game+, at 360px', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = watchErrors(page);
  const check = (label: string) => expectNoOverflow(page, label);

  // A new character, through the UI.
  await page.goto('/');
  await cf(page, app => (app.turbo = true));
  await shortFights(page);
  await tid(page, 'settings').click();
  await tid(page, 'set:textSpeed:instant').click();
  await tid(page, 'sheet-close').click();
  await tid(page, 'new').click();
  await tid(page, 'save:1').click();
  await page.getByLabel('Your name').fill('Dawlin');
  await tid(page, 'next').click();
  await tid(page, 'pick:creole').click();
  await tid(page, 'next').click();
  await tid(page, 'pick:trumpet').click();
  await tid(page, 'next').click();
  await tid(page, 'go').click();
  await playUntil(page, () => atDistrict(page), { onScreen: sc => check(`prologue ${sc}`) });

  // Every district's boss, with a dev shortcut to each.
  for (const boss of BOSSES) {
    await gearUp(page);
    await cf(page, (app, b) => app.dev.boss(b), boss);
    await playUntil(
      page,
      async () =>
        (await cf(page, (app, b) => app.store.game.bossesDefeated.includes(b), boss)) &&
        (await atDistrict(page)),
      { onScreen: sc => check(`${boss} ${sc}`), maxSteps: 2500 },
    );
  }
  expect(await cf(page, app => app.store.game.story)).toEqual({ act: 'tower', step: 'form_second_line' });

  // The second line, at the club in Tremé.
  await cf(page, app => app.travel('treme'));
  await playUntil(page, () => atDistrict(page));
  await tid(page, 'place:club').click();
  await expect(tid(page, 'opt:secondline')).toBeVisible();
  await tid(page, 'opt:secondline').click();
  await playUntil(page, async () => (await tid(page, 'cards:roster').count()) > 0);
  await check('second line roster');
  await expectAccessible(page, 'second line roster');
  await playUntil(page, () => atDistrict(page), { onScreen: sc => check(`march ${sc}`) });
  expect(await cf(page, app => app.store.game.district)).toBe('tower');

  // The climb.
  await gearUp(page);
  await tid(page, 'place:towerlobby').click();
  await tid(page, 'opt:march').click();
  await playUntil(page, () => choiceShown(page, 'up'), {
    onScreen: sc => check(`climb ${sc}`),
    maxSteps: 2500,
  });
  // The Studio Floor: look at the vending machine's stock, rest, then go up.
  await tid(page, 'choice:snacks').click();
  await expect(tid(page, 'sheet')).toBeVisible();
  await check('vending machine');
  await expectAccessible(page, 'vending machine');
  await tid(page, 'sheet-close').click();
  await playUntil(page, () => choiceShown(page, 'rest'));
  await tid(page, 'choice:rest').click();
  await playUntil(page, () => choiceShown(page, 'up'));
  await expect(tid(page, 'choice:rest')).toHaveCount(0);
  await tid(page, 'choice:up').click();

  // The Conductor, then the Click: check the Blues overlay with axe the first time it opens.
  let bluesChecked = false;
  await playUntil(
    page,
    async () => {
      if (!bluesChecked && (await tid(page, 'blues').count())) {
        bluesChecked = true;
        await expectAccessible(page, 'play the blues', { settle: false });
      }
      return (await tid(page, 'cards:epilogue').count()) > 0;
    },
    { onScreen: sc => check(`bosses ${sc}`), maxSteps: 4000 },
  );
  expect(bluesChecked).toBe(true);
  await check('epilogue');
  await expectAccessible(page, 'epilogue');

  // The credits, then New Game+.
  await playUntil(page, () => choiceShown(page, 'ngplus'));
  await expect(tid(page, 'cards:credits')).toBeVisible();
  await check('credits');
  await expectAccessible(page, 'credits');
  await tid(page, 'choice:ngplus').click();
  await expect(tid(page, 'popup')).toBeVisible();
  await check('New Game+ confirm');
  await expectAccessible(page, 'New Game+ confirm');
  await tid(page, 'yes').click();
  await playUntil(page, async () => (await tid(page, 'story').innerText()).includes('NEON ORLEANS, 2084'));
  const g = await cf(page, app => ({ ngPlus: app.store.game.ngPlus, level: app.store.game.level }));
  expect(g).toEqual({ ngPlus: 1, level: 15 });
  expect(errors).toEqual([]);
});
