/**
 * The content facts the fight-corpus and rules generators need (driver.ts `ContentFacts`), read from
 * the v2 tables. Order matters: the generators pick from these lists by index, so the same seed gives
 * the same cases only while the order stays as it is (v1's order, which the parity content test
 * pinned until cutover). Reordering a table moves tests/fixtures/rules.json.
 */
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import {
  BANDMATES,
  BOSSES,
  CLASSES,
  DISTRICTS,
  ENEMIES,
  GEAR,
  INSTRUMENT_TIERS,
  ITEMS,
  ROOTS,
  SHEET_MUSIC,
  STATUSES,
} from '@content/data';
import type { ContentFacts } from './driver';

/** ContentFacts from the v2 content tables. */
export function tsFacts(): ContentFacts {
  const gearBySlot = { threads: [] as string[], charm: [] as string[], mod: [] as string[] };
  for (const g of Object.values(GEAR)) if (g.slot !== 'instrument') gearBySlot[g.slot].push(g.id);
  return {
    classes: Object.values(CLASSES).map(c => ({ id: c.id, skills: [...c.skills] })),
    roots: Object.keys(ROOTS),
    districts: Object.values(DISTRICTS).map(d => ({
      id: d.id,
      lvl: [...d.levels] as [number, number],
      groups: [...d.groups] as [number, number],
      pool: [...d.pool],
      elite: d.elite,
    })),
    enemies: Object.values(ENEMIES).map(e => ({
      id: e.id,
      lvl: [...e.levels] as [number, number],
      rival: !!e.rival,
    })),
    bosses: Object.values(BOSSES).map(b => ({ id: b.id, lvl: b.level })),
    battleItems: Object.values(ITEMS)
      .filter(i => i.battle)
      .map(i => i.id),
    gearBySlot,
    instrumentTiers: Object.keys(INSTRUMENT_TIERS),
    sheet: Object.keys(SHEET_MUSIC),
    bandmates: Object.keys(BANDMATES),
    statuses: Object.keys(STATUSES),
    acts: [...ACT_ORDER],
    stepsPerAct: Object.fromEntries(ACT_ORDER.map(a => [a, ACT_STEPS[a].length])),
  };
}
