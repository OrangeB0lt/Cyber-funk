/**
 * Random streams for tests. Game code takes an `Rng`; these let a test decide exactly which way every
 * draw lands, so each branch of a scene can be reached on purpose.
 */
import type { Rng } from '@core/rng';

/** A random stream that always returns `c`, so every pick/chance lands the same way (the transcript cases run at 0, 0.5 and 0.99). */
export function constantRng(c: number): Rng {
  const r: Rng = {
    next: () => c,
    draws: 0,
    float: (a, b) => a + c * (b - a),
    int: (a, b) => Math.floor(a + c * (b + 1 - a)),
    pick: items => items[Math.floor(c * items.length)]!,
    chance: p => c < p,
    fork: () => r,
    save: () => ({ s: 0, draws: 0 }),
  };
  return r;
}

/** One `pick` call seen by a scripted stream: the pool it chose from and the index it took. */
export interface PickRecord {
  /** The items offered. */
  pool: readonly unknown[];
  /** The index chosen. */
  index: number;
}

/**
 * A stream that returns `values` in order, then repeats the last one. Every `pick` is recorded in
 * `picks` (when given), so a test can tell which random pools a scene drew from.
 */
export function scriptedRng(values: readonly number[], picks?: PickRecord[]): Rng {
  const vals = values.length ? values : [0];
  let i = 0;
  const next = () => {
    const v = vals[Math.min(i, vals.length - 1)]!;
    i++;
    return v;
  };
  const r: Rng = {
    next,
    get draws() {
      return i;
    },
    float: (a, b) => a + next() * (b - a),
    int: (a, b) => Math.floor(a + next() * (b + 1 - a)),
    pick: items => {
      const index = Math.floor(next() * items.length);
      picks?.push({ pool: items, index });
      return items[index]!;
    },
    chance: p => next() < p,
    fork: () => r,
    save: () => ({ s: 0, draws: i }),
  };
  return r;
}
