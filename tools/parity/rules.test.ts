/**
 * Rule oracle: rules that lived in v1's UI layer, now engine functions, checked against the legacy
 * UI code itself (legacy/dist loaded in jsdom) with the same seeded randomness.
 * See docs/adr/0003-determinism-and-parity.md.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { createRng, type Rng } from '@core/rng';
import type { EnemyId } from '@core/ids/enemies';
import type { ItemId } from '@core/ids/items';
import { ITEM_IDS } from '@core/ids/items';
import type { DistrictId } from '@core/ids/world';
import type { Actor, GameState } from '@core/types';
import { DISTRICTS, ENEMIES, GEAR, ITEMS, SHEET_MUSIC } from '@content/data';
import {
  buildEnemies,
  buy,
  createBattle,
  gainXp,
  makeEnemy,
  resolveVictory,
  sell,
  sellables,
  shopRow,
  storyFromIndex,
  useFieldItem,
} from '@engine/index';
import { firstDifference, randomState, type StateSpec } from './driver';
import { loadLegacyDom } from './legacyDom';
import { legacyAdapter, legacyFacts } from './legacyAdapter';
import { tsAdapter } from './tsAdapter';

/* eslint-disable @typescript-eslint/no-explicit-any */
const dom = loadLegacyDom();
const w = dom.w;
const facts = legacyFacts(legacyAdapter().E);
const ts = tsAdapter();
afterAll(() => dom.close());

/** Build the same save in the legacy page (as CF.S) and in TypeScript. */
function mirroredStates(spec: StateSpec, extra: { district?: DistrictId } = {}): { L: any; T: GameState } {
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
  if (extra.district) L.district = extra.district;
  const st = w.derivedStats(L);
  L.hp = Math.max(1, Math.round(st.maxHp * spec.hpFrac));
  L.fp = Math.round(st.maxFp * spec.fpFrac);
  L.nextFight = spec.nextFight ? JSON.parse(JSON.stringify(spec.nextFight)) : null;
  w.CF.S = L;
  const T = ts.buildState(spec) as GameState;
  if (extra.district) T.district = extra.district;
  return { L, T };
}

/** Seed the page's Math.random and a TS Rng with the same stream. */
function seeded(seed: number): Rng {
  const legacyRng = createRng(seed);
  dom.setRandom(() => legacyRng.next());
  return createRng(seed);
}

const actorView = (a: any) => ({
  defId: a.defId,
  name: a.name,
  level: a.level,
  hp: a.hp,
  stats: a.stats,
  skills: a.skills,
  boss: a.boss,
  elite: a.elite,
});

const specRng = createRng(4242);
const districtIds = Object.keys(DISTRICTS) as DistrictId[];
const spec = (level = specRng.int(1, 15)) =>
  randomState(specRng, facts, specRng.pick(facts.classes).id, level);

