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

  it("New Game+ doesn't hand out story gear you already own", async () => {
    const { view } = await run('archivist boss flow, New Game+ with the Regalia already owned');
    expect(view.gearBag.filter(id => id === 'thr_regalia')).toHaveLength(1);
    expect(view.gear.threads).toBe('thr_regalia');
  });

  it("New Game+ doesn't offer a second legendary instrument", async () => {
    const { entries } = await run('pawn talk, New Game+ with five notes and the legendary already owned');
    const options = entries.find(e => e.t === 'options');
    expect(options && options.t === 'options' && options.labels.some(l => l.includes('legendary'))).toBe(
      false,
    );
  });
});
