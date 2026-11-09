/**
 * EngineAdapter over the legacy vm engine, plus the ContentFacts the corpus generator needs.
 * Deleted at cutover together with legacy/.
 */
import { loadLegacy, type LegacyEngine } from './legacy';
import type { ContentFacts, EngineAdapter, StateSpec } from '../engine/driver';

/* eslint-disable @typescript-eslint/no-explicit-any */

export function legacyFacts(E: LegacyEngine): ContentFacts {
  const gearBySlot = { threads: [] as string[], charm: [] as string[], mod: [] as string[] };
  for (const g of Object.values<any>(E.GEAR))
    if (g.slot !== 'instrument') gearBySlot[g.slot as 'threads'].push(g.id);
  const stepsPerAct: Record<string, number> = {};
  for (const act of E.ACT_ORDER as string[]) stepsPerAct[act] = (E.MAIN_STEPS[act] || []).length || 1;
  return {
    classes: Object.values<any>(E.CLASSES).map(c => ({ id: c.id, skills: c.skills })),
    roots: Object.keys(E.ROOTS),
    districts: Object.values<any>(E.DISTRICTS).map(d => ({
      id: d.id,
      lvl: d.lvl,
      groups: d.groups,
      pool: d.pool,
      elite: d.elite,
    })),
    enemies: Object.values<any>(E.ENEMIES).map(e => ({ id: e.id, lvl: e.lvl, rival: !!e.rival })),
    bosses: Object.values<any>(E.BOSSES).map(b => ({ id: b.id, lvl: b.lvl })),
    battleItems: Object.values<any>(E.ITEMS)
      .filter(i => i.battle)
      .map(i => i.id),
    gearBySlot,
    instrumentTiers: (E.INSTRUMENT_TIERS as any[]).map(t => t.tier),
    sheet: Object.keys(E.SHEET_MUSIC),
    bandmates: Object.keys(E.BANDMATES),
    statuses: Object.keys(E.STATUSES),
    acts: E.ACT_ORDER,
    stepsPerAct,
  };
}

export function legacyAdapter(): EngineAdapter & { E: LegacyEngine } {
  const L = loadLegacy();
  const E = L.E;
  return {
    name: 'legacy',
    E,
    seed: n => L.seed(n),
    draws: () => L.draws(),
    buildState(spec: StateSpec) {
      const settings = Object.assign(E.defaultSettings(), { difficulty: spec.difficulty });
      const s = E.newState('Parity', spec.roots, spec.cls, settings, spec.ngPlus);
      s.level = spec.level;
      s.gear = { ...spec.gear };
      s.sheet = [...spec.sheet];
      s.band = { recruited: [...spec.bandRecruited], active: [...spec.bandActive] };
      s.bag = { ...spec.bag };
      s.nextFight = spec.nextFight ? JSON.parse(JSON.stringify(spec.nextFight)) : null;
      s.mealBuff = spec.mealBuff ? { ...spec.mealBuff } : null;
      s.dreamBuff = spec.dreamBuff ? { ...spec.dreamBuff } : null;
      s.inTower = spec.inTower;
      s.secondLine = spec.secondLineSize
        ? Array.from({ length: spec.secondLineSize }, (_, k) => ({ id: `m${k}`, name: `M${k}` }))
        : null;
      Object.assign(s.perm, spec.perm);
      s.doubloons = spec.doubloons;
      s.main = { act: spec.story.act, step: spec.story.step };
      const pr = spec.progress;
      s.flags = {
        gusFreed: pr.gusFreed || undefined,
        contracts: pr.contracts,
        vox: pr.vox,
        lucien: pr.lucien,
      };
      for (const q of pr.questsDone) s.quests[q] = 'done';
      const st = E.derivedStats(s);
      s.hp = Math.max(1, Math.round(st.maxHp * spec.hpFrac));
      s.fp = Math.round(st.maxFp * spec.fpFrac);
      return s;
    },
    makeEnemy: (s, e) => E.makeEnemy(s, e.id, e.level),
    createBattle: (s, enemies, opts) => E.createBattle(s, enemies, opts),
    runUntilPlayer: b => E.runUntilPlayer(b),
    playerAction: (b, intent, timing) => E.playerAction(b, { ...intent }, timing ? E.TIMING[timing] : null),
    battleRewards: b => E.battleRewards(b),
    applyBattleResult: b => E.applyBattleResult(b),
    gainXp: (s, n) => E.gainXp(s, n),
    events: b => b.events,
    normalizeEvent(e, role) {
      const out: Record<string, unknown> = { ...e };
      if (typeof out.target === 'string') out.target = role(out.target);
      if (typeof out.actor === 'string') out.actor = role(out.actor);
      return out;
    },
    view: b => b,
    projectState: s => ({
      hp: s.hp,
      fp: s.fp,
      xp: s.xp,
      level: s.level,
      doubloons: s.doubloons,
      bag: s.bag,
      book: s.book,
      perm: s.perm,
      mealBuff: s.mealBuff,
      dreamBuff: s.dreamBuff,
      nextFight: s.nextFight,
    }),
    skill(id) {
      const sk = E.SKILLS[id];
      return { fp: sk.fp, once: !!sk.once, damaging: sk.fx.some((f: any) => f.k === 'dmg') };
    },
    misc: s => ({
      derived: E.derivedStats(s),
      display: E.displayStats(s),
      unlocked: E.unlockedSkills(s),
      xpToNext: E.xpToNext(s.level),
      secondLine: (E.SECOND_LINE as any[]).filter(m => m.cond(s)).map(m => m.id),
      inventory: (() => {
        E.addItem(s, 'grisgris', 2);
        E.addItem(s, 'beignet');
        const removedMissing = E.removeItem(s, 'muffuletta_none');
        const removed = E.removeItem(s, 'beignet');
        E.fullRest(s);
        return { bag: { ...s.bag }, hp: s.hp, fp: s.fp, removedMissing, removed };
      })(),
    }),
    priceFor: (s, base, district) => E.priceFor(s, base, district),
  };
}
