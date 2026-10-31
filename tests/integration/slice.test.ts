/**
 * The vertical slice, played headlessly: new game → prologue → Tremé → three street wins →
 * Captain Hush → the Quarter unlocks. Real scenes, real engine, real save; a scripted player.
 */
import { describe, expect, it } from 'vitest';
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { ScriptedPresenter } from '@app/testing/scriptedPresenter';
import { defaultSettings } from '@engine/index';

function newSession(seed = 7) {
  const presenter = new ScriptedPresenter();
  const storage = memorySaveStorage();
  const session = new Session({ presenter, storage, seed: () => seed });
  session.newGame('Dawlin', 'yat', 'trumpet', { ...defaultSettings(), rhythm: 'auto', textSpeed: 'instant' });
  return { session, presenter, storage };
}

describe('vertical slice: prologue → Tremé → Captain Hush', () => {
  it('plays the prologue to the Tremé district', async () => {
    const { session, presenter } = newSession();
    expect((await session.startPrologue()).status).toBe('done');
    const g = session.game;
    expect(g.story).toEqual({ act: 'treme', step: 'win_street_fights' });
    expect(g.flags.metRoux && g.flags.hasCassette).toBe(true);
    expect(g.keyItems).toEqual(['umbrella', 'cassette']);
    expect(g.districtIntros).toContain('treme');
    expect(presenter.transcript.filter(e => e.t === 'battle')).toHaveLength(2);
    expect(presenter.lines()[0]).toMatch(/^NEON ORLEANS, 2084/);
    expect(presenter.transcript.at(-1)).toEqual({ t: 'route', route: { kind: 'district' } });
  });

  it('wins street fights until Congo Square opens, then beats Captain Hush', async () => {
    const { session, presenter, storage } = newSession(11);
    await session.startPrologue();
    const g = session.game;
    for (let i = 0; i < 60 && g.story.step === 'win_street_fights'; i++) {
      await session.hitTheStreets();
    }
    expect(g.story).toEqual({ act: 'treme', step: 'congo_square' });
    expect(presenter.transcript).toContainEqual({
      t: 'toast',
      text: 'The Hush are thinning out. Congo Square is next.',
    });

    g.level = Math.max(g.level, 4);
    session.enterPlace('congo');
    const opts = session.placeOptions('congo');
    expect(opts.map(o => o.key)).toEqual(['boss']);
    expect((await session.chooseOption('congo', 'boss'))?.status).toBe('done');

    expect(g.bossesDefeated).toContain('captain_hush');
    expect(g.notes).toEqual(['C']);
    expect(g.unlocked).toContain('quarter');
    expect(g.story).toEqual({ act: 'quarter', step: 'meet_odette' });
    expect(presenter.transcript).toContainEqual({
      t: 'toast',
      text: 'French Quarter & Frenchmen unlocked. Check Travel.',
    });
    // The save on disk is the post-boss state and loads back.
    const reloaded = new Session({ presenter: new ScriptedPresenter(), storage });
    expect(reloaded.load()).toBeNull();
    expect(reloaded.game.notes).toEqual(['C']);
  });

  it('Vox Perfecta: the keyed choice records the decision and grants the right reward', async () => {
    for (const pick of ['reprogram', 'shutdown'] as const) {
      const presenter = new ScriptedPresenter({
        choose: opts => opts.find(o => o.key === pick)?.key ?? opts[0]!.key,
      });
      const session = new Session({ presenter, storage: memorySaveStorage(), seed: () => 3 });
      session.newGame('Dawlin', 'yat', 'saxophone', { ...defaultSettings(), rhythm: 'auto' });
      const g = session.game;
      g.level = 8;
      g.story = { act: 'quarter', step: 'main_stage' };
      g.unlocked.push('quarter');
      g.district = 'quarter';
      await session.run(s => s.boss('vox_perfecta').then(() => {}), 'vox');
      expect(g.bossesDefeated).toContain('vox_perfecta');
      expect(g.choices.vox).toBe(pick === 'reprogram' ? 'reprogrammed' : 'shutdown');
      expect(g.gearBag.includes('mod_pitch')).toBe(pick === 'shutdown');
      expect(g.story).toEqual({ act: 'storyville', step: 'meet_celeste' });
    }
  });

  it('losing a street fight wakes you at the club with 20% fewer Doubloons', async () => {
    const presenter = new ScriptedPresenter({ intent: () => ({ type: 'vamp' }) });
    const session = new Session({ presenter, storage: memorySaveStorage(), seed: () => 5 });
    session.newGame('Dawlin', 'yat', 'clarinet', { ...defaultSettings(), rhythm: 'auto' });
    const g = session.game;
    g.doubloons = 100;
    g.story = { act: 'treme', step: 'win_street_fights' };
    const r = await session.run(
      s => s.fight({ enemies: ['hush_sergeant'], level: 6, context: 'street' }).then(() => {}),
      'lose',
    );
    expect(r).toEqual({ status: 'interrupted', kind: 'cut' });
    expect(g.doubloons).toBe(80);
    expect(g.district).toBe('treme');
    expect(presenter.lines().some(l => l.startsWith('Mama Roux:'))).toBe(true);
  });
});
