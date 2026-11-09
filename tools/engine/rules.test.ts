/**
 * The engine's rules (enemy groups, field items, shops, victory bookkeeping) give the results in
 * tests/fixtures/rules.json for every seeded case: v1's results, frozen at cutover.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { firstDifference } from './driver';
import { tsFacts } from './facts';
import { ruleCases, runRules, type RuleResults } from './rules';
import { RULES_BASELINE } from './rulesBaseline';

const baseline = JSON.parse(fs.readFileSync(RULES_BASELINE, 'utf8')) as RuleResults;
const mine = runRules(ruleCases(tsFacts()));

describe('rules baseline', () => {
  it.each(['enemies', 'fieldItems', 'shops', 'victories'] as const)(
    '%s match tests/fixtures/rules.json',
    family => {
      const fails = mine[family]
        .map((r, i) => ({ i, d: firstDifference(baseline[family][i], JSON.parse(JSON.stringify(r))) }))
        .filter(x => x.d)
        .slice(0, 5)
        .map(x => `case ${x.i}: ${x.d}`);
      expect(fails, 'rules moved: if that was intended, run npm run rules:baseline').toEqual([]);
      expect(mine[family]).toHaveLength(baseline[family].length);
    },
  );
});
