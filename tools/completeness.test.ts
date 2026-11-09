/** The game is whole: every place, boss, story hint and lexicon link is wired up, enforced in CI. */
import { describe, expect, it } from 'vitest';
import { checkCompleteness } from './completeness';

describe('completeness', () => {
  it('every ported place, boss, story step and [[link]] is wired up', () => {
    expect(checkCompleteness()).toEqual([]);
  });
});
