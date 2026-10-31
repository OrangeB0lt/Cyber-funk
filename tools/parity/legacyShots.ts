/**
 * Captures reference screenshots of the legacy game at 360×740 (a TypeScript port of
 * legacy/test/shots.py), for side-by-side review while the React UI is rebuilt. Also reports
 * horizontal overflow per screen and any page errors.
 *
 *   npx tsx tools/parity/legacyShots.ts      → legacy/shots/*.png (gitignored)
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
  await browser.close();
  console.log(`overflowing screens: ${overflows}; page errors: ${JSON.stringify(errors)}`);
}

await main();
