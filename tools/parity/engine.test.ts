/**
 * Engine parity: the TypeScript engine must replay the whole corpus draw-for-draw like legacy v1.
 * On failure, the message names the fight, the first differing path, and the events around it.
 * See docs/adr/0003-determinism-and-parity.md.
 */
import { describe, expect, it } from 'vitest';
import { CORPUS_SEED, CORPUS_SIZE, MISC_SEED, MISC_SIZE } from '../engine/corpus';
import { firstDifference, generateCorpus, runFight, runMisc, type FightTrace } from '../engine/driver';
import { legacyAdapter, legacyFacts } from './legacyAdapter';
import { micro } from '../engine/micro';
import { tsAdapter } from '../engine/tsAdapter';

const legacy = legacyAdapter();
const ts = tsAdapter();
const facts = legacyFacts(legacy.E);

function explain(a: FightTrace, b: FightTrace, diff: string): string {
  const m = /^events\.(\d+)/.exec(diff);
  const at = m ? Number(m[1]) : -1;
  const around = (t: FightTrace) =>
    at < 0
      ? ''
      : t.events
          .slice(Math.max(0, at - 3), at + 2)
          .map(e => '    ' + JSON.stringify(e))
          .join('\n');
  return [
    `fight #${a.index} (${a.kind}) diverged at ${diff}`,
    at >= 0 ? `  legacy:\n${around(a)}\n  ts:\n${around(b)}` : '',
  ].join('\n');
}

describe('engine parity with legacy v1', () => {
  it('replays every corpus fight identically', () => {
    const specs = [...generateCorpus(facts, CORPUS_SEED, CORPUS_SIZE), ...micro(facts)];
    for (const spec of specs) {
      const a = runFight(legacy, spec);
      const b = runFight(ts, spec);
      const diff = firstDifference(a, b);
      if (diff) expect.fail(explain(a, b, diff));
    }
  });

  it('computes out-of-battle rules identically', () => {
    const a = runMisc(legacy, facts, MISC_SEED, MISC_SIZE);
    const b = runMisc(ts, facts, MISC_SEED, MISC_SIZE);
    expect(firstDifference(a, b)).toBeNull();
  });
});
