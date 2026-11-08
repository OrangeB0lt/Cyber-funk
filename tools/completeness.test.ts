/** The game is whole for every ported district (see src/content/pending.ts), enforced in CI. */
import { describe, expect, it } from 'vitest';
import { checkCompleteness } from './completeness';

describe('completeness', () => {
  it('every ported place, boss, story step and [[link]] is wired up', () => {
    expect(checkCompleteness()).toEqual([]);
  });
});
