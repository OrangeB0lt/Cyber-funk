/** Creating a new game. */
import type { ClassId, RootsId } from '@core/ids/characters';
import type { GameState, Settings } from '@core/types';
import { GEAR, NEW_GAME, ROOTS } from '@content/data';
import { derivedStats } from './stats';

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
