/**
 * Write tests/fixtures/transcripts.jsonl: every transcript case's 2.0 transcript and save, at random
 * values 0, 0.5 and 0.99, one run per line. It was first written while the v1 transcript oracle
 * passed, so it holds v1's behavior.
 *
 *   npm run transcripts:baseline   # only when a change is meant to alter what a scene shows or saves
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cases, runTs } from './transcriptCases';

/** The fixture's path. */
export const TRANSCRIPTS_BASELINE = path.join(
  import.meta.dirname,
  '..',
  '..',
  'fixtures',
  'transcripts.jsonl',
);

/** The random values every case runs at. */
export const RANDOM_VALUES = [0, 0.5, 0.99] as const;

/** A run's key in the fixture. */
export const runKey = (name: string, rnd: number) => `${name} @ rng ${rnd}`;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const lines: string[] = [];
  for (const c of cases)
    for (const rnd of RANDOM_VALUES) {
      const r = await runTs(c, rnd);
      lines.push(JSON.stringify({ run: runKey(c.name, rnd), ...JSON.parse(JSON.stringify(r)) }));
    }
  fs.writeFileSync(TRANSCRIPTS_BASELINE, lines.join('\n') + '\n');
  console.log(`wrote ${lines.length} runs to ${path.relative(process.cwd(), TRANSCRIPTS_BASELINE)}`);
}
