/** The v2 content facts the generators use are v1's, order included (so seeds keep their fights). */
import { describe, expect, it } from 'vitest';
import { tsFacts } from '../engine/facts';
import { legacyAdapter, legacyFacts } from './legacyAdapter';

describe('content facts', () => {
  it('v2 tables give the same facts as v1, in the same order', () => {
    expect(tsFacts()).toEqual(legacyFacts(legacyAdapter().E));
  });
});
