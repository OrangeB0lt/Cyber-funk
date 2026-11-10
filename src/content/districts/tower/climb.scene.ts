/**
 * The climb up Metronome Tower (v1: towerFlow, legacy/src/09_story.js:222-270), transliterated:
 * the Lobby and the Server Floors (two fights each, no fleeing), the Studio Floor's vending
 * machine, the Conductor in the Booth, and the Click at the Crown. Progress is kept in
 * `towerFloor` and `towerFight` and saved at every floor and fight.
 */
import type { FlagId } from '@core/ids/flags';
import type { Scene } from '@narrative/types';
import * as conductor from '../../bosses/conductor.scene';
import * as theClick from '../../bosses/the_click.scene';
import { recountSecondLine } from '../../story/secondLine.scene';
import { TOWER_FLOORS } from '../../world/tower';

/** March into the Tower, or pick the climb back up where it stopped. */
export const towerFlow: Scene = async s => {
  const g = s.game;
  g.inTower = true;
  s.clampVitals();
  s.title('Metronome Tower');
  await recountSecondLine(s);
  if (g.towerFloor === 0 && !s.flags.has('towerEntered')) {
    s.flags.set('towerEntered');
    // PARITY: v1 reads the second line's length unguarded (it always exists by now).
    await s.narrate(
      `The second line stops at the plaza. ${g.secondLine!.length} strong. The Hush at the doors look at the crowd, and the crowd looks back, and the Hush step aside, because that is what a crowd is for.`,
    );
    await s.narrate(
      'TUTORIAL: Inside the Tower, your second line gives you +' +
        Math.min(25, g.secondLine!.length * 2) +
        '% to all stats. Reloading mid-Tower resumes at your floor.',
    );
  }
  for (let f = g.towerFloor; f < TOWER_FLOORS.length; f++) {
    const fl = TOWER_FLOORS[f]!;
    g.towerFloor = f;
    s.save();
    s.title(fl.name);
    // v1's flags['towerintro_' + f]: one flag per floor (towerintro_0 … towerintro_4).
    const introFlag = `towerintro_${f}` as FlagId;
    if (!s.flags.has(introFlag) || fl.boss) {
      s.flags.set(introFlag);
      await s.narrate(fl.intro);
    }
    if (fl.fights) {
      for (let k = g.towerFight || 0; k < fl.fights.length; k++) {
        g.towerFight = k;
        s.save();
        const res = await s.fight({
          enemies: fl.fights[k]!,
          district: 'tower',
          level: 13 + Math.min(2, f + k),
          context: 'tower',
          noFlee: true,
        });
        // PARITY: only a flight gets here, and Tower fights can't be fled; a loss wakes you at the club.
        if (res !== 'win') {
          g.inTower = false;
          // PARITY: v1's renderDistrict redraws the top bar, which caps Heart and Funk at their
          // out-of-Tower maximums (whole numbers here, so clampVitals' rounding changes nothing).
          s.clampVitals();
          s.returnTo({ kind: 'district' });
          return;
        }
        s.title(fl.name);
        if (k < fl.fights.length - 1)
          await s.narrate(
            s.rng.pick([
              'The second line surges up the stairs behind you.',
              'Somebody on the line hands you a beignet. The Tower smells like powdered sugar now.',
              'Static jams the elevator music. It was MoodSync. It is now a breakbeat.',
            ]),
          );
      }
      g.towerFight = 0;
    }
    if (fl.vending) {
      await s.say(
        'vendor',
        'CLUNK. The machine lights up. BEIGNETS. CAFÉ AU LAIT. SAVE POINT (UNLICENSED). It has a slot for Doubloons and a sticker that says GUS WAS HERE.',
      );
      let leave = false;
      while (!leave) {
        const c = await s.choose({
          snacks: 'Buy snacks',
          save: 'Save game',
          rest: { label: 'Rest a minute (+25% Heart & Funk)', when: !s.flags.has('towerRested') },
          up: 'Go up. The Booth.',
        });
        if (c === 'snacks')
          await s.sheet({
            kind: 'shop',
            title: 'Studio Floor Vending',
            stock: [{ id: 'beignet' }, { id: 'cafe' }, { id: 'poboy' }, { id: 'gumbo' }],
            noSell: true,
            keeper: 'vendor',
          });
        else if (c === 'save') {
          if (s.save(true)) s.toast('Saved. The machine blinks approvingly.');
        } else if (c === 'rest') {
          s.flags.set('towerRested');
          s.heal(0.25);
          s.funk(0.25);
          await s.narrate(
            'You sit on the floor with your back to the machine. The second line sits with you. For a minute, nobody counts anything.',
          );
        } else leave = true;
      }
    }
    if (fl.boss === 'conductor') {
      s.story.set({ act: 'tower', step: 'face_conductor' });
      s.save();
      // PARITY: v1 marks the intro seen before it plays (conductorPre).
      if (!g.bossIntros.includes('conductor')) {
        g.bossIntros.push('conductor');
        await conductor.pre(s);
      }
      let res;
      do {
        res = await s.bossFight('conductor');
        if (res === 'retry') {
          s.title(fl.name);
          await s.narrate('The second line pulls you back out of the booth. Gus counts you in again.');
        }
      } while (res === 'retry');
      if (res !== 'win') {
        g.inTower = false;
        // PARITY: v1's renderDistrict redraws the top bar, which caps Heart and Funk at their
        // out-of-Tower maximums (whole numbers here, so clampVitals' rounding changes nothing).
        s.clampVitals();
        s.returnTo({ kind: 'district' });
        return;
      }
      if (!g.bossesDefeated.includes('conductor')) g.bossesDefeated.push('conductor');
      await conductor.post(s);
      continue;
    }
    if (fl.boss === 'the_click') {
      if (!g.bossIntros.includes('the_click')) {
        g.bossIntros.push('the_click');
        await theClick.pre(s);
      }
      let res;
      do {
        res = await s.bossFight('the_click', { clickPhase: true });
        if (res === 'retry') {
          s.title(fl.name);
          await s.narrate('The pendulum swings. You find the one again.');
        }
      } while (res === 'retry');
      if (res !== 'win') {
        g.inTower = false;
        // PARITY: v1's renderDistrict redraws the top bar, which caps Heart and Funk at their
        // out-of-Tower maximums (whole numbers here, so clampVitals' rounding changes nothing).
        s.clampVitals();
        s.returnTo({ kind: 'district' });
        return;
      }
      if (!g.bossesDefeated.includes('the_click')) g.bossesDefeated.push('the_click');
      await theClick.post(s);
      return;
    }
  }
};
