import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@engine/index';
import { SceneInterrupt } from '@narrative/types';
import { bossStep, setupAct } from './devStates';
import { memorySaveStorage } from './save/storage';
import { Session } from './session';
import { ScriptedPresenter } from './testing/scriptedPresenter';

function session(seed = 7) {
  const s = new Session({
    presenter: new ScriptedPresenter(),
    storage: memorySaveStorage(),
    seed: () => seed,
  });
  s.newGame('Dawlin', 'yat', 'trumpet', { ...defaultSettings(), rhythm: 'auto', textSpeed: 'instant' });
  const g = s.game;
  g.flags.metRoux = true;
  g.story = { act: 'tower', step: 'climb_tower' };
  g.unlocked = ['treme', 'tower'];
  g.districtIntros = ['treme', 'tower'];
  return s;
}

/** A save made at the Studio Floor, mid-climb (v1 saves with inTower set at every floor). */
function midClimb(): string {
  const s = session();
  Object.assign(s.game, { district: 'tower', inTower: true, towerFloor: 2, towerFight: 0 });
  return s.serialize()!;
}

describe('the Tower climb across a reload', () => {
  it('a reload goes back to the Tower at the same floor (v1 restarted the climb)', async () => {
    const s = new Session({ presenter: new ScriptedPresenter(), storage: memorySaveStorage() });
    expect(s.load(midClimb())).toBeNull();
    expect((await s.resume()).status).toBe('done');
    expect(s.game).toMatchObject({ district: 'tower', inTower: false, towerFloor: 2 });
  });

  it('travel restarts the climb: the floor and the fight both reset (v1 kept the fight)', async () => {
    const s = new Session({ presenter: new ScriptedPresenter(), storage: memorySaveStorage() });
    s.load(midClimb());
    s.game.towerFight = 1;
    await s.resume();
    await s.travel('treme');
    await s.travel('tower');
    expect(s.game).toMatchObject({ district: 'tower', towerFloor: 0, towerFight: 0 });
  });

  it('getting cut in the Tower ends the climb: you wake at the club with it reset', async () => {
    const s = new Session({
      presenter: new ScriptedPresenter(),
      storage: memorySaveStorage(),
      battle: async () => {
        throw new SceneInterrupt('cut');
      },
    });
    s.load(midClimb());
    s.game.towerFight = 1;
    await s.run(
      c => c.fight({ enemies: ['hush_patrol'], context: 'tower', noFlee: true }).then(() => {}),
      'cut',
    );
    expect(s.game).toMatchObject({ district: 'treme', towerFloor: 0, towerFight: 0 });
  });
});

describe('the after-boss checkpoint', () => {
  /** At the Rougarou (Pump Station 13), every fight a stubbed win. */
  function atRougarou(onChoice?: (saved: string | null) => void) {
    const storage = memorySaveStorage();
    const s = new Session({
      presenter: new ScriptedPresenter({
        choose: options => {
          onChoice?.(storage.read());
          return options[0]!.key;
        },
      }),
      storage,
      seed: () => 7,
      battle: async () => 'win',
    });
    s.newGame('Dawlin', 'yat', 'trumpet', { ...defaultSettings(), rhythm: 'auto', textSpeed: 'instant' });
    const g = s.game;
    setupAct(g, 'bayou');
    g.district = 'bayou';
    g.story = bossStep('rougarou');
    g.bossIntros.push('rougarou');
    return { s, storage };
  }

  it('a reload during the post-fight choice plays the choice again, with the boss still beaten', async () => {
    let mid: string | null = null;
    // What a reload would find: the last save, taken when the post-fight choice comes up.
    const { s } = atRougarou(saved => (mid ??= saved));
    await s.run(ctx => ctx.boss('rougarou').then(() => {}), 'boss');
    expect(mid).not.toBeNull();

    const presenter = new ScriptedPresenter();
    const again = new Session({ presenter, storage: memorySaveStorage() });
    expect(again.load(mid)).toBeNull();
    expect(again.game.resume).toEqual({ kind: 'afterBoss', boss: 'rougarou' });
    expect(again.game.bossesDefeated).toContain('rougarou');
    expect((await again.resume()).status).toBe('done');
    // The spare-or-finish choice was offered again, and the story moved on to the cemetery.
    expect(presenter.transcript.some(e => e.t === 'choose')).toBe(true);
    expect(presenter.transcript.filter(e => e.t === 'battle' || e.t === 'fight')).toHaveLength(0);
    expect(again.game.choices.lucien).toBeDefined();
    expect(again.game.story.act).toBe('cemetery');
    expect(again.game.resume).toBeNull();
  });

  it('a reload after the post-fight scene finished goes to the district, no replay', async () => {
    const { s, storage } = atRougarou();
    await s.run(ctx => ctx.boss('rougarou').then(() => {}), 'boss');
    const presenter = new ScriptedPresenter();
    const again = new Session({ presenter, storage: memorySaveStorage() });
    again.load(storage.read());
    expect(again.game.resume).toBeNull();
    await again.resume();
    expect(presenter.transcript.some(e => e.t === 'choose')).toBe(false);
  });
});
