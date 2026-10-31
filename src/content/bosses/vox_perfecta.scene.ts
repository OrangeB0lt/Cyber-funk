/** Vox Perfecta: before and after the fight on the Bourbon Strip, and the first big choice. */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    'The main stage of the Bourbon Strip. The licensed clubs are dark since the broadcaster went down, but the stage is still lit, and on it, forty feet of hologram folding down into something person-sized and silver.',
  );
  await s.say(
    'vox',
    '"Welcome to the Licensed Entertainment Strip. Tonight\'s performance is brought to you by Metronome. Please remain in perfect time."',
  );
  await s.narrate(
    'Her pitch is perfect. Her time is perfect. There is not one single feeling in it. The crowd on the banquette is waiting for somebody to prove that matters.',
  );
};

export const post: Scene = async s => {
  await s.narrate(
    'Vox Perfecta kneels on the stage, hologram flickering. The crowd on the banquette is dead silent, and then somebody whistles, off-key, and the whole Strip laughs for the first time in a year.',
  );
  await s.say('vox', '"That note. The blue one. I was not built to feel that. I felt that."');
  await s.narrate(
    'Her chassis is open. Inside, under the licensing chip, a hum you recognize. The second Blue Note. And a choice.',
  );
  const pick = await s.choose({
    reprogram: 'Reprogram her. Let her sing for real.',
    shutdown: 'Shut her down. Take the Perfect Pitch Chip.',
  });
  if (pick === 'reprogram') {
    s.choice('vox', 'reprogrammed');
    await s.narrate(
      'You pull the licensing chip and wire the blue note straight into her voice. She stands, tries a scale, and lands the third a hair flat, on purpose, and grins like a person. "Oh," she says. "Oh, that\'s what it\'s for." Vox Perfecta will march with the second line.',
    );
  } else {
    s.choice('vox', 'shutdown');
    s.gainGear('mod_pitch');
    await s.narrate(
      'You pull the chip and the stage goes dark. The Perfect Pitch Chip is warm in your hand. It still hums her set. (Perfect Pitch Chip: a mod. Wider ONE zone, +crit.)',
    );
  }
  await s.giveNote('Eb');
  await s.say(
    'odette',
    "\"Bourbon's open. Frenchmen's loud. Now, Storyville. Madame Céleste at the Velvet Lantern has a problem named Ledger, and she's been asking for you by name.\"",
  );
};
