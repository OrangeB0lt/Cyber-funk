/**
 * All content as the app sees it: the data (content/data.ts) plus every scene. The engine and the
 * sim never import this file (they use data.ts), which keeps prose out of their module graph.
 *
 * The scene registries are total: every place and every boss must have scenes, or this file doesn't
 * compile. The completeness tests and the crawler check the rest (hint places, options, quests).
 */
import type { BossId } from '@core/ids/enemies';
import type { PlaceId } from '@core/ids/world';
import type { PlaceScenes } from '@narrative/define';
import type { Scene } from '@narrative/types';

/** A boss's scenes: `pre` plays the first time you go in, `post` after you win. */
interface BossScenes {
  /** Before the first fight. */
  pre: Scene;
  /** After the win (the big choices, the Blue Note). */
  post: Scene;
}
import * as captainHush from './bosses/captain_hush.scene';
import * as voxPerfecta from './bosses/vox_perfecta.scene';
import * as mrLedger from './bosses/mr_ledger.scene';
import * as rougarou from './bosses/rougarou.scene';
import * as archivist from './bosses/archivist.scene';
import * as isolde from './bosses/isolde.scene';
import * as conductor from './bosses/conductor.scene';
import * as theClick from './bosses/the_click.scene';
import { club, congo, kitchen, pawn } from './districts/treme/places.scene';
import { feufollet, jackson, market, pelican, strip } from './districts/quarter/places.scene';
import { chopshop, counting, lantern } from './districts/storyville/places.scene';
import { boudin, cabin, faisdodo, pump } from './districts/bayou/places.scene';
import { crypts, mausoleum, temple } from './districts/cemetery/places.scene';
import { maison, manor, tuxedo } from './districts/garden/places.scene';
import { towerlobby } from './districts/tower/places.scene';

export * from './data';
export { TEXT } from './text';
export { fmtDoubloons } from './format';
export { STREET_EVENTS } from './world/streetEvents.scene';
export {
  hitTheStreets,
  pralineLady,
  trackBounty,
  travel,
  wakeUpAtClub,
  runEvent,
  fmtD,
} from './world/streets.scene';
export { ARRIVALS } from './world/arrivals.scene';
export { prologue, prologueEnd, resumeTutorial } from './story/prologue.scene';
export { ending, creditsAndNewGamePlus } from './story/finale.scene';
export { towerFlow } from './districts/tower/climb.scene';
export { TOWER_FLOORS } from './world/tower';
export { cuttingContest } from './districts/quarter/cutting.scene';
export { mamaRouxTalk } from './districts/treme/places.scene';

/** Each boss's scenes: `pre` plays the first time you go in, `post` after you win. */
export const BOSS_SCENES: Record<BossId, BossScenes> = {
  captain_hush: captainHush,
  vox_perfecta: voxPerfecta,
  mr_ledger: mrLedger,
  rougarou,
  archivist,
  isolde,
  conductor,
  the_click: theClick,
};

/** What you can do at each place. */
export const PLACE_SCENES: Record<PlaceId, PlaceScenes> = {
  club,
  kitchen,
  pawn,
  congo,
  strip,
  pelican,
  feufollet,
  market,
  jackson,
  lantern,
  chopshop,
  counting,
  cabin,
  faisdodo,
  boudin,
  pump,
  temple,
  crypts,
  mausoleum,
  maison,
  tuxedo,
  manor,
  towerlobby,
};
