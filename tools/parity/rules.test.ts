/**
 * Rule oracle: rules that lived in v1's UI layer, now engine functions, checked against the legacy
 * UI code itself (legacy/dist loaded in jsdom) with the same seeded randomness. The cases and the v2
 * side are in tools/engine/rules.ts (they outlive this file); see docs/adr/0003-determinism-and-parity.md.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import type { DistrictId } from '@core/ids/world';
import { storyFromIndex } from '@engine/index';
import { firstDifference, type StateSpec } from '../engine/driver';
import { tsFacts } from '../engine/facts';
import { actorView, fieldItemView, ruleCases, runRules, shopView, victoryView } from '../engine/rules';
import { loadLegacyDom } from './legacyDom';

/* eslint-disable @typescript-eslint/no-explicit-any */
const dom = loadLegacyDom();
const w = dom.w;
afterAll(() => dom.close());

const cases = ruleCases(tsFacts());
const mine = runRules(cases);

/** The v1 save for a case, as CF.S. */
function legacyState(spec: StateSpec, district?: DistrictId): any {
  const settings = Object.assign(w.defaultSettings(), { difficulty: spec.difficulty, sound: false });
  const L = w.newState('Parity', spec.roots, spec.cls, settings, spec.ngPlus);
  L.level = spec.level;
  L.gear = { ...spec.gear };
  L.sheet = [...spec.sheet];
  L.band = { recruited: [...spec.bandRecruited], active: [...spec.bandActive] };
  L.bag = { ...spec.bag };
  L.mealBuff = spec.mealBuff ? { ...spec.mealBuff } : null;
  L.dreamBuff = spec.dreamBuff ? { ...spec.dreamBuff } : null;
  L.inTower = spec.inTower;
  L.secondLine = spec.secondLineSize
    ? Array.from({ length: spec.secondLineSize }, (_, k) => ({ id: `m${k}`, name: `M${k}` }))
    : null;
  Object.assign(L.perm, spec.perm);
  L.doubloons = spec.doubloons;
  L.main = { act: spec.story.act, step: spec.story.step };
  if (district) L.district = district;
  const st = w.derivedStats(L);
  L.hp = Math.max(1, Math.round(st.maxHp * spec.hpFrac));
  L.fp = Math.round(st.maxFp * spec.fpFrac);
  L.nextFight = spec.nextFight ? JSON.parse(JSON.stringify(spec.nextFight)) : null;
  w.CF.S = L;
  return L;
}

/** Seed the page's Math.random. */
function seeded(seed: number): void {
  const r = createRng(seed);
  dom.setRandom(() => r.next());
}

describe('rule parity with legacy v1 UI code', () => {
  it('buildEnemies: random street groups (with story rigging) and explicit groups', () => {
    cases.enemies.forEach((c, i) => {
      legacyState(c.spec, c.district);
      seeded(c.seed);
      const legacy = w
        .buildEnemies(c.ids === 'random' ? 'random' : [...c.ids], { level: c.level })
        .map(actorView);
      const d = firstDifference(legacy, mine.enemies[i]);
      if (d) expect.fail(`case ${i} (${c.district}, ${JSON.stringify(c.spec.story)}): ${d}`);
    });
  });

  it('useFieldItem: every item, random saves', () => {
    cases.fieldItems.forEach((c, i) => {
      const L = legacyState(c.spec);
      seeded(c.seed);
      w.useFieldItem(c.id);
      const d = firstDifference(fieldItemView(L), mine.fieldItems[i]);
      if (d) expect.fail(`case ${i} (${c.id}): ${d}`);
    });
  });

  it('shops: prices, buy rules, auto-equip, and selling', () => {
    try {
      cases.shops.forEach((c, i) => {
        const L = legacyState(c.spec, c.district);
        w.openShop('Parity Shop', c.stock);
        // Legacy rows: each buy button is data-act="buy:<id>:<price>", class primary when affordable.
        const rows = [...w.document.querySelectorAll('#sheet [data-act^="buy:"]')].map((el: any) => {
          const [, id, price] = el.getAttribute('data-act').split(':');
          return { id, price: Number(price), canBuy: el.classList.contains('primary') };
        });
        let d = firstDifference(rows, mine.shops[i]!.rows);
        if (d) expect.fail(`rows case ${i}: ${d}`);
        // Buy every row in order (affordable or not), then sell everything sellable once.
        for (const r of rows) w.CF.UI.sh.buy(`${r.id}:${r.price}`);
        for (const id of mine.shops[i]!.sold) {
          w.openShop('Parity Shop', c.stock, { tab: 'sell' });
          w.CF.UI.sh.sell(id);
        }
        d = firstDifference(shopView(L), mine.shops[i]!.after);
        if (d) expect.fail(`purchases case ${i}: ${d}`);
      });
    } finally {
      w.closeSheet();
    }
  });

  it('victory: rewards, story progress counters, quest counters, bounties, XP', async () => {
    if (!w.document.querySelector('#sheet').hidden) w.closeSheet();
    for (const [i, c] of cases.victories.entries()) {
      const L = legacyState(c.spec, c.district);
      L.counters = { ...c.counters };
      if (c.horn) L.quests.horn = 'active';
      if (c.context === 'bounty') L.bounty = c.district;
      seeded(c.seed);
      const lb = w.createBattle(
        L,
        c.enemies.map(e => w.makeEnemy(L, e.id, e.level)),
        { context: c.context },
      );
      for (const e of lb.enemies) e.alive = false;
      lb.over = true;
      lb.result = 'win';
      let finished = false;
      const done = w.victoryScreen(lb, {}).then(() => (finished = true));
      for (let k = 0; k < 50 && !finished; k++) {
        await new Promise(r => setTimeout(r, 0));
        const btn =
          w.document.querySelector('#popup:not([hidden]) [data-act]') ||
          w.document.querySelector('[data-act="continue"]');
        if (btn) btn.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      }
      if (!finished) expect.fail(`case ${i}: the legacy victory screen never finished`);
      await done;
      const d = firstDifference(victoryView(L, storyFromIndex(L.main.act, L.main.step)), mine.victories[i]);
      if (d)
        expect.fail(
          `case ${i} (${JSON.stringify(c.spec.story)}, ${c.context}, ${JSON.stringify(c.enemies.map(e => e.id))}): ${d}`,
        );
    }
  });

  it('the legacy page logged no errors', () => {
    expect(dom.errors).toEqual([]);
  });
});
