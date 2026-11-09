/** Creating a new game. */
import type { ClassId, RootsId } from '@core/ids/characters';
import type { GameState, Settings } from '@core/types';
import { GEAR, NEW_GAME, ROOTS } from '@content/data';
import { derivedStats, fullRest } from './stats';

/** Settings for a brand-new player. */
export function defaultSettings(): Settings {
  return {
    textSpeed: 'normal',
    rhythm: 'manual',
    difficulty: 'local',
    sound: true,
    reduceMotion: false,
    textSize: 'M',
  };
}

/**
 * A fresh save: level 1, the roots' starting kit and Doubloons, a pawnshop instrument, full
 * Heart and Funk, at the start of the main quest (content/rules.ts NEW_GAME). `settings` is copied, never shared.
 */
export function newGame(
  name: string,
  roots: RootsId,
  cls: ClassId,
  settings?: Settings,
  ngPlus?: number,
): GameState {
  const r = ROOTS[roots];
  const s: GameState = {
    name: name || 'Lagniappe',
    roots,
    cls,
    level: 1,
    xp: 0,
    hp: 0,
    fp: 0,
    doubloons: NEW_GAME.doubloons + (r.doubloons || 0),
    day: 1,
    bag: { ...r.items },
    keyItems: [],
    gear: { instrument: `inst_${cls}_pawnshop`, threads: null, charm: null, mod: null },
    gearBag: [],
    sheet: [],
    blessings: 0,
    perm: { heart: 0, funk: 0, chops: 0, grit: 0, tempo: 0, mojo: 0 },
    band: { recruited: [], active: [] },
    notes: [],
    story: { ...NEW_GAME.story },
    quests: {},
    bossesDefeated: [],
    bossIntros: [],
    districtIntros: [],
    choices: {},
    flags: {},
    counters: {},
    district: NEW_GAME.district,
    unlocked: [NEW_GAME.district],
    book: {},
    lexicon: [],
    bounty: null,
    bountiesDone: [],
    mealBuff: null,
    dreamBuff: null,
    nextFight: null,
    sitInDay: 0,
    settings: settings ? { ...settings } : defaultSettings(),
    ngPlus: ngPlus || 0,
    secondLine: null,
    inTower: false,
    towerFloor: 0,
    towerFight: 0,
    resume: null,
  };
  (r.gear || []).forEach(g => {
    s.gearBag.push(g);
    const slot = GEAR[g].slot;
    if (!s.gear[slot]) s.gear[slot] = g as never;
  });
  const st = derivedStats(s);
  s.hp = st.maxHp;
  s.fp = st.maxFp;
  return s;
}

/** A deep copy of plain save data (v1's deepClone; structuredClone can't copy a Valtio proxy). */
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/**
 * New Game+ (v1: startNewGamePlus, 09:311-315): a fresh save for the same character one cycle up,
 * carrying level, XP, gear, the gear bag, sheet music, permanent stats, blessings, the bag, half the
 * Doubloons, the Lexicon, the Blue Book (every entry marked seen) and the day, then a full rest.
 * The story, Blue Notes, band, quests and flags start over.
 */
export function newGamePlus(old: GameState): GameState {
  const ns = newGame(old.name, old.roots, old.cls, old.settings, (old.ngPlus || 0) + 1);
  ns.level = old.level;
  ns.xp = old.xp;
  ns.gear = clone(old.gear);
  ns.gearBag = old.gearBag.slice();
  ns.sheet = old.sheet.slice();
  ns.perm = clone(old.perm);
  ns.blessings = old.blessings;
  ns.bag = clone(old.bag);
  ns.doubloons = Math.round(old.doubloons * 0.5);
  ns.lexicon = old.lexicon.slice();
  ns.book = clone(old.book);
  ns.day = old.day;
  for (const entry of Object.values(ns.book)) if (entry) entry.seen = true;
  fullRest(ns);
  return ns;
}
