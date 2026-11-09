import { describe, expect, it } from 'vitest';
import { defaultSettings, newGame, newGamePlus } from './state';
import { derivedStats } from './stats';

/** A finished first playthrough, as far as New Game+ cares. */
function finished() {
  const g = newGame('Dawlin', 'creole', 'trumpet', { ...defaultSettings(), rhythm: 'auto' }, 0);
  Object.assign(g, { level: 14, xp: 120, doubloons: 1001, day: 37, blessings: 2, hp: 1, fp: 1 });
  g.gear.charm = 'ch_fang';
  g.gearBag.push('ch_fang', 'thr_regalia');
  g.sheet.push('sm_swing');
  g.perm.mojo = 3;
  g.bag.gumbo = 4;
  g.lexicon.push('krewe');
  g.book.hush_patrol = { seen: false, weak: true };
  g.story = { act: 'done', step: 'finale' };
  g.notes.push('C', 'Eb');
  g.band.recruited.push('sugar');
  g.flags.ending = true;
  g.counters.endingCount = 1;
  g.keyItems.push('umbrella');
  g.secondLine = [{ id: 'gus', name: 'Gus' }];
  g.unlocked.push('quarter', 'tower');
  return g;
}

describe('newGamePlus (v1 startNewGamePlus)', () => {
  it('carries the build over and starts the story again, one cycle up', () => {
    const old = finished();
    const ns = newGamePlus(old);
    expect(ns).toMatchObject({
      name: 'Dawlin',
      roots: 'creole',
      cls: 'trumpet',
      ngPlus: 1,
      level: 14,
      xp: 120,
      doubloons: 501, // Math.round(1001 * 0.5)
      day: 37,
      blessings: 2,
      gear: old.gear,
      gearBag: old.gearBag,
      sheet: old.sheet,
      perm: old.perm,
      bag: old.bag,
      lexicon: old.lexicon,
      book: { hush_patrol: { seen: true, weak: true } },
      story: { act: 'treme', step: 'meet_roux' },
      notes: [],
      band: { recruited: [], active: [] },
      flags: {},
      counters: {}, // PARITY: endingCount resets (known-issues)
      keyItems: [],
      secondLine: null,
      unlocked: ['treme'],
    });
    const st = derivedStats(ns);
    expect([ns.hp, ns.fp]).toEqual([st.maxHp, st.maxFp]);
  });

  it('copies rather than shares: changing the new save leaves the old one alone', () => {
    const old = finished();
    const ns = newGamePlus(old);
    ns.gear.charm = null;
    ns.bag.gumbo = 0;
    ns.perm.mojo = 0;
    ns.book.hush_patrol!.weak = false;
    ns.settings.sound = !old.settings.sound;
    expect(old.gear.charm).toBe('ch_fang');
    expect(old.bag.gumbo).toBe(4);
    expect(old.perm.mojo).toBe(3);
    expect(old.book.hush_patrol!.weak).toBe(true);
    expect(old.settings.sound).not.toBe(ns.settings.sound);
  });

  it('counts the cycles', () => {
    expect(newGamePlus(newGamePlus(finished())).ngPlus).toBe(2);
  });
});
