/**
 * Prologue: The Dirge. Gus's jazz funeral, the Hush interrupt, two tutorial fights, and the
 * cassette at the club. (v1: legacy/src/09_story.js prologue / prologueEnd / resumeGame.)
 */
import type { Scene, SceneContext } from '@narrative/types';

const TUTORIAL_1 =
  'One Hush Patrolman steps up, citation pad out. The Hush are weak to FUNK and resist BLUE.';
const TUTORIAL_2 = 'Two more Patrolmen. The band plays louder.';

/** The opening, from the funeral through the second tutorial fight. */
export const prologue: Scene = async s => {
  s.game.story = { act: 'treme', step: 'meet_roux' };
  s.game.district = 'treme';
  s.title('Prologue: The Dirge');
  await s.narrate(
    'NEON ORLEANS, 2084. Tremé, at dusk. The neon comes on over the shotgun houses one sign at a time, pink and green and gold, and under it a brass band is walking slow down Claiborne Avenue with a casket on their shoulders.',
  );
  await s.narrate(
    'Auguste "Gus" Thibodeaux. Grand Marshal of the Lagniappe Social Aid & Pleasure Club. The man who taught you to play. A Metronome raid caught him in a rehearsal room last week with a device called the Mute, and when the Hush left, the song was gone out of him, and then so was he.',
  );
  await s.narrate(
    "This is a [[jazz funeral]]. Dirge on the way there. You know how it goes. You're in the band.",
  );
  await s.say(
    'mamaroux',
    '"Where y\'at, baby. Come here. You walk next to me. You hold your horn up where he can see it."',
  );
  await s.narrate(
    'The dirge goes down Claiborne under the overpass. The whole neighborhood falls in behind. Umbrellas up. Handkerchiefs out. Nobody dancing yet. Not yet.',
  );
  await s.narrate(
    'Then the [[MoodSync]] speaker on the corner cuts out, and a white chrome van pulls across the road, and [[the Hush]] get out.',
  );
  await s.say('hush', '"Unlicensed assembly. Unlicensed syncopation detected. Cease all swing. Disperse."');
  await s.narrate('The band stops. Mama Roux does not. She looks at you. Everybody looks at you.');
  await s.narrate(
    "TUTORIAL: When you RIFF, PLAY, or SOLO, a timing bar sweeps across. Tap anywhere as the marker crosses the glowing ONE zone for ×1.5 damage and +10 Groove. The pocket around it is ×1.2. Miss everything and it's CLAMS (×0.6). Build Groove to 100 and your SOLO lights up.",
  );
  await tutorialFight(s, 1, TUTORIAL_1);
  s.title(null);
  await s.narrate(
    'The patrolman goes down in the street and the band, which has not stopped watching, starts up again. Slow. The dirge. The van doors open.',
  );
  await s.narrate(
    'TUTORIAL: VAMP halves incoming damage until your next turn and restores 15% Funk. BAG uses an item. Every enemy has one weakness (×1.5) and usually one resistance (×0.5): find them and the Blue Book remembers.',
  );
  await tutorialFight(s, 2, TUTORIAL_2);
  await prologueEnd(s);
};

/** A tutorial fight. The save remembers it, so quitting mid-fight restarts it on load. */
async function tutorialFight(s: SceneContext, step: 1 | 2, intro?: string): Promise<void> {
  s.game.resume = { kind: 'tutorial', step };
  s.save();
  await s.fight({
    enemies: step === 1 ? ['hush_patrol'] : ['hush_patrol', 'hush_patrol'],
    level: 1,
    context: 'tutorial',
    noFlee: true,
    intro,
  });
}

/** After the second fight: cut the body loose, the cassette, and the mission. */
export async function prologueEnd(s: SceneContext): Promise<void> {
  s.game.resume = null;
  s.title(null);
  await s.narrate(
    "The van backs up fast and takes the corner on two wheels. The band plays the last of the dirge all the way to the cemetery gates, and they lay Gus down, and then the Grand Marshal who isn't Gus lifts the umbrella.",
  );
  await s.narrate(
    'And the trumpet cuts loose, and the snare cracks, and the whole street turns from grief to joy in the space of one bar, the way it has for two hundred years, the way Metronome will never understand. You [[cut the body loose]]. You dance him home.',
  );
  await s.narrate(
    'Later. The Lagniappe club. Folding chairs, a coffee urn, the trophy wall. Mama Roux sets two things on the table in front of you.',
  );
  await s.say(
    'mamaroux',
    '"His umbrella. And his last cassette. He made it the night before the raid. Listen."',
  );
  s.keyItem('umbrella');
  s.keyItem('cassette');
  s.flags.set('hasCassette');
  await s.say(
    'gus',
    '"Don\'t you cry too long for me, now. Dirge on the way there, dance on the way back. That\'s how we do."',
  );
  await s.say(
    'gus',
    '"Listen. Metronome\'s building something in the Tower. They call it the Click. A perfect beat, broadcast citywide, and when it drops, every heart in Neon Orleans keeps time with it. Forever. No swing. No lagniappe. Just the grid."',
  );
  await s.say(
    'gus',
    '"To build it they stole the [[blues scale|six Blue Notes]]. The frequencies this city\'s made of. Root, flat third, fourth, flat fifth, fifth, flat seventh. Six notes, six lieutenants, one in each pocket. Take \'em back. Learn to play the whole scale. And when you can, baby, you can break the Click."',
  );
  await s.say(
    'mamaroux',
    "\"Captain Hush took Congo Square. He's got the first one. But you can't get near him with the Hush thick on every corner like they are. Go thin them out. Win three fights on the streets, and he'll come see about you himself.\"",
  );
  s.story.set({ act: 'treme', step: 'win_street_fights' });
  s.flags.set('metRoux');
  await s.narrate("You take the umbrella. It's heavier than it looks. Everything is.");
  s.save();
  await s.goto('treme');
}

/** Picking a tutorial fight back up after a reload (v1: resumeGame). */
export function resumeTutorial(step: 1 | 2): Scene {
  return async s => {
    s.title('Prologue: The Dirge');
    await s.narrate('You pick the song back up where the Hush interrupted it.');
    await tutorialFight(s, step);
    if (step === 1) await tutorialFight(s, 2, 'Two more Patrolmen.');
    await prologueEnd(s);
  };
}
