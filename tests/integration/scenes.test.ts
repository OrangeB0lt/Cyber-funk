/**
 * Scene rules worth stating outright. The transcript baseline pins every case's exact text and save;
 * these name the behavior a case exists to show, so a re-baseline can't quietly undo it.
 */
import { describe, expect, it } from 'vitest';
import { QUESTS } from '@content/data';
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

  it("the credits' New Game+ button names the strength of the next cycle", async () => {
    const { entries } = await run('credits at New Game+2');
    const choice = entries.find(e => e.t === 'choose');
    expect(choice && choice.t === 'choose' && choice.options[0]).toContain('+90%');
  });

  it('the New Game+ confirm says half your Doubloons go', async () => {
    const c = cases.find(x => x.name === 'credits, New Game+')!;
    const { ScriptedPresenter } = await import('@app/testing/scriptedPresenter');
    const seen: string[] = [];
    const original = ScriptedPresenter.prototype.confirm;
    ScriptedPresenter.prototype.confirm = async function (title, body, yes, no, signal) {
      seen.push(body);
      return original.call(this, title, body, yes, no, signal);
    };
    try {
      await runTs(c, 0.5);
    } finally {
      ScriptedPresenter.prototype.confirm = original;
    }
    expect(seen.join(' ')).toContain('half your Doubloons');
  });

  it("the Lost Eye's journal points at Jackson Square, where its fight is", () => {
    expect(QUESTS.lost_eye.desc).toContain('Jackson Square');
    expect(QUESTS.lost_eye.desc).not.toContain('streets');
  });
});
