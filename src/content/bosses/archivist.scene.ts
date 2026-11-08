/** The Archivist: under the oldest tomb, the songs of the Muted, and Gus. (v1: 09_story.js BOSS_PRE/BOSS_POST.) */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    "Three Crypt Keys turn. The slab slides. Below, a server farm shaped like a chapel, racks where the pews should be, and in every rack a light that is somebody's song. One of them is Gus's.",
  );
  await s.say(
    'archivist',
    '"Every song ever played in this city is catalogued below. The dead do not improvise. Soon, neither will you."',
  );
  await s.narrate('It is a machine for grief, and it has never once felt any. You are about to fix that.');
};

export const post: Scene = async s => {
  await s.narrate(
    "The Archivist's racks go dark in a wave, floor to ceiling, and every light in them goes out, and every light in them is a song, and the songs go up through the slab and out into the cemetery like birds.",
  );
  await s.giveNote('Bb');
  await s.narrate(
    "One light stays. It drifts down out of the rack and stands in front of you, and it's wearing a hat.",
  );
  await s.say('gus', '"Took you long enough, baby. Now go cut me loose proper."');
  s.flags.set('gusFreed');
  await s.say(
    'gus',
    "\"Listen. They got my song, but they never got my time. You hear me? They can copy the notes. They can't copy the swing. That's yours. That's the city's. Now: I got something for you.\"",
  );
  s.gainGear('thr_regalia', { equip: true });
  await s.narrate(
    "Gus's Grand Marshal's Regalia. The sash, the fan, the hat. It still smells like cigar. (Equipped. Grit +12, Heart +60, Mojo +2.)",
  );
  await s.say(
    'gus',
    "\"One more note. The Blue Note itself. Isolde Vane's got it in that violin of hers, up in the Garden District. Get it, and then get everybody, and then come find me. I'll be out front. I'm always out front.\"",
  );
  await s.say(
    'rosalie',
    "\"He's settled. Not resting. Settled.\" Mambo Rosalie rings the bell. \"The Garden District's security domes don't open for people like us. You'll need an invitation to the Vane ball. Static could forge one. Céleste could call a favor. The Silver Tuxedo's valet sells them.\"",
  );
};
