/**
 * The Cutting Contest at Club Feu Follet: three rivals back to back. Winning the first time
 * recruits Sugar; after that it's exhibition rounds for Doubloons. (v1: 08_world.js cuttingContest.)
 */
import type { EnemyId } from '@core/ids/enemies';
import type { Scene } from '@narrative/types';
import { QUESTS } from '../../quests';
import { fmtD } from '../../world/streets.scene';

const RIVALS: readonly EnemyId[] = ['rival_hotrod', 'rival_bigmae', 'rival_twotone'];
const INTROS = [
  '"Hot Rod" Broussard steps up, trumpet already at his lips. "Let\'s see what Tremé sent."',
  'Big Mae Boudreaux settles the sousaphone on her shoulder and the floorboards complain. "Cute. Now the low end."',
  'Henri "Two-Tone" LeBlanc tips his hat and honks once, filthy. "Sweet or dirty, cher? Pick, because I\'m playing both."',
];
const BETWEEN = [
  'Hot Rod lowers his horn and grins. "Alright. Alright." The crowd is already looking at the door, where Big Mae is ducking in.',
  'Big Mae laughs so hard the glasses rattle. "Child, you can play." Two-Tone is already tuning.',
];

export const cuttingContest: Scene = async s => {
  s.title('Club Feu Follet');
  const exhibition = s.quest('cutting') === 'done';
  await s.say(
    'odette',
    exhibition
      ? '"Exhibition rounds. Same three, same rules, Doubloons for the winner. They\'ve been practicing."'
      : '"Three rounds. Hot Rod, Big Mae, then Two-Tone. The crowd decides, and the crowd likes whoever\'s still standing. Ready?"',
  );
  const c = await s.choose({ step: 'Step up', not: 'Not tonight' });
  if (c === 'not') return;
  const lvl = exhibition ? Math.max(4, Math.min(15, s.game.level)) : 0;
  for (let i = 0; i < 3; i++) {
    const res = await s.fight({
      enemies: [RIVALS[i]!],
      level: lvl || undefined,
      levels: 'own',
      context: 'cutting',
      noFlee: true,
      intro: INTROS[i],
    });
    if (res !== 'win') return;
    if (i < 2) {
      s.heal(0.2);
      s.funk(0.2);
      await s.narrate(BETWEEN[i]!);
    }
  }
  if (exhibition) {
    const g = s.scaleGold(60);
    s.game.doubloons += g;
    await s.say(
      'odette',
      `"Three for three. The house pays ${fmtD(g)}. Come back tomorrow, they'll want revenge."`,
    );
    return;
  }
  s.setQuest('cutting', 'done');
  s.recruit('sugar');
  await s.narrate(
    'Two-Tone bows. The whole room is on its feet. From the back, somebody starts singing over the applause, and the applause stops to listen.',
  );
  await s.say(
    'sugar',
    '"Sugar Desmarais. I sang backup on MoodSync for two years and I will never forgive myself. You got a band? You got a singer." (Sugar joins your band.)',
  );
  await s.xp(QUESTS.cutting.xp);
  s.gold(QUESTS.cutting.gold);
};
