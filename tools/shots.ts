/**
 * Screenshots of the v2 game at 360×740, and side-by-side pairs with v1's reference shots, for
 * reviewing a screen against the original.
 *
 *   npx tsx tools/shots.ts            → shots/v2/*.png and shots/side-by-side/*.png (gitignored)
 *
 * It builds the test-mode app (the one with window.CF), serves it with vite preview, and reaches each
 * screen through the dev API and real play. A pair is made for every v2 shot that has a v1 shot of
 * the same name (legacy/shots, from `npx tsx tools/parity/legacyShots.ts`).
 */
import { execSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Page } from '@playwright/test';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'shots', 'v2');
const PAIRS = path.join(ROOT, 'shots', 'side-by-side');
const V1 = path.join(ROOT, 'legacy', 'shots');
const PORT = 4175;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const tid = (id: string) => `[data-testid="${id}"]`;
const has = async (page: Page, sel: string) => (await page.locator(sel).count()) > 0;

/** Run code against the GameApp in the page (`app` is window.CF). */
const cf = (page: Page, fn: string) => page.evaluate(`(app => { ${fn} })(window.CF)`);

async function shot(page: Page, name: string) {
  await sleep(250);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log(name);
}

/** Tap Continue, Play the Blues, RIFF at the first target, outcome buttons, until `sel` shows. */
async function until(page: Page, sel: string, max = 400) {
  for (let i = 0; i < max && !(await has(page, sel)); i++) {
    if (await has(page, tid('popup')))
      await page
        .locator(`${tid('popup')} button`)
        .last()
        .click();
    else if (await has(page, tid('continue'))) await page.click(tid('continue'));
    else if (await has(page, tid('act:blues'))) await page.click(tid('act:blues'));
    else if (await has(page, tid('act:riff'))) {
      await page.click(tid('act:riff'));
      const t = page.locator('[data-testid^="target:"]:not([disabled])');
      if (await t.count()) await t.first().click();
    } else if (await has(page, '[data-testid^="out:"]'))
      await page.locator('[data-testid^="out:"]').first().click();
    else await sleep(80);
  }
}

/**
 * A level-15 game with instant text, standing at `setup`'s state. The scene left over from the last
 * screen is aborted first (the Director runs one scene at a time).
 */
async function prepare(page: Page, setup: string) {
  await page.evaluate(`(async app => {
    await app.session.director.abort('next screenshot');
    app.closeSheet();
    const g = app.store.game;
    g.level = 15; g.settings.textSpeed = 'instant'; g.settings.rhythm = 'auto';
    g.flags.gusFreed = true; g.unlocked = ['treme','quarter','storyville','bayou','cemetery','garden','tower'];
    g.districtIntros = [...g.unlocked];
    ${setup}
  })(window.CF)`);
}

const TOWER = `
  g.story = { act: 'tower', step: 'climb_tower' }; g.district = 'tower'; g.inTower = false;
  g.secondLine = [{ id: 'gus', name: 'Gus Thibodeaux (Grand Marshal)' }, { id: 'mamaroux', name: 'Mama Roux' }];
`;

async function march(page: Page) {
  await cf(page, `app.enterPlace('towerlobby'); app.chooseOption('towerlobby', 'march');`);
  await sleep(300);
}

async function capture(page: Page) {
  await page.goto(`http://localhost:${PORT}/`);
  await cf(
    page,
    `
    app.turbo = true; app.view.titleSettings.textSpeed = 'instant';
    app.createCharacter('Dawlin', 'creole', 'trumpet'); app.closeSheet();
    // Short fights: the player at full Heart, every opponent at 1, whenever an action is asked for.
    const intent = app.presenter.battle.intent;
    app.presenter.battle.intent = (b, s) => {
      b.player.hp = b.player.maxHp;
      for (const e of b.enemies) if (e.alive && e.hp > 1) e.hp = 1;
      return intent(b, s);
    };
  `,
  );

  await prepare(
    page,
    `g.story = { act: 'tower', step: 'form_second_line' }; g.district = 'treme';
     g.band.recruited = ['sugar','static','remy','moses'];
     app.enterPlace('club'); app.chooseOption('club', 'secondline');`,
  );
  await until(page, tid('cards:roster'));
  await shot(page, '24_second_line');

  await prepare(page, `${TOWER} g.towerFloor = 0; g.towerFight = 0; delete g.flags.towerEntered;`);
  await march(page);
  await shot(page, '25_tower_entry');

  await prepare(page, `${TOWER} g.towerFloor = 2; g.flags.towerEntered = true; delete g.flags.towerRested;`);
  await march(page);
  await until(page, '[data-testid^="choice:"]', 20);
  await shot(page, '26_vending');

  await prepare(
    page,
    `${TOWER} g.towerFloor = 3; g.flags.towerEntered = true; g.bossIntros = g.bossIntros.filter(b => b !== 'conductor');`,
  );
  await march(page);
  await page.click(tid('continue'));
  await shot(page, '27_conductor');

  await prepare(
    page,
    `${TOWER} g.towerFloor = 4; g.flags.towerEntered = true; g.story.step = 'break_the_click';
     if (!g.bossesDefeated.includes('conductor')) g.bossesDefeated.push('conductor');
     g.bossIntros = g.bossIntros.filter(b => b !== 'the_click');`,
  );
  await march(page);
  await page.click(tid('continue'));
  await shot(page, '28_click_tutorial');

  await until(page, tid('cards:epilogue'), 600);
  await shot(page, '29_epilogue');
  await until(page, tid('cards:credits'));
  await shot(page, '30_credits');
  await page.click(tid('choice:ngplus'));
  await page.waitForSelector(tid('popup'));
  await shot(page, '31_ngplus_confirm');
}

/** One image per screen: v1 on the left, v2 on the right. */
async function pairs(page: Page) {
  fs.mkdirSync(PAIRS, { recursive: true });
  const names = fs.readdirSync(OUT).filter(f => f.endsWith('.png') && fs.existsSync(path.join(V1, f)));
  await page.setViewportSize({ width: 744, height: 800 });
  for (const f of names) {
    const img = (p: string) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    await page.setContent(`<body style="margin:0;background:#111;color:#ccc;font:12px monospace">
      <div style="display:flex;gap:8px;padding:8px">
        <figure style="margin:0;width:360px"><figcaption>v1 · ${f}</figcaption><img src="${img(path.join(V1, f))}" width="360"></figure>
        <figure style="margin:0;width:360px"><figcaption>v2 · ${f}</figcaption><img src="${img(path.join(OUT, f))}" width="360"></figure>
      </div></body>`);
    await page.screenshot({ path: path.join(PAIRS, f), fullPage: true });
  }
  console.log(`${names.length} side-by-side pairs in ${path.relative(ROOT, PAIRS)}`);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  execSync('npx vite build --mode test --outDir dist-e2e', { cwd: ROOT, stdio: 'ignore' });
  const server = spawn(
    'npx',
    ['vite', 'preview', '--outDir', 'dist-e2e', '--port', String(PORT), '--strictPort'],
    {
      cwd: ROOT,
      stdio: 'ignore',
    },
  );
  try {
    for (let i = 0; i < 50; i++) {
      if (
        await fetch(`http://localhost:${PORT}/`).then(
          r => r.ok,
          () => false,
        )
      )
        break;
      await sleep(200);
    }
    const browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 360, height: 740 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      serviceWorkers: 'block',
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    await capture(page);
    await pairs(await ctx.newPage());
    await browser.close();
    if (errors.length) console.log(`page errors: ${JSON.stringify(errors)}`);
  } finally {
    server.kill();
  }
}

await main();