describe('rule parity with legacy v1 UI code', () => {
  it('buildEnemies: random street groups (with story rigging) and explicit groups', () => {
    for (let i = 0; i < 400; i++) {
      const district = specRng.pick(districtIds);
      const sp = spec();
      if (i % 3 === 0)
        sp.story = specRng.pick([
          { act: 'bayou', step: 2 },
          { act: 'storyville', step: 1 },
          { act: 'cemetery', step: 1 },
        ]);
      const { L, T } = mirroredStates(sp, { district });
      const ids: EnemyId[] | 'random' =
        i % 4 === 0
          ? (Array.from({ length: specRng.int(1, 3) }, () =>
              specRng.pick(DISTRICTS[district].pool),
            ) as EnemyId[])
          : 'random';
      const level = i % 5 === 0 ? specRng.int(1, 15) : undefined;
      const rng = seeded(1000 + i);
      const legacy = w.buildEnemies(ids === 'random' ? 'random' : [...ids], { level }).map(actorView);
      const mine = buildEnemies(rng, T, ids, { level }).map(actorView);
      const d = firstDifference(legacy, mine);
      if (d) expect.fail(`case ${i} (${district}, ${JSON.stringify(sp.story)}): ${d}`);
      expect(L.main).toBeTruthy();
    }
  });

  it('useFieldItem: every item, random saves', () => {
    for (let i = 0; i < 300; i++) {
      const sp = spec();
      const id = specRng.pick(ITEM_IDS as readonly ItemId[]);
      sp.bag = { ...sp.bag, [id]: specRng.int(0, 2) };
      const { L, T } = mirroredStates(sp);
      const rng = seeded(2000 + i);
      w.useFieldItem(id);
      useFieldItem(rng, T, id);
      const view = (s: any) => ({ hp: s.hp, fp: s.fp, bag: s.bag, perm: s.perm, nextFight: s.nextFight });
      const d = firstDifference(view(L), view(T));
      if (d) expect.fail(`case ${i} (${id}): ${d}`);
    }
  });

  const stockIds = [
    ...(Object.keys(ITEMS) as string[]).filter(id => ITEMS[id as ItemId].price > 0),
    ...Object.keys(GEAR),
    ...Object.keys(SHEET_MUSIC),
  ];
  it('shops: prices, buy rules, auto-equip, and selling', () => {
    try {
      shopCases();
    } finally {
      w.closeSheet();
    }
  });

  function shopCases() {
    for (let i = 0; i < 120; i++) {
      const district = specRng.pick(districtIds);
      const sp = spec();
      sp.doubloons = specRng.int(0, 2500);
      const { L, T } = mirroredStates(sp, { district });
      const stock = Array.from({ length: 8 }, () => ({ id: specRng.pick(stockIds) }));
      w.openShop('Parity Shop', stock);
      // Legacy rows: each buy button is data-act="buy:<id>:<price>", class primary when affordable.
      const legacyRows = [...w.document.querySelectorAll('#sheet [data-act^="buy:"]')].map((el: any) => {
        const [, id, price] = el.getAttribute('data-act').split(':');
        return { id, price: Number(price), canBuy: el.classList.contains('primary') };
      });
      const mine = stock
        .map(e => shopRow(T, e as never, district))
        .map(r => ({ id: r.id, price: r.price, canBuy: r.canBuy }));
      let d = firstDifference(legacyRows, mine);
      if (d) expect.fail(`rows case ${i}: ${d}`);
      // Buy every row in order (affordable or not), then sell everything sellable once.
      for (const r of mine) {
        w.CF.UI.sh.buy(`${r.id}:${r.price}`);
        buy(T, r.id, r.price);
      }
      for (const r of sellables(T)) {
        w.openShop('Parity Shop', stock, { tab: 'sell' });
        w.CF.UI.sh.sell(r.id);
        sell(T, r.id);
      }
      const view = (s: any) => ({
        doubloons: s.doubloons,
        bag: s.bag,
        gear: s.gear,
        gearBag: s.gearBag,
        sheet: s.sheet,
        hp: s.hp,
        fp: s.fp,
      });
      d = firstDifference(view(L), view(T));
      if (d) expect.fail(`purchases case ${i}: ${d}`);
    }
  }

  it('victory: rewards, story progress counters, quest counters, bounties, XP', async () => {
    if (!w.document.querySelector('#sheet').hidden) w.closeSheet();
    const stories = [
      { act: 'treme', step: 1 },
      { act: 'bayou', step: 2 },
      { act: 'storyville', step: 1 },
      { act: 'cemetery', step: 1 },
      { act: 'quarter', step: 1 },
    ];
    for (let i = 0; i < 120; i++) {
      const sp = spec();
      sp.story = specRng.pick(stories);
      sp.nextFight = null;
      const district: DistrictId = sp.story.act === 'quarter' ? 'quarter' : (sp.story.act as DistrictId);
      if (specRng.chance(0.4))
        sp.bag = { ...sp.bag, ledgerpage: specRng.int(0, 3), cryptkey: specRng.int(0, 3) };
      const { L, T } = mirroredStates(sp, { district });
      const context = specRng.pick(['street', 'street', 'bounty', 'quest'] as const);
      const counters = {
        tremeFights: specRng.int(0, 2),
        pups: specRng.int(0, 2),
        hornFights: specRng.int(0, 2),
      };
      L.counters = { ...counters };
      T.counters = { ...counters };
      if (specRng.chance(0.5)) {
        L.quests.horn = 'active';
        T.quests.horn = 'active';
      }
      if (context === 'bounty') {
        L.bounty = district;
        T.bounty = district;
      }
      const pool = [
        ...DISTRICTS[district].pool,
        DISTRICTS[district].elite,
        'rougarou_pup',
        'hush_patrol',
        'enforcer',
      ] as EnemyId[];
      const enemies = Array.from({ length: specRng.int(1, 3) }, () => ({
        id: specRng.pick(pool),
        level: specRng.int(1, 15),
      }));

      const legacyRng = createRng(3000 + i);
      dom.setRandom(() => legacyRng.next());
      const lb = w.createBattle(
        L,
        enemies.map(e => w.makeEnemy(L, e.id, e.level)),
        { context },
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

      const rng = createRng(3000 + i);
      const tb = createBattle(rng, T, enemies.map(e => makeEnemy(rng, T, e.id, e.level)) as Actor[], {
        context,
      });
      for (const e of tb.enemies) e.alive = false;
      tb.over = true;
      tb.result = 'win';
      const v = resolveVictory(tb);
      gainXp(T, v.rewards.xp);
      const view = (s: any, story: any) => ({
        doubloons: s.doubloons,
        bag: s.bag,
        counters: s.counters,
        story,
        bounty: s.bounty,
        bountiesDone: s.bountiesDone,
        level: s.level,
        xp: s.xp,
        hp: s.hp,
        fp: s.fp,
      });
      const d = firstDifference(view(L, storyFromIndex(L.main.act, L.main.step)), view(T, T.story));
      if (d)
        expect.fail(
          `case ${i} (${JSON.stringify(sp.story)}, ${context}, ${JSON.stringify(enemies.map(e => e.id))}): ${d}`,
        );
    }
  });

  it('the legacy page logged no errors', () => {
    expect(dom.errors).toEqual([]);
  });
});

void ENEMIES;
