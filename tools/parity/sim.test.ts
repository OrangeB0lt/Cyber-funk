/** The TypeScript sim prints byte-identical output to legacy/sim/sim.js for the same seed. */
import { describe, expect, it } from 'vitest';
import { runSim } from '../sim';
import { runLegacySim } from './legacySim';

describe('sim parity with legacy v1', () => {
  it.each([1, 2, 1984])('seed %i', seed => {
    expect(runSim(seed).text).toBe(runLegacySim(seed));
  });
});
