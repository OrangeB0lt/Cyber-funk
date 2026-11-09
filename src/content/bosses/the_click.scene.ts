/**
 * The Click, at the Crown (v1: towerFlow's Crown floor, legacy/src/09_story.js:262-269). The Tower
 * runs the fight itself (s.bossFight with the Click's shield); its post-fight scene is the ending.
 */
import type { Scene } from '@narrative/types';
import { ending } from '../story/finale.scene';

/** First time at the Crown: the Play the Blues tutorial. */
export const pre: Scene = async s => {
  await s.narrate(
    'Perfect Silence comes down off the pendulum like weather. Nothing you play can touch it. Not one note. But you have six.',
  );
  await s.narrate(
    "TUTORIAL: PLAY THE BLUES. Tap each of the six notes as it lights up. The first one's free; after that it costs 100 Groove. It shatters the Silence and every member of your second line strikes. At half Heart the Click re-shields. Build Groove and play it again.",
  );
};

/** Out of the Tower, and the ending. */
export const post: Scene = async s => {
  s.game.inTower = false;
  await ending(s);
};
