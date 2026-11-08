/** Le Rougarou Chromé: Pump Station 13, and the third big choice. (v1: 09_story.js BOSS_PRE/BOSS_POST.) */
import type { Scene } from '@narrative/types';

export const pre: Scene = async s => {
  await s.narrate(
    'Pump Station 13. The test signal is a scream now, right at the edge of hearing. The wolves part for you, implants flickering, and at the center, on the pump housing, Lucien.',
  );
  await s.narrate(
    "Or what's left of him: chrome fur, white eyes, a jaw that's more machine than mouth. Le Rougarou Chromé. It howls in perfect 4/4.",
  );
  await s.narrate('"Heat," Grand-mère said. "The implant runs hot already. Heat is how you reach him."');
};

export const post: Scene = async s => {
  await s.narrate(
    'The rougarou falls across the pump housing and the test signal cuts out. In the silence, the chrome fur ripples and goes still, and the white eyes go brown, and Lucien looks up at you with a human face and a machine jaw.',
  );
  await s.say(
    'lucien',
    '"Where... is my pack? What did I... I can hear it. I can still hear it. In the implant. Make it stop. Or make me stop."',
  );
  const pick = await s.choose({
    spare: 'Spare him. Smash the implant.',
    finish: 'Finish him. Take the Chrome Fang.',
  });
  if (pick === 'spare') {
    s.choice('lucien', 'spared');
    await s.narrate(
      'You bring the horn\'s bell down on the implant and it shatters like cheap glass. Lucien screams, then breathes, then laughs, and the pack comes out of the fog to sit around him in a circle. "Thank you," he says. "When you march, we run." Lucien and the Chrome Wolves will join the second line.',
    );
  } else {
    s.choice('lucien', 'finished');
    s.gainGear('ch_fang');
    await s.narrate(
      'You end it. Quick, and as kind as it can be. The pack howls once, in swing, and scatters into the swamp. A chrome fang lies in the mud, humming. (Chrome Fang: a charm. +Chops, +Mojo.)',
    );
  }
  await s.giveNote('G');
  await s.narrate(
    'The pump station\'s pylons go dark one by one across the swamp. Frogs. Wind. An airboat, far off, with an accordion on deck. Grand-mère Clothilde is standing on the dock when you get back. "The dead are next," she says. "Mambo Rosalie, St. Louis No. 1. Go careful."',
  );
};
