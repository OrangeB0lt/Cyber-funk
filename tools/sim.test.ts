/** The sim's output for the baseline seeds is unchanged (tests/fixtures/sim; npm run sim:baseline). */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runSim } from './sim';
import { BASELINE_SEEDS, baselinePath } from './simBaseline';

describe('sim baseline', () => {
  it.each(BASELINE_SEEDS)('seed %i matches tests/fixtures/sim', seed => {
    expect(runSim(seed).text, 'balance moved: if that was intended, run npm run sim:baseline').toBe(
      fs.readFileSync(baselinePath(seed), 'utf8'),
    );
  });
});
