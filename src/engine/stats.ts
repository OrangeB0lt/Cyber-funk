/**
 * Character stats: class base + growth, roots, permanent bonuses, gear, buffs, sheet music and
 * bandmate passives. `derivedStats` is the single source of truth for the player's numbers.
 */
import { STAT_KEYS, type StatKey } from '@core/ids/combat';
import { SHEET_MUSIC_IDS } from '@core/ids/items';
import { BANDMATE_IDS } from '@core/ids/band';
import type { GameState, GearDef, PassiveMods } from '@core/types';
import type { SkillId, ToneId } from '@core/ids/combat';
import { clamp } from '@core/helpers';
import { BANDMATES, CLASSES, GEAR, ROOTS, SHEET_MUSIC, SKILL_LEVELS } from '@content/data';

/** The player's stats after every modifier. */
export interface DerivedStats {
  /** Attack power. */
  chops: number;
  /** Defense. */
  grit: number;
  /** Speed: turn order, dodge, SPLIT chance. */
  tempo: number;
  /** Luck: crit chance and Doubloon bonus. */
  mojo: number;
  /** Maximum Heart. */
  maxHp: number;
  /** Maximum Funk. */
  maxFp: number;
  /** Width multiplier of the ONE timing zone. */
  oneZone: number;
  /** Added crit chance. */
  critBonus: number;
  /** Chance to shrug off a negative status. */
  statusResist: number;
  /** Added dodge chance. */
  dodgeBonus: number;
  /** Per-tone damage bonuses. */
  toneBonus: Partial<Record<ToneId, number>>;
  /** Extra Doubloons from fights (fraction). */
  doubloonBonus: number;
}

/** Class stats at the current level, before any bonuses. */
export function classBase(s: GameState): Record<StatKey, number> {
  const c = CLASSES[s.cls];
  const out = {} as Record<StatKey, number>;
  STAT_KEYS.forEach((k, i) => {
    out[k] = c.base[i]! + c.growth[i]! * (s.level - 1);
  });
  return out;
}

/** Equipped gear, in slot order. */
export function gearList(s: GameState): GearDef[] {
  return (['instrument', 'threads', 'charm', 'mod'] as const)
    .map(k => (s.gear[k] ? GEAR[s.gear[k]!] : null))
    .filter((g): g is NonNullable<typeof g> => !!g);
}

/** Number of marchers in the formed second line. */
export function secondLineSize(s: GameState): number {
  return (s.secondLine || []).length;
}

/**
 * Passives from learned sheet music, then active bandmates, in table order.
 * PARITY: v1 applied these by id in this order; float sums depend on it.
 */
export function activePassives(s: GameState): PassiveMods[] {
  const out: PassiveMods[] = [];
  for (const id of SHEET_MUSIC_IDS) if (s.sheet.includes(id)) out.push(SHEET_MUSIC[id].passive);
  for (const id of BANDMATE_IDS) if (s.band.active.includes(id)) out.push(BANDMATES[id].passive);
  return out;
}

export function derivedStats(s: GameState): DerivedStats {
  const b = classBase(s);
  const r = ROOTS[s.roots];
  const out = { heart: b.heart, funk: b.funk, chops: b.chops, grit: b.grit, tempo: b.tempo, mojo: b.mojo };
  STAT_KEYS.forEach(k => {
    out[k] += (r.bonus[k] || 0) + (s.perm[k] || 0);
  });
  gearList(s).forEach(g => {
    (Object.keys(g.stats || {}) as StatKey[]).forEach(k => {
      out[k] += g.stats[k]!;
    });
  });
  const mult = { chops: 1, grit: 1, tempo: 1, mojo: 1 };
  if (s.mealBuff && s.mealBuff.fights > 0) {
    mult.chops += s.mealBuff.chops;
    mult.grit += s.mealBuff.grit;
  }
  if (s.dreamBuff && s.dreamBuff.fights > 0) {
    mult.chops += 0.1;
    mult.grit += 0.1;
    mult.mojo += 0.2;
  }
  if (s.inTower) {
    const bonus = Math.min(0.25, 0.02 * secondLineSize(s));
    (Object.keys(mult) as (keyof typeof mult)[]).forEach(k => {
      mult[k] += bonus;
    });
    out.heart *= 1 + bonus;
    out.funk *= 1 + bonus;
  }
  out.chops *= mult.chops;
  out.grit *= mult.grit;
  out.tempo *= mult.tempo;
  out.mojo *= mult.mojo;
  const st: DerivedStats = {
    chops: out.chops,
    grit: out.grit,
    tempo: out.tempo,
    mojo: out.mojo,
    maxHp: Math.round(out.heart),
    maxFp: Math.round(out.funk),
    oneZone: 1,
    critBonus: 0,
    statusResist: 0,
    dodgeBonus: 0,
    toneBonus: {},
    doubloonBonus: 0,
  };
  gearList(s).forEach(g => {
    if (g.oneZone) st.oneZone += g.oneZone;
    if (g.critBonus) st.critBonus += g.critBonus;
    if (g.statusResist) st.statusResist = Math.max(st.statusResist, g.statusResist);
    if (g.toneBonus) Object.assign(st.toneBonus, g.toneBonus);
    if (g.doubloonBonus) st.doubloonBonus += g.doubloonBonus;
  });
  for (const p of activePassives(s)) {
    if (p.oneZone) st.oneZone += p.oneZone;
    if (p.dodgeBonus) st.dodgeBonus += p.dodgeBonus;
    if (p.doubloonBonus) st.doubloonBonus += p.doubloonBonus;
  }
  return st;
}

/** Rounded stats for menus and level-up gains. */
export function displayStats(s: GameState): Record<StatKey, number> {
  const st = derivedStats(s);
  return {
    heart: st.maxHp,
    funk: st.maxFp,
    chops: Math.round(st.chops),
    grit: Math.round(st.grit),
    tempo: Math.round(st.tempo),
    mojo: Math.round(st.mojo),
  };
}

/** Round Heart and Funk and keep them within their maximums. */
export function clampVitals(s: GameState): void {
  const st = derivedStats(s);
  s.hp = clamp(Math.round(s.hp), 0, st.maxHp);
  s.fp = clamp(Math.round(s.fp), 0, st.maxFp);
}

/**
 * Cap Heart and Funk at their maximums, without rounding: what v1's renderTopbar did every time it
 * drew the top bar (06_ui_core.js:76). It only matters when a maximum drops without an explicit
 * clamp: leaving the Tower, where the second line's bonus ends.
 */
export function capVitals(s: GameState): void {
  const st = derivedStats(s);
  if (s.hp > st.maxHp) s.hp = st.maxHp;
  if (s.fp > st.maxFp) s.fp = st.maxFp;
}

/** Heal a fraction of max Heart. */
export function healPct(s: GameState, p: number): void {
  const st = derivedStats(s);
  s.hp = Math.min(st.maxHp, s.hp + Math.round(st.maxHp * p));
}

/** Restore a fraction of max Funk. */
export function funkPct(s: GameState, p: number): void {
  const st = derivedStats(s);
  s.fp = Math.min(st.maxFp, s.fp + Math.round(st.maxFp * p));
}

/** Full Heart and Funk. */
export function fullRest(s: GameState): void {
  const st = derivedStats(s);
  s.hp = st.maxHp;
  s.fp = st.maxFp;
}

/** Class skills unlocked at the current level. */
export function unlockedSkills(s: GameState): SkillId[] {
  const c = CLASSES[s.cls];
  return c.skills.filter((_id, i) => s.level >= SKILL_LEVELS[i]!);
}
