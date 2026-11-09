/**
 * The sim baseline: the sim's text output for a few fixed seeds, checked in under
 * tests/fixtures/sim/. tools/sim.test.ts fails when the output changes, so every balance change shows
 * up as a reviewable diff of these files.
 *
 *   npm run sim:baseline     # rewrite them (only when a change is meant to move the numbers)
 *
 * The baseline was first written at cutover, when the sim matched v1's byte for byte.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { runSim } from './sim';

/** The seeds the baseline covers (the ones the v1 parity test used). */
export const BASELINE_SEEDS = [1, 2, 1984] as const;

/** Where a seed's baseline lives. */
export const baselinePath = (seed: number) =>
  path.join(import.meta.dirname, '..', 'tests', 'fixtures', 'sim', `seed-${seed}.txt`);

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const seed of BASELINE_SEEDS) {
    fs.writeFileSync(baselinePath(seed), runSim(seed).text);
    console.log(`wrote ${path.relative(process.cwd(), baselinePath(seed))}`);
  }
}
