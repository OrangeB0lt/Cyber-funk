import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { CODE_PREFIX, SAVE_VERSION, decodeSave, encodeSave, exportCode, importCode } from './persistence';

const game = () => newGame('Dawlin', 'yat', 'snare', undefined, 0);
const rng = () => {
  const r = createRng(42);
  r.next();
  return r.save();
};

describe('save format v2', () => {
  it('round-trips a game and its random stream', () => {
    const g = game();
    g.story = { act: 'treme', step: 'congo_square' };
    g.flags.metRoux = true;
    g.resume = { kind: 'tutorial', step: 2 };
    const r = decodeSave(encodeSave(g, rng()));
    expect(r).toEqual({ game: g, rng: rng() });
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
});
