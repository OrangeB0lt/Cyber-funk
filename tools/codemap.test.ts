/**
 * The generated code map (docs/reference/code-map/) must match the code. When this fails, run
 * `npm run docs:codemap` and commit the pages with your change.
 */
import { describe, expect, it } from 'vitest';
import { generateCodeMap, staleCodeMapPages } from './codemap';

describe('code map', () => {
  it('is up to date with the code', () => {
    const stale = staleCodeMapPages(generateCodeMap());
    expect(stale, 'docs/reference/code-map is stale: run `npm run docs:codemap`').toEqual([]);
  }, 120_000);
});
