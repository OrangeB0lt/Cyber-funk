/**
 * Captures reference screenshots of the legacy game at 360×740 (a TypeScript port of
 * legacy/test/shots.py), for side-by-side review while the React UI is rebuilt. Also reports
 * horizontal overflow per screen and any page errors.
 *
 *   npx tsx tools/parity/legacyShots.ts          → legacy/shots/*.png (gitignored)
 *   npx tsx tools/parity/legacyShots.ts finale   → just the finale's screens (24–31)
 *
 * Deleted at cutover.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { LEGACY_SRC } from './legacy';

const ROOT = path.join(LEGACY_SRC, '..');
const OUT = path.join(ROOT, 'shots');
const URL = `file://${path.join(ROOT, 'dist', 'cyberfunk.html')}`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const errors: string[] = [];
let overflows = 0;

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  const w = await page.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    screen: document.querySelector('#screen')?.scrollWidth ?? 0,
    inner: window.innerWidth,
  }));
  const over = w.doc > w.inner || w.body > w.inner || w.screen > w.inner + 1;
  if (over) overflows++;
  console.log(`${name}: widths ${JSON.stringify(w)}${over ? '  <-- OVERFLOW' : ''}`);
}
const act = (page: Page, a: string) => page.click(`[data-act="${a}"]`, { timeout: 4000 });
const has = async (page: Page, sel: string) => !!(await page.$(sel));

async function waitContinue(page: Page) {
  await page.waitForSelector('[data-act="continue"]', { timeout: 5000 });
  await act(page, 'continue');
  await sleep(50);
  if (await has(page, '[data-act="continue"]')) await act(page, 'continue');
  await sleep(80);
}

async function autoplayUntil(page: Page, done: string, max: number) {
  for (let i = 0; i < max; i++) {
    if (await has(page, done)) return;
    if (await has(page, '#popup:not([hidden])')) await page.click('#popup [data-act]');
    else if (await has(page, '[data-act="continue"]')) await act(page, 'continue');
    else if (await has(page, '.ecard.targetable')) await page.click('.ecard.targetable');
    else if (await has(page, '[data-act="act:riff"]')) {
      await act(page, 'act:riff');
      await sleep(600);
    } else await sleep(200);
    await sleep(90);
  }
}

/**
 * The finale's screens (P4), each reached by starting the v1 flow from a prepared state. The flow
 * before it is abandoned mid-await (resetFlows), which is fine for screenshots.
 */
