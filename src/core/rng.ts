/**
 * Seeded randomness for everything that affects game state.
 *
 * Why: a fight replayed from the same seed must play out identically. That is what makes the
 * balance sim and the baselines in tests/fixtures reproducible, and lets a bug report carry a seed.
 * (Until cutover it also let the parity oracles compare the engine with v1's draw for draw.) Game
 * logic never calls Math.random (ESLint enforces this outside ui/ and app/audio).
 *
 * The helper formulas (`float`, `int`, `pick`, `chance`) are copied exactly from v1's engine (`rnd`,
 * `irnd`, `pick`, `chance`), including the fact that `chance` always consumes a draw, even for p = 0
 * or p = 1. Changing any of them changes every seeded result in the game.
 */

/** Serializable generator state, stored in the save so a reload continues the same stream. */
export interface RngState {
  /** Internal mulberry32 state (a uint32). */
  readonly s: number;
  /** How many draws this stream has produced so far. */
  readonly draws: number;
}

/** A seeded uniform random source with the game's standard helpers. */
export interface Rng {
  /** Uniform float in [0, 1). Every helper below is built on this. */
  next(): number;
  /** Number of `next()` calls so far. The fight driver's traces stamp events with it. */
  readonly draws: number;
  /** Uniform float in [a, b). v1's `rnd`. */
  float(a: number, b: number): number;
  /** Uniform integer in [a, b], inclusive. v1's `irnd`. */
  int(a: number, b: number): number;
  /** Uniform element of a non-empty array. v1's `pick`. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. Always consumes one draw. v1's `chance`. */
  chance(p: number): boolean;
  /**
   * A stream for a sub-system (a battle, a scene). In the current implementation a fork shares
   * this stream, which keeps every game action on one sequence (as v1 had it, and as the baselines
   * expect). The label documents intent and leaves room for independent streams later.
   */
  fork(label: string): Rng;
  /** Snapshot for saving. */
  save(): RngState;
}

/** mulberry32: small, fast, good enough for games, and trivially serializable. */
function mulberry32Step(state: number): [next: number, value: number] {
  const s = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

class SeededRng implements Rng {
  private s: number;
  private n: number;

  constructor(state: RngState) {
    this.s = state.s | 0;
    this.n = state.draws;
  }

  get draws(): number {
    return this.n;
  }

  next(): number {
    const [s, value] = mulberry32Step(this.s);
    this.s = s;
    this.n++;
    return value;
  }

  float(a: number, b: number): number {
    return a + this.next() * (b - a);
  }

  int(a: number, b: number): number {
    return Math.floor(this.float(a, b + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)] as T;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  fork(_label: string): Rng {
    return this;
  }

  save(): RngState {
    return { s: this.s, draws: this.n };
  }
}

/** A new stream from an integer seed. */
export function createRng(seed: number): Rng {
  return new SeededRng({ s: seed | 0, draws: 0 });
}

/** Resume a stream from a saved snapshot. */
export function restoreRng(state: RngState): Rng {
  return new SeededRng(state);
}
