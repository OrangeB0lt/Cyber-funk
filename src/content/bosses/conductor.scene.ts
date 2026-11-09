/**
 * The Conductor, at the Booth (v1: towerFlow's Booth floor, legacy/src/09_story.js:251-261). The
 * Tower runs the fight itself (s.bossFight); these are the scenes around it.
 */
import type { Scene } from '@narrative/types';
import { TOWER_FLOORS } from '../world/tower';

/** First time in the Booth: Maestro Aurelius Quant introduces himself. */
export const pre: Scene = async s => {
  await s.say(
    'conductor',
    '"Maestro Aurelius Quant. CEO. Composer. I built the Click from six stolen notes and ten thousand captured songs, and tomorrow the city will finally be in tune. Jazz is just error, repeated until someone mistook it for culture."',
  );
  await s.narrate(
    'He raises the baton. Behind you, the second line goes quiet, and then Gus laughs, once, loud enough to echo.',
  );
};

/** The baton drops; the second line rallies (+50% Heart and Funk); next, the Crown. */
export const post: Scene = async s => {
  s.title(TOWER_FLOORS[3]!.name);
  await s.narrate(
    "The Conductor drops the baton. The console is still lit. Above you, through the glass ceiling, the pendulum keeps swinging, because the Click doesn't need him anymore. It never did.",
  );
  await s.narrate(
    'The second line rallies around you. Sugar sings. Mama Roux produces a thermos. You get your breath back: Heart and Funk +50%.',
  );
  s.heal(0.5);
  s.funk(0.5);
  s.story.set({ act: 'tower', step: 'break_the_click' });
  // The climb's next floor (the loop sets the same): a reload that replays this scene continues at
  // the Crown instead of the Booth.
  s.game.towerFloor = 4;
  if (s.game.resume?.kind === 'afterBoss') s.game.resume = null;
  s.save();
};