async function finaleShots(page: Page) {
  const start = async (setup: string, flow: string) => {
    // `void`: evaluate would otherwise wait for the flow, which waits for the player.
    await page.evaluate(`closeSheet(); closePopup(); resetFlows(); ${setup}; void ${flow};`);
    await sleep(400);
  };
  const tower =
    "S.main = { act: 'tower', step: 1 }; S.district = 'tower'; S.flags.gusFreed = true; " +
    'S.secondLine = SECOND_LINE.filter(m => m.cond(S)).map(m => ({ id: m.id, name: m.name, line: m.line })); ' +
    "if (!S.unlocked.includes('tower')) S.unlocked.push('tower');";
  const until = async (sel: string, max = 30) => {
    for (let i = 0; i < max && !(await has(page, sel)); i++) {
      if (await has(page, '[data-act="continue"]')) await act(page, 'continue');
      await sleep(150);
    }
  };

  await start(
    "S.main = { act: 'tower', step: 0 }; S.flags.gusFreed = true; S.band.recruited = Object.keys(BANDMATES)",
    'secondLineScene()',
  );
  await until('.roster');
  await shot(page, '24_second_line');
  await start(`${tower}; S.towerFloor = 0; S.towerFight = 0; delete S.flags.towerEntered`, 'towerFlow()');
  await shot(page, '25_tower_entry');
  await start(
    `${tower}; S.towerFloor = 2; S.flags.towerEntered = true; delete S.flags.towerRested`,
    'towerFlow()',
  );
  await until('[data-act^="choice:"]', 12);
  await shot(page, '26_vending');
  await start(
    `${tower}; S.towerFloor = 3; S.flags.towerEntered = true; delete S.flags.conductorPre`,
    'towerFlow()',
  );
  await waitContinue(page).catch(() => {});
  await shot(page, '27_conductor');
  await start(
    `${tower}; S.towerFloor = 4; S.flags.towerEntered = true; S.flags.boss_conductor = true; delete S.flags.clickPre`,
    'towerFlow()',
  );
  await waitContinue(page).catch(() => {});
  await shot(page, '28_click_tutorial');
  await start(`${tower}; S.main = { act: 'tower', step: 3 }`, 'ending()');
  await until('.epilogue', 20);
  await shot(page, '29_epilogue');
  await start("S.flags.ending = true; S.main = { act: 'done', step: 0 }", 'creditsAndNewGamePlus()');
  await shot(page, '30_credits');
  await act(page, 'choice:0').catch(() => {});
  await sleep(400);
  await shot(page, '31_ngplus_confirm');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await sleep(600);
  if (process.argv.includes('finale')) {
    // A level-15 trumpet with instant text, straight into the finale's screens.
    await page.evaluate(
      "S = newState('Dawlin', 'creole', 'trumpet', Object.assign(defaultSettings(), { textSpeed: 'instant', rhythm: 'auto' }), 0); " +
        'S.level = 15; fullRest(S); UI.titleSettings.textSpeed = "instant"; renderTopbar();',
    );
    await finaleShots(page);
    await browser.close();
    console.log(`overflowing screens: ${overflows}; page errors: ${JSON.stringify(errors)}`);
    return;
  }
  await shot(page, '01_title');
  await page.evaluate(() => {
    (
      window as unknown as { CF: { UI: { titleSettings: { textSpeed: string } } } }
    ).CF.UI.titleSettings.textSpeed = 'instant';
  });
  await act(page, 'new');
  await sleep(200);
  await shot(page, '02_name');
  await page.fill('#name-input', 'Dawlin');
  await act(page, 'next');
  await sleep(200);
  await shot(page, '03_roots');
  await act(page, 'next');
  await sleep(200);
  await shot(page, '04_instrument');
  await act(page, 'pick:snare');
  await sleep(100);
  await act(page, 'next');
  await sleep(300);
  await shot(page, '05_howto');
  await act(page, 'go');
  await sleep(400);
  await shot(page, '06_prologue');
  for (let i = 0; i < 14 && !(await has(page, '[data-act="act:riff"]')); i++) {
    try {
      await waitContinue(page);
    } catch {
      break; // the battle screen has no Continue button; shots.py stops here too
    }
  }
  await page.waitForSelector('[data-act="act:riff"]', { timeout: 15000 });
  await sleep(300);
  await shot(page, '07_battle');
  await act(page, 'act:riff');
  await sleep(500);
  await shot(page, '08_timing');
  await page.mouse.click(180, 600);
  await sleep(800);
  await shot(page, '09_after_tap');
  await page.waitForSelector('[data-act="act:play"]', { timeout: 15000 });
  await sleep(200);
  await act(page, 'act:play');
  await sleep(200);
  await shot(page, '10_skills');
  await act(page, 'back');
  await act(page, 'act:bag');
  await sleep(300);
  await shot(page, '11_bag_battle');
  await act(page, 'sheet-close');
  await page.evaluate(() => {
    (window as unknown as { CF: { S: { settings: { rhythm: string } } } }).CF.S.settings.rhythm = 'auto';
  });
  await autoplayUntil(page, '.victory', 80);
  await shot(page, '12_victory');
  await autoplayUntil(page, '[data-act="streets"]', 60);
  await sleep(200);
  await shot(page, '13_district');
  await act(page, 'menu');
  await sleep(300);
  await shot(page, '14_menu');
  await act(page, 'm:status');
  await sleep(300);
  await shot(page, '15_status');
  await act(page, 'sheet-back');
  await act(page, 'm:journal');
  await sleep(200);
  await shot(page, '16_journal');
  await act(page, 'sheet-back');
  await act(page, 'm:settings');
  await sleep(200);
  await shot(page, '17_settings');
  await act(page, 'sheet-close');
  await act(page, 'place:kitchen');
  await sleep(300);
  await shot(page, '18_place');
  await act(page, 'opt:1');
  await sleep(300);
  await shot(page, '19_shop');
  await act(page, 'sheet-close');
  await act(page, 'leave');
  await sleep(200);
  await page.evaluate('openDevMenu()');
  await sleep(200);
  await shot(page, '20_dev');
  for (const a of ['items', 'gear', 'band', 'notes', 'boss:the_click']) await act(page, a);
  await sleep(500);
  for (let i = 0; i < 10 && !(await has(page, '[data-act="act:blues"]')); i++) {
    if (await has(page, '[data-act="continue"]')) await act(page, 'continue');
    await sleep(200);
  }
  await shot(page, '21_click_battle');
  await act(page, 'act:blues');
  await sleep(1200);
  await shot(page, '22_blues');
  await sleep(4000);
  await page.evaluate("CF.S.lexicon.push('cher', 'lagniappe'); openLexiconSheet();");
  await sleep(200);
  await shot(page, '23_lexicon');
  await finaleShots(page);
  await browser.close();
  console.log(`overflowing screens: ${overflows}; page errors: ${JSON.stringify(errors)}`);
}

await main();
