import { describe, expect, it } from 'vitest';
import { defaultSettings } from '@engine/index';
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

  it('travel restarts the climb, as in v1 (the floor resets; the fight index does not)', async () => {
    const s = new Session({ presenter: new ScriptedPresenter(), storage: memorySaveStorage() });
    s.load(midClimb());
    s.game.towerFight = 1;
    await s.resume();
    await s.travel('treme');
    await s.travel('tower');
    expect(s.game).toMatchObject({ district: 'tower', towerFloor: 0, towerFight: 1 });
  });
});
