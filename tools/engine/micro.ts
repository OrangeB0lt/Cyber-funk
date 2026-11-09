/**
 * Hand-written fight setups for engine branches the random corpus rarely reaches.
 * Each one is a FightSpec with fixed seeds; add one whenever coverage shows a gap.
 */
import type { ContentFacts, FightSpec, StateSpec } from './driver';

function baseState(cls: string, level: number): StateSpec {
  return {
    cls,
    roots: 'yat',
    level,
    gear: { instrument: `inst_${cls}_pawnshop`, threads: null, charm: null, mod: null },
    sheet: [],
    bandActive: [],
    bandRecruited: [],
    bag: {},
    difficulty: 'local',
    ngPlus: 0,
    nextFight: null,
    mealBuff: null,
    dreamBuff: null,
    inTower: false,
    secondLineSize: 0,
    perm: {},
    hpFrac: 1,
    fpFrac: 1,
    doubloons: 100,
    story: { act: 'treme', step: 0 },
    progress: { gusFreed: false, questsDone: [] },
  };
}

export function micro(_f: ContentFacts): FightSpec[] {
  const specs: Omit<FightSpec, 'index'>[] = [];
  // A Session Clone copies the player's damaging skills. A level-1 Clarinet has none
  // (Sweet Trill only heals), so the clone falls back to the first class skill.
  for (let i = 0; i < 5; i++) {
    specs.push({
      kind: 'micro:clone-fallback',
      state: baseState('clarinet', 1 + (i % 2)),
      enemies: [{ id: 'session_clone', level: 3 }],
      battle: {},
      engineSeed: 1000 + i,
      policySeed: 2000 + i,
    });
  }
  return specs.map((s, i) => ({ ...s, index: 100_000 + i }));
}
