/**
 * Scene rules worth stating outright. The transcript baseline pins every case's exact text and save;
 * these name the behavior a case exists to show, so a re-baseline can't quietly undo it.
 */
import { describe, expect, it } from 'vitest';
import { cases, runTs } from './support/transcriptCases';

const run = (name: string) => {
  const c = cases.find(x => x.name === name);
  if (!c) throw new Error(`no transcript case "${name}"`);
  return runTs(c, 0.5);
};

describe('scene rules', () => {
  it('fleeing the Hush squad after smashing the broadcaster leaves it standing', async () => {
    const { view } = await run('jackson broadcaster, smash, flee the squad');
    expect(view.story).toEqual({ act: 'quarter', step: 'sabotage_broadcaster' });
    expect(view.flags).not.toContain('broadcasterDone');
  });
});
