/** Stats, progression, prices, timing and Blues scoring. */
import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import { TIMING } from '@content/data';
import {
  bluesLabel,
  BLUES_STEP_MS,
  derivedStats,
  gainXp,
  gradeTiming,
  newGame,
  priceFor,
  scoreBlues,
  storyReached,
  xpToNext,
  createBattle,
  makeEnemy,
  timingSpec,
} from './index';

describe('stats', () => {
  it('a new level-1 Trumpet with Yat roots has class base stats plus +2 Tempo', () => {
    const st = derivedStats(newGame('T', 'yat', 'trumpet'));
    expect(st).toMatchObject({ maxHp: 55, maxFp: 25, chops: 14, grit: 6, tempo: 14, mojo: 8 });
    expect(st).toMatchObject({ oneZone: 1, critBonus: 0, dodgeBonus: 0, doubloonBonus: 0 });
  });

  it('sheet music and bandmate passives come from data', () => {
    const s = newGame('T', 'yat', 'trumpet');
    s.sheet = ['sm_swing', 'sm_rubato'];
    s.band.active = ['remy', 'static'];
    const st = derivedStats(s);
    expect(st.oneZone).toBeCloseTo(1.3);
    expect(st.dodgeBonus).toBeCloseTo(0.08 + 0.05);
    expect(st.doubloonBonus).toBeCloseTo(0.1);
  });

  it('inside the Tower, the second line adds 2% per marcher, up to 25%', () => {
    const s = newGame('T', 'yat', 'sousaphone');
    const base = derivedStats(s).maxHp;
    s.inTower = true;
    s.secondLine = Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, name: `M${i}` }));
    expect(derivedStats(s).maxHp).toBe(Math.round(base * 1.25));
  });
});

describe('progression', () => {
  it('XP to next level is 25 × L^1.5', () => {
    expect([1, 2, 5, 14].map(xpToNext)).toEqual([25, 71, 280, 1310]);
  });

  it('gainXp levels up repeatedly, unlocks skills at 3, and stops at the cap', () => {
    const s = newGame('T', 'yat', 'trumpet');
    const ups = gainXp(s, 25 + 71);
    expect(ups.map(u => u.level)).toEqual([2, 3]);
    expect(ups[1]!.newSkill).toBe('tr_s2');
    expect(ups[0]!.gains.heart).toBe(10);
    gainXp(s, 1e6);
    expect(s.level).toBe(15);
    expect(s.xp).toBe(0);
  });
});

describe('prices', () => {
  it('Creole roots get 5% off in Tremé and the Quarter; Cajun in the Bayou', () => {
    expect(priceFor(newGame('T', 'creole', 'trumpet'), 100, 'treme')).toBe(95);
    expect(priceFor(newGame('T', 'creole', 'trumpet'), 100, 'bayou')).toBe(100);
    expect(priceFor(newGame('T', 'cajun', 'trumpet'), 100, 'bayou')).toBe(95);
    expect(priceFor(newGame('T', 'yat', 'trumpet'), 100, 'treme')).toBe(100);
  });
});

describe('On the One', () => {
  it('grades by distance from center: ONE, pocket (2.3×), loose (4.2×), else clams', () => {
    const rng = createRng(1);
    const s = newGame('T', 'yat', 'trumpet');
    const b = createBattle(rng, s, [makeEnemy(rng, s, 'nutria', 1)]);
    const spec = timingSpec(b, 0.6);
    expect(spec.one).toBeCloseTo(0.06);
    expect(spec.durationMs).toBe(1200);
    expect(gradeTiming(spec, 0.6)).toBe(TIMING.one);
    expect(gradeTiming(spec, 0.6 + 0.1)).toBe(TIMING.pocket);
    expect(gradeTiming(spec, 0.6 + 0.2)).toBe(TIMING.loose);
    expect(gradeTiming(spec, 0.05)).toBe(TIMING.clams);
    expect(gradeTiming(spec, null)).toBe(TIMING.clams);
  });

  it('Play the Blues scores taps against six pads', () => {
    const perfect = Array.from({ length: 6 }, (_, i) => i * BLUES_STEP_MS);
    expect(scoreBlues(perfect).accuracy).toBe(1);
    expect(scoreBlues([]).accuracy).toBe(0);
    expect(scoreBlues([0, 0, 0]).scores.filter(x => x > 0)).toHaveLength(1); // each pad counts once
    expect(bluesLabel(0.9)).toBe('IN THE POCKET');
    expect(bluesLabel(0.1)).toBe('CLAMS');
  });
});

describe('story', () => {
  it('compares positions by act order, then step order', () => {
    const s = newGame('T', 'yat', 'trumpet');
    s.story = { act: 'storyville', step: 'buy_whispers' };
    expect(storyReached(s, { act: 'storyville', step: 'collect_ledger_pages' })).toBe(true);
    expect(storyReached(s, { act: 'storyville', step: 'enter_vault' })).toBe(false);
    expect(storyReached(s, { act: 'treme', step: 'congo_square' })).toBe(true);
    expect(storyReached(s, { act: 'bayou', step: 'take_airboat' })).toBe(false);
  });
});
