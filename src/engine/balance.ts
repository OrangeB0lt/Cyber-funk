/**
 * Balance knobs: enemy scaling, difficulty and the XP curve. Change these with the sim open
 * (`npm run sim`) and paste the diff into the PR. Per-content numbers (skill multipliers, boss
 * patterns, prices) live with the content; per-hit combat formulas live in combat/resolve.ts.
 */
import type { GameState } from '@core/types';

/** Enemy stat scaling. Bosses get extra Heart and Chops that grow past level 3. */
export const BALANCE = {
  hpBase: 16,
  hpPerL: 8,
  chopsBase: 4,
  chopsPerL: 1.3,
  bossHp: 4.5,
  bossHpPerL: 0.22,
  bossChops: 1.25,
  bossChopsPerL: 0.08,
  bossGrit: 1.2,
};

/** An enemy's stats at level L before boss, elite and per-enemy multipliers. */
export function enemyBaseStats(L: number) {
  return {
    hp: BALANCE.hpBase + BALANCE.hpPerL * L,
    chops: BALANCE.chopsBase + BALANCE.chopsPerL * L,
    grit: 4 + 1.6 * L,
    tempo: 6 + 1.6 * L,
    mojo: L,
  };
}

/** Difficulty setting → enemy damage and Heart multipliers. */
export function difficultyMods(s: GameState): { dmg: number; hp: number } {
  const d = s.settings.difficulty;
  return { dmg: d === 'tourist' ? 0.75 : d === 'grand' ? 1.25 : 1, hp: d === 'grand' ? 1.2 : 1 };
}

/** XP needed to go from level L to L + 1. */
export function xpToNext(L: number): number {
  return Math.round(25 * Math.pow(L, 1.5));
}
