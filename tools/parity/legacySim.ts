/**
 * Runs legacy/sim/sim.js with a seeded Math.random and returns its stdout. The TypeScript sim
 * (tools/sim.ts) must print byte-identical output for the same seed: that proves both the engine port
 * and the sim port preserved every draw.
 *
 * legacy/sim/sim.js builds its vm context with the host `Math`, so replacing `Math.random` for the
 * duration of the run seeds the sim's own draws and the engine's draws as one stream, exactly like
 * the original. Deleted at cutover.
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { createRng } from '@core/rng';
import { LEGACY_SRC } from './legacy';

const require = createRequire(import.meta.url);
const SIM = path.join(LEGACY_SRC, '..', 'sim', 'sim.js');

export function runLegacySim(seed: number): string {
  const rng = createRng(seed);
  const realRandom = Math.random;
  const realLog = console.log;
  const lines: string[] = [];
  Math.random = () => rng.next();
  console.log = (...args: unknown[]) => lines.push(args.map(String).join(' '));
  try {
    delete require.cache[require.resolve(SIM)];
    require(SIM);
  } finally {
    Math.random = realRandom;
    console.log = realLog;
  }
  return lines.join('\n');
}
