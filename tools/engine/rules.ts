/**
 * Rules that lived in v1's UI layer (building enemy groups, field items, shops, victory bookkeeping),
 * now engine functions: seeded random cases and what the v2 engine does with them.
 *
 * - tests/fixtures/rules.json holds the results as v1 gave them: it was written while the parity
 *   oracle ran the same cases through v1's UI code and the two matched (until cutover).
 * - tools/engine/rules.test.ts keeps the engine to them. `npm run rules:baseline` rewrites the file
 *   when a change is meant to move them.
 *
 * Every case is drawn from one spec stream in a fixed order, so the inputs regenerate exactly.
 */
import { createRng, type Rng } from '@core/rng';
import type { EnemyId } from '@core/ids/enemies';
import { ITEM_IDS, type ItemId } from '@core/ids/items';
import type { DistrictId } from '@core/ids/world';
import type { Actor, GameState } from '@core/types';
import { DISTRICTS, GEAR, ITEMS, SHEET_MUSIC } from '@content/data';
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
  useFieldItem,
} from '@engine/index';
import { randomState, type ContentFacts, type StateSpec } from './driver';
import { tsAdapter } from './tsAdapter';

/** A street or explicit enemy group. */
export interface EnemyCase {
  spec: StateSpec;
  district: DistrictId;
  ids: EnemyId[] | 'random';
  level?: number;
  /** Seed for the case's random stream. */
  seed: number;
}
/** One field item used on a save. */
export interface FieldItemCase {
  spec: StateSpec;
  id: ItemId;
  seed: number;
}
/** A shop with eight rows: buy every row, then sell everything once. */
export interface ShopCase {
  spec: StateSpec;
  district: DistrictId;
  stock: { id: string }[];
}
/** A won fight's bookkeeping. */
export interface VictoryCase {
  spec: StateSpec;
  district: DistrictId;
  context: 'street' | 'bounty' | 'quest';
  counters: { tremeFights: number; pups: number; hornFights: number };
  horn: boolean;
  enemies: { id: EnemyId; level: number }[];
  seed: number;
}
/** Every rule case, in the order they're drawn. */
export interface RuleCases {
  enemies: EnemyCase[];
  fieldItems: FieldItemCase[];
  shops: ShopCase[];
  victories: VictoryCase[];
}

/** Draw every case from the spec stream (seed 4242), in a fixed order (the rule oracle's, until cutover). */
export function ruleCases(facts: ContentFacts): RuleCases {
  const specRng = createRng(4242);
  const districtIds = Object.keys(DISTRICTS) as DistrictId[];
  const spec = (level = specRng.int(1, 15)) =>
    randomState(specRng, facts, specRng.pick(facts.classes).id, level);

  const enemies: EnemyCase[] = [];
  for (let i = 0; i < 400; i++) {
    const district = specRng.pick(districtIds);
    const sp = spec();
    if (i % 3 === 0)
      sp.story = specRng.pick([
        { act: 'bayou', step: 2 },
        { act: 'storyville', step: 1 },
        { act: 'cemetery', step: 1 },
      ]);
    const ids: EnemyId[] | 'random' =
      i % 4 === 0
        ? (Array.from({ length: specRng.int(1, 3) }, () =>
            specRng.pick(DISTRICTS[district].pool),
          ) as EnemyId[])
        : 'random';
    const level = i % 5 === 0 ? specRng.int(1, 15) : undefined;
    enemies.push({ spec: sp, district, ids, level, seed: 1000 + i });
  }

  const fieldItems: FieldItemCase[] = [];
  for (let i = 0; i < 300; i++) {
    const sp = spec();
    const id = specRng.pick(ITEM_IDS as readonly ItemId[]);
    sp.bag = { ...sp.bag, [id]: specRng.int(0, 2) };
    fieldItems.push({ spec: sp, id, seed: 2000 + i });
  }

  const stockIds = [
    ...(Object.keys(ITEMS) as ItemId[]).filter(id => ITEMS[id].price > 0),
    ...Object.keys(GEAR),
    ...Object.keys(SHEET_MUSIC),
  ];
  const shops: ShopCase[] = [];
  for (let i = 0; i < 120; i++) {
    const district = specRng.pick(districtIds);
    const sp = spec();
    sp.doubloons = specRng.int(0, 2500);
    const stock = Array.from({ length: 8 }, () => ({ id: specRng.pick(stockIds) }));
    shops.push({ spec: sp, district, stock });
  }

  const stories = [
    { act: 'treme', step: 1 },
    { act: 'bayou', step: 2 },
    { act: 'storyville', step: 1 },
    { act: 'cemetery', step: 1 },
    { act: 'quarter', step: 1 },
  ];
  const victories: VictoryCase[] = [];
  for (let i = 0; i < 120; i++) {
    const sp = spec();
    sp.story = specRng.pick(stories);
    sp.nextFight = null;
    const district = sp.story.act as DistrictId;
    if (specRng.chance(0.4))
      sp.bag = { ...sp.bag, ledgerpage: specRng.int(0, 3), cryptkey: specRng.int(0, 3) };
    const context = specRng.pick(['street', 'street', 'bounty', 'quest'] as const);
    const counters = {
      tremeFights: specRng.int(0, 2),
      pups: specRng.int(0, 2),
      hornFights: specRng.int(0, 2),
    };
    const horn = specRng.chance(0.5);
    const pool = [
      ...DISTRICTS[district].pool,
      DISTRICTS[district].elite,
      'rougarou_pup',
      'hush_patrol',
      'enforcer',
    ] as EnemyId[];
    const foes = Array.from({ length: specRng.int(1, 3) }, () => ({
      id: specRng.pick(pool),
      level: specRng.int(1, 15),
    }));
    victories.push({ spec: sp, district, context, counters, horn, enemies: foes, seed: 3000 + i });
  }
  return { enemies, fieldItems, shops, victories };
}

