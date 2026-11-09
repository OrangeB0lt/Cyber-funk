/**
 * Content oracle: every typed table, mapped back through the documented renames, deep-equals the
 * legacy table it came from. Function-valued fields are compared by position only (both sides
 * become "<fn>"); their behavior is covered by the engine oracle. Data that moved (bounty gold,
 * journal text, hint places, note pitches, passives) is checked against its legacy source.
 */
import { describe, expect, it } from 'vitest';
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import { NPC_IDS, PLACE_IDS, QUEST_IDS } from '@core/ids/world';
import { STAT_KEYS } from '@core/ids/combat';
import { NOTE_IDS } from '@core/ids/enemies';
import * as C from '@content/data';
import { firstDifference } from '../engine/driver';
import { loadLegacy } from './legacy';

/* eslint-disable @typescript-eslint/no-explicit-any */
const { E } = loadLegacy();

/** 2.0 key → v1 key. */
const RENAMES: Record<string, string> = {
  effects: 'fx',
  kind: 'k',
  amount: 'amt',
  level: 'lvl',
  levels: 'lvl',
};

/** Map a TS value back to v1's shape: rename keys, `custom` → `fn`, functions → "<fn>". */
function toLegacy(v: any, drop: string[] = []): any {
  if (typeof v === 'function') return '<fn>';
  if (Array.isArray(v)) return v.map(x => toLegacy(x, drop));
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, x] of Object.entries(v)) {
      if (drop.includes(k)) continue;
      const key = RENAMES[k] ?? k;
      out[key] = key === 'k' && x === 'custom' ? 'fn' : toLegacy(x, drop);
    }
    return out;
  }
  return v;
}
/** Functions → "<fn>" in a legacy value. */
const legacyView = (v: any): any => toLegacy(v);

function same(name: string, mine: any, theirs: any) {
  const d = firstDifference(mine, theirs);
  if (d) expect.fail(`${name}: ${d}`);
}

