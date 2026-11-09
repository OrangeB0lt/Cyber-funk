import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import {
  CODE_PREFIX,
  SAVE_VERSION,
  decodeSave,
  encodeSave,
  exportCode,
  importCode,
  summarize,
} from './format';

const game = () => newGame('Dawlin', 'yat', 'snare', undefined, 0);
const rng = () => {
  const r = createRng(42);
  r.next();
  return r.save();
};

describe('save format', () => {
  it('round-trips a game and its random stream', () => {
    const g = game();
    g.story = { act: 'treme', step: 'congo_square' };
    g.flags.metRoux = true;
    g.resume = { kind: 'tutorial', step: 2 };
    const at = new Date('2026-10-31T12:00:00.000Z');
    const r = decodeSave(encodeSave(g, rng(), at));
    expect(r).toEqual({ game: g, rng: rng(), savedAt: at.toISOString() });
  });

  it('refuses empty, corrupt, too-new and invalid saves with a reason', () => {
    expect(decodeSave(null)).toBe('empty');
    expect(decodeSave('{not json')).toBe('corrupt');
    expect(decodeSave(JSON.stringify({ hello: 'world' }))).toBe('corrupt');
    const env = JSON.parse(encodeSave(game(), rng()));
    expect(decodeSave(JSON.stringify({ ...env, version: SAVE_VERSION + 1 }))).toBe('too-new');
    expect(decodeSave(JSON.stringify({ ...env, game: { ...env.game, cls: 'kazoo' } }))).toBe('invalid');
    expect(
      decodeSave(JSON.stringify({ ...env, game: { ...env.game, story: { act: 'treme', step: 'nope' } } })),
    ).toBe('invalid');
  });

  it('loads a v2 save as v3, with the Tower climb at the start', () => {
    const env = JSON.parse(encodeSave(game(), rng()));
    delete env.game.towerFloor;
    delete env.game.towerFight;
    const r = decodeSave(JSON.stringify({ ...env, version: 2 }));
    expect(r).toMatchObject({ game: { towerFloor: 0, towerFight: 0 } });
  });

  it('loads a v3 save as v4, dropping the dead towerRested2 flag and pralinelady_king item', () => {
    const env = JSON.parse(encodeSave(game(), rng()));
    env.game.flags = { ...env.game.flags, metRoux: true, towerRested2: true };
    env.game.bag = { ...env.game.bag, beignet: 2, pralinelady_king: 1 };
    const r = decodeSave(JSON.stringify({ ...env, version: 3 }));
    if (typeof r === 'string') throw new Error(`v3 save refused: ${r}`);
    expect(r.game.flags).not.toHaveProperty('towerRested2');
    expect(r.game.flags.metRoux).toBe(true);
    expect(r.game.bag).not.toHaveProperty('pralinelady_king');
    expect(r.game.bag.beignet).toBe(2);
  });

  it('round-trips the after-boss checkpoint and the climb', () => {
    const g = game();
    Object.assign(g, { towerFloor: 3, towerFight: 1, resume: { kind: 'afterBoss', boss: 'rougarou' } });
    expect(decodeSave(encodeSave(g, rng()))).toMatchObject({ game: g });
    const bad = JSON.parse(encodeSave(g, rng()));
    bad.game.resume.boss = 'nobody';
    expect(decodeSave(JSON.stringify(bad))).toBe('invalid');
  });

  it('refuses an older version that has no migration', () => {
    const env = JSON.parse(encodeSave(game(), rng()));
    expect(decodeSave(JSON.stringify({ ...env, version: 1 }))).toBe('invalid');
  });

  it('export codes round-trip, including non-ASCII names', () => {
    const g = game();
    g.name = 'Tremé ♪';
    const raw = encodeSave(g, rng());
    const code = exportCode(raw);
    expect(code.startsWith(CODE_PREFIX)).toBe(true);
    expect(importCode(`  ${code}\n`)).toBe(raw);
    expect(importCode('CF1:abc')).toBeNull();
    expect(importCode(CODE_PREFIX + '%%%')).toBeNull();
  });

  it('summarizes a game for slot pickers and the server', () => {
    const g = game();
    g.story = { act: 'treme', step: 'congo_square' };
    expect(summarize(g)).toEqual({
      name: 'Dawlin',
      cls: 'snare',
      level: 1,
      act: 'treme',
      step: 'congo_square',
      district: 'treme',
      ngPlus: 0,
    });
  });
});
