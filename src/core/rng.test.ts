import { describe, expect, it } from 'vitest';
import { createRng, restoreRng } from './rng';

describe('Rng', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    const a = createRng(42);
    const b = createRng(42);
    const c = createRng(43);
    const seqA = Array.from({ length: 50 }, () => a.next());
    expect(Array.from({ length: 50 }, () => b.next())).toEqual(seqA);
    expect(Array.from({ length: 50 }, () => c.next())).not.toEqual(seqA);
    expect(seqA.every(x => x >= 0 && x < 1)).toBe(true);
  });

  it('counts draws, and chance() always draws (even for p = 0 and p = 1)', () => {
    const r = createRng(1);
    r.chance(0);
    r.chance(1);
    r.pick([1]);
    r.int(3, 3);
    r.float(0, 1);
    expect(r.draws).toBe(5);
  });

  it("matches v1's helper formulas exactly", () => {
    const ref = createRng(7);
    const r = createRng(7);
    const x1 = ref.next();
    expect(r.float(0.9, 1.1)).toBe(0.9 + x1 * (1.1 - 0.9)); // rnd(a, b)
    const x2 = ref.next();
    expect(r.int(5, 20)).toBe(Math.floor(5 + x2 * (20 + 1 - 5))); // irnd(a, b)
    const x3 = ref.next();
    expect(r.pick(['a', 'b', 'c'])).toBe(['a', 'b', 'c'][Math.floor(x3 * 3)]); // pick(arr)
    const x4 = ref.next();
    expect(r.chance(0.5)).toBe(x4 < 0.5); // chance(p)
  });

  it('resumes from a saved state', () => {
    const r = createRng(99);
    r.next();
    r.next();
    const saved = r.save();
    const resumed = restoreRng(saved);
    expect(resumed.draws).toBe(2);
    expect(resumed.next()).toBe(r.next());
  });
});
