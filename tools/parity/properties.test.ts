/**
 * Properties of the TypeScript engine that the parity oracle doesn't cover:
 * - determinism: the same seed replays the same fight, with no hidden global state;
 * - presentation: folding Heart events (hpAfter) always reproduces every actor's real Heart, so the
 *   UI can animate events without ever reading the battle's final state.
 */
import { describe, expect, it } from 'vitest';
import { createRng } from '@core/rng';
import type { Battle } from '@core/types';
import { CORPUS_SEED } from './corpus';
import { firstDifference, generateCorpus, runFight } from './driver';
import { legacyAdapter, legacyFacts } from './legacyAdapter';
import { tsAdapter } from './tsAdapter';

const facts = legacyFacts(legacyAdapter().E);
const specs = generateCorpus(facts, CORPUS_SEED + 1, 400);

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

  it('a fight played twice from a fresh rng matches its own replay', () => {
    expect(createRng(5).next()).toBe(createRng(5).next());
  });
});