describe('content parity with legacy v1 tables', () => {
  it('combat tables', () => {
    same('TONES', toLegacy(C.TONES, ['id']), legacyView(E.TONES));
    same('STATUSES', toLegacy(C.STATUSES, ['id']), legacyView(E.STATUSES));
    same('TIMING', toLegacy(C.TIMING), legacyView(E.TIMING));
    same('SKILLS', toLegacy(C.SKILLS), legacyView(E.SKILLS));
    expect(Object.keys(C.SKILLS)).toEqual(Object.keys(E.SKILLS));
  });

  it('characters', () => {
    same('CLASSES', toLegacy(C.CLASSES), legacyView(E.CLASSES));
    same('ROOTS', toLegacy(C.ROOTS, ['discount']), legacyView(E.ROOTS));
    expect(C.ROOTS.creole.discount).toEqual({ districts: ['treme', 'quarter'], mult: 0.95 });
    expect(C.ROOTS.cajun.discount).toEqual({ districts: ['bayou'], mult: 0.95 });
    expect(C.ROOTS.yat.discount).toBeUndefined();
    expect([...STAT_KEYS]).toEqual(E.STAT_KEYS);
    expect([...C.SKILL_LEVELS]).toEqual(E.SKILL_LEVELS);
    expect(C.LEVEL_CAP).toBe(E.LEVEL_CAP);
  });

  it('enemies and bosses', () => {
    same('ENEMIES', toLegacy(C.ENEMIES, ['pack']), legacyView(E.ENEMIES));
    expect(Object.keys(C.ENEMIES)).toEqual(Object.keys(E.ENEMIES));
    const bosses: any = {};
    for (const [id, b] of Object.entries<any>(C.BOSSES)) {
      const { note, bluesTarget: _bt, next: _next, ...rest } = b;
      bosses[id] = { ...toLegacy(rest), drop: note };
    }
    same('BOSSES', bosses, legacyView(E.BOSSES));
    expect(Object.keys(C.BOSSES)).toEqual(Object.keys(E.BOSSES));
    expect(C.BOSSES.the_click.bluesTarget).toBe(true);
  });

  it('Blue Notes', () => {
    expect([...NOTE_IDS]).toEqual(E.SCALE_ORDER);
    for (const n of NOTE_IDS) {
      const { freq, ...rest } = C.NOTES[n];
      const { boss, ...legacy } = E.BLUE_NOTES[n];
      expect(rest).toEqual(legacy);
      expect(freq).toBe(E.NOTE_FREQ[n]);
      expect((C.BOSSES as any)[boss].note).toBe(n);
    }
  });

  it('items, gear, sheet music', () => {
    // Items call their effect list `use` in v1 (skills call it `fx`).
    const items: any = {};
    for (const [id, it] of Object.entries<any>(toLegacy(C.ITEMS, ['revive']))) {
      const { fx, ...rest } = it;
      items[id] = fx === undefined ? rest : { ...rest, use: fx };
    }
    same('ITEMS', items, legacyView(E.ITEMS));
    expect(C.ITEMS.grisgris.revive?.pct).toBe(0.3);
    same('GEAR', toLegacy(C.GEAR), legacyView(E.GEAR));
    expect(Object.keys(C.GEAR)).toEqual(Object.keys(E.GEAR));
    const tiers = Object.values(C.INSTRUMENT_TIERS).map(({ id, ...t }: any) => ({
      tier: id,
      ...toLegacy(t),
    }));
    same('INSTRUMENT_TIERS', tiers, legacyView(E.INSTRUMENT_TIERS));
    same('SHEET_MUSIC', toLegacy(C.SHEET_MUSIC, ['passive']), legacyView(E.SHEET_MUSIC));
  });

  it('band and second line', () => {
    const band: any = {};
    for (const [id, b] of Object.entries<any>(C.BANDMATES)) {
      const { passive: _p, passiveDesc, ...rest } = b;
      band[id] = { ...rest, passive: passiveDesc };
    }
    const legacyBand: any = {};
    for (const [id, b] of Object.entries<any>(E.BANDMATES)) {
      const { passiveId: _pid, ...rest } = b;
      legacyBand[id] = rest;
    }
    same('BANDMATES', band, legacyBand);
    same(
      'SECOND_LINE',
      C.SECOND_LINE.map(m => ({ id: m.id, name: m.name, line: m.line })),
      (E.SECOND_LINE as any[]).map(m => ({ id: m.id, name: m.name, line: m.line })),
    );
  });

  it('districts and bounties', () => {
    same('DISTRICTS', toLegacy(C.DISTRICTS, ['bountyGold']), legacyView(E.DISTRICTS));
    for (const [d, b] of Object.entries<any>(E.BOUNTIES)) {
      const district = (C.DISTRICTS as any)[d];
      expect(district.bountyGold).toBe(b.gold);
      expect(district.elite).toBe(b.elite);
      expect((C.ENEMIES as any)[b.elite].name).toBe(b.name);
    }
  });

  it('main quest: journal text, progress and hint places', () => {
    const hints: Record<string, Record<number, string>> = {
      treme: { 2: 'congo', 0: 'club' },
      quarter: { 0: 'feufollet', 1: 'jackson', 2: 'strip' },
      storyville: { 0: 'lantern', 2: 'lantern', 3: 'counting' },
      bayou: { 1: 'cabin', 3: 'pump' },
      cemetery: { 0: 'temple', 2: 'mausoleum' },
      garden: { 1: 'manor', 2: 'manor' },
      tower: { 0: 'club', 1: 'towerlobby', 2: 'towerlobby', 3: 'towerlobby' },
    };
    expect([...ACT_ORDER]).toEqual(E.ACT_ORDER);
    for (const act of ACT_ORDER) {
      const steps = ACT_STEPS[act] as readonly string[];
      expect(steps.length).toBe(E.MAIN_STEPS[act].length);
      steps.forEach((step, i) => {
        const mine = (C.ACTS[act] as any)[step];
        const legacy = E.MAIN_STEPS[act][i];
        expect(mine.journal).toBe(legacy.text);
        expect(mine.where).toBe(legacy.where);
        expect(mine.hintPlace).toBe(hints[act]?.[i]);
        if (legacy.progress) {
          const goal = mine.progress.goal;
          expect(goal).toBe(legacy.goal);
          const key = mine.progress.kind === 'item' ? mine.progress.item : mine.progress.counter;
          expect(key).toBe(legacy.progress);
        } else expect(mine.progress).toBeUndefined();
      });
    }
  });

  it('world tables: places, NPCs, quests, glossary', () => {
    const places: any = {};
    for (const [id, p] of Object.entries<any>(E.PLACES)) {
      const { kind: _kind, ...rest } = p;
      places[id] = rest;
    }
    same('PLACES', C.PLACES, places);
    same('NPCS', C.NPCS, legacyView(E.NPCS));
    same('QUESTS', C.QUESTS, legacyView(E.QUESTS));
    same('GLOSSARY', toLegacy(C.GLOSSARY, ['id']), legacyView(E.GLOSSARY));
  });

  it('id lists cover the legacy world tables', () => {
    expect([...PLACE_IDS]).toEqual(Object.keys(E.PLACES));
    expect([...NPC_IDS]).toEqual(Object.keys(E.NPCS));
    expect([...QUEST_IDS]).toEqual(Object.keys(E.QUESTS));
  });
});
