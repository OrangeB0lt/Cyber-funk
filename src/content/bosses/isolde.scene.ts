/** Lady Concertmaster Isolde Vane: the duel in her ballroom, and the last Blue Note. (v1: 09_story.js BOSS_PRE/BOSS_POST.) */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    'The ballroom clears. Chandeliers, a parquet floor, the debutantes lining the walls in white. At the far end, Lady Concertmaster Isolde Vane lifts a violin that is also, somehow, a blade.',
  );
  await s.say(
    'isolde',
    '"A duel? In my ballroom? How quaint. Very well. I will show you what a note sounds like when it is exactly where it belongs."',
  );
  await s.narrate(
    'The Blue Note is in the violin. You can hear it, flat and true, under all that perfection. When she tunes to a perfect A, only an ON THE ONE hit or a SOLO gets through. When she raises the bow for a Cadenza, VAMP.',
  );
};

export const post: Scene = async s => {
  await s.narrate(
    'Isolde Vane lowers the violin. Her bow arm is shaking. The debutantes along the walls have forgotten to curtsy.',
  );
  await s.say(
    'isolde',
    '"Flat. I was... flat. Father never let me be flat." She looks at the violin. "It felt... I think I liked it."',
  );
  await s.giveNote('Gb');
  await s.narrate(
    'Six notes. The whole scale, C to B♭, humming in your horn like a hive. You can feel the shape of the blues in your hands for the first time: every note the city is, in one phrase.',
  );
  await s.say(
    'isolde',
    '"The Conductor is in the Tower. Maestro Quant. He built the Click from our stolen notes, and tomorrow night he broadcasts it, and the whole city keeps perfect time forever." She sets the violin down. "Go. Take everyone. He\'s only ever been afraid of a crowd."',
  );
  await s.narrate(
    "Back to the Lagniappe club. Gus said he'd be out front. Everybody else will be waiting too.",
  );
};
