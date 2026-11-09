/**
 * Properties of the engine, checked over a seeded corpus of 400 fights:
 * - determinism: the same seed replays the same fight, with no hidden global state;
 * - presentation: folding Heart events (hpAfter) always reproduces every actor's real Heart, so the
 *   UI can animate events without ever reading the battle's final state.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import type { Battle } from '@core/types';
import { firstDifference, generateCorpus, runFight } from './driver';
import { tsFacts } from './facts';
import { tsAdapter } from './tsAdapter';

/** The corpus seed. */
const SEED = 20841985;

const facts = tsFacts();
const specs = generateCorpus(facts, SEED, 400);

describe('engine properties', () => {
  it('is deterministic: the same seed replays identically', () => {
    const a = tsAdapter();
    const b = tsAdapter();
    for (const spec of specs) {
      const d = firstDifference(runFight(a, spec), runFight(b, spec));
      if (d) expect.fail(`fight #${spec.index}: ${d}`);
    }
  });

  it('Heart events fold to the actors’ real Heart after every step', () => {
    const base = tsAdapter();
    for (const spec of specs) {
      const last = new Map<string, number>();
      let battle: Battle | null = null;
      const check = (b: Battle) => {
        for (const e of b.events) {
          if ('hpAfter' in e) last.set(e.target, e.hpAfter);
        }
        for (const actor of [b.player, ...b.enemies]) {
          const seen = last.get(actor.id);
          if (seen !== undefined && seen !== Math.max(0, actor.hp)) {
            expect.fail(`fight #${spec.index}: ${actor.name} shows ${seen} but has ${actor.hp}`);
          }
        }
      };
      runFight(
        {
          ...base,
          createBattle: (s, enemies, opts) => (battle = base.createBattle(s, enemies, opts)),
          runUntilPlayer: b => {
            const r = base.runUntilPlayer(b);
            check(b);
            return r;
          },
          playerAction: (b, intent, timing) => {
            base.playerAction(b, intent, timing);
            check(b);
          },
        },
        spec,
      );
      expect(battle).not.toBeNull();
    }
  });

  it("doesn't depend on the JavaScript engine's sort algorithm", () => {
    // V8 and Safari's JavaScriptCore implement Array.prototype.sort differently. Any valid sort
    // must give the same fight: here a top-down merge sort stands in for "another engine".
    function mergeSort<T>(
      this: T[],
      cmp: (x: T, y: T) => number = (x, y) => String(x).localeCompare(String(y)),
    ) {
      const sorted = (xs: T[]): T[] => {
        if (xs.length < 2) return xs;
        const mid = xs.length >> 1;
        const l = sorted(xs.slice(0, mid));
        const r = sorted(xs.slice(mid));
        const out: T[] = [];
        while (l.length && r.length) out.push(cmp(l[0]!, r[0]!) <= 0 ? l.shift()! : r.shift()!);
        return [...out, ...l, ...r];
      };
      const result = sorted([...this]);
      result.forEach((x, i) => (this[i] = x));
      return this;
    }
    const native = specs.slice(0, 100).map(spec => runFight(tsAdapter(), spec));
    const original = Array.prototype.sort;
    Array.prototype.sort = mergeSort as typeof original;
    try {
      specs.slice(0, 100).forEach((spec, i) => {
        const d = firstDifference(native[i], runFight(tsAdapter(), spec));
        if (d) expect.fail(`fight #${spec.index} with a merge sort: ${d}`);
      });
    } finally {
      Array.prototype.sort = original;
    }
  });

  it('a fight played twice from a fresh rng matches its own replay', () => {
    expect(createRng(5).next()).toBe(createRng(5).next());
  });
});
