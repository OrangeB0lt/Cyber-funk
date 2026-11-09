/**
 * Every transcript case shows and saves what tests/fixtures/transcripts.jsonl says: v1's behavior,
 * frozen at cutover (tests/integration/support/transcriptCases.ts). A change that's meant to alter a
 * scene rewrites the fixture with `npm run transcripts:baseline`, and the diff is the review.
 */
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cases, runTs } from './support/transcriptCases';
import { RANDOM_VALUES, TRANSCRIPTS_BASELINE, runKey } from './support/transcriptsBaseline';

const baseline = new Map(
  fs
    .readFileSync(TRANSCRIPTS_BASELINE, 'utf8')
    .trim()
    .split('\n')
    .map(line => {
      const { run, ...rest } = JSON.parse(line) as { run: string };
      return [run, rest] as const;
    }),
);

describe('scene transcripts match the baseline', () => {
  it('has a baseline run for every case, and no stale ones', () => {
    const keys = cases.flatMap(c => RANDOM_VALUES.map(r => runKey(c.name, r)));
    expect(
      keys.filter(k => !baseline.has(k)),
      'run npm run transcripts:baseline',
    ).toEqual([]);
    expect(
      [...baseline.keys()].filter(k => !keys.includes(k)),
      'run npm run transcripts:baseline',
    ).toEqual([]);
  });

  for (const c of cases)
    for (const rnd of RANDOM_VALUES)
      it(runKey(c.name, rnd), async () => {
        const mine = JSON.parse(JSON.stringify(await runTs(c, rnd)));
        expect(mine, 'the scene changed: if that was intended, run npm run transcripts:baseline').toEqual(
          baseline.get(runKey(c.name, rnd)),
        );
      });
});