/** The parts of an enemy actor the rules decide. */
export const actorView = (a: Actor) => ({
  defId: a.defId,
  name: a.name,
  level: a.level,
  hp: a.hp,
  stats: a.stats,
  skills: a.skills,
  boss: a.boss,
  elite: a.elite,
});

/** The save, as a field item leaves it. */
export const fieldItemView = (s: GameState) => ({
  hp: s.hp,
  fp: s.fp,
  bag: s.bag,
  perm: s.perm,
  nextFight: s.nextFight,
});

/** The save, as shopping leaves it. */
export const shopView = (s: GameState) => ({
  doubloons: s.doubloons,
  bag: s.bag,
  gear: s.gear,
  gearBag: s.gearBag,
  sheet: s.sheet,
  hp: s.hp,
  fp: s.fp,
});

/** The save, as a victory leaves it. */
export const victoryView = (s: GameState) => ({
  doubloons: s.doubloons,
  bag: s.bag,
  counters: s.counters,
  story: s.story,
  bounty: s.bounty,
  bountiesDone: s.bountiesDone,
  level: s.level,
  xp: s.xp,
  hp: s.hp,
  fp: s.fp,
});

/** What the v2 engine does with every case. */
export interface RuleResults {
  enemies: ReturnType<typeof actorView>[][];
  fieldItems: ReturnType<typeof fieldItemView>[];
  shops: {
    rows: { id: string; price: number; canBuy: boolean }[];
    /** What was sold afterwards, in order (everything sellable, once). */
    sold: string[];
    after: ReturnType<typeof shopView>;
  }[];
  victories: ReturnType<typeof victoryView>[];
}

/** A v2 save for a case, in its district. */
function state(spec: StateSpec, district?: DistrictId): GameState {
  const g = tsAdapter().buildState(spec) as GameState;
  if (district) g.district = district;
  return g;
}

/** Run every case through the v2 engine. */
export function runRules(cases: RuleCases): RuleResults {
  const seeded = (seed: number): Rng => createRng(seed);
  return {
    enemies: cases.enemies.map(c =>
      buildEnemies(seeded(c.seed), state(c.spec, c.district), c.ids, { level: c.level }).map(actorView),
    ),
    fieldItems: cases.fieldItems.map(c => {
      const g = state(c.spec);
      useFieldItem(seeded(c.seed), g, c.id);
      return fieldItemView(g);
    }),
    shops: cases.shops.map(c => {
      const g = state(c.spec, c.district);
      const rows = c.stock
        .map(e => shopRow(g, e as never, c.district))
        .map(r => ({ id: r.id, price: r.price, canBuy: r.canBuy }));
      for (const r of rows) buy(g, r.id as never, r.price);
      const sold = sellables(g).map(r => r.id);
      for (const id of sold) sell(g, id);
      return { rows, sold, after: shopView(g) };
    }),
    victories: cases.victories.map(c => {
      const g = state(c.spec, c.district);
      g.counters = { ...c.counters };
      if (c.horn) g.quests.horn = 'active';
      if (c.context === 'bounty') g.bounty = c.district;
      const rng = seeded(c.seed);
      const b = createBattle(rng, g, c.enemies.map(e => makeEnemy(rng, g, e.id, e.level)) as Actor[], {
        context: c.context,
      });
      for (const e of b.enemies) e.alive = false;
      b.over = true;
      b.result = 'win';
      gainXp(g, resolveVictory(b).rewards.xp);
      return victoryView(g);
    }),
  };
}
