/**
 * All content as the app sees it: the data (content/data.ts) plus every scene. The engine and the
 * sim never import this file (they use data.ts), which keeps prose out of their module graph.
 *
 * The scene registries are complete except for the Tower and its bosses, which arrive with the ending
 * in P4 (src/content/pending.ts; their places show TEXT.placeNotBuilt). Everything else is required by
 * the types, so a missing place or boss scene doesn't compile; the completeness tests and the crawler
 * check the rest (hint places, options, quests). At the end of P4 these become plain Records.
 */
import type { BossId } from '@core/ids/enemies';
import type { PlaceId } from '@core/ids/world';
import type { PlaceScenes } from '@narrative/define';
import type { Scene } from '@narrative/types';

/** The Tower's place and bosses: their scenes come with the ending (P4). */
type TowerPlace = 'towerlobby';
type TowerBoss = 'conductor' | 'the_click';
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
import { club, congo, kitchen, pawn } from './districts/treme/places.scene';
import { feufollet, jackson, market, pelican, strip } from './districts/quarter/places.scene';
import { chopshop, counting, lantern } from './districts/storyville/places.scene';
import { boudin, cabin, faisdodo, pump } from './districts/bayou/places.scene';
import { crypts, mausoleum, temple } from './districts/cemetery/places.scene';
import { maison, manor, tuxedo } from './districts/garden/places.scene';

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
export { cuttingContest } from './districts/quarter/cutting.scene';
export { mamaRouxTalk } from './districts/treme/places.scene';

/** Each boss's scenes: `pre` plays the first time you go in, `post` after you win. */
export const BOSS_SCENES: Record<Exclude<BossId, TowerBoss>, BossScenes> &
  Partial<Record<TowerBoss, BossScenes>> = {
  captain_hush: captainHush,
  vox_perfecta: voxPerfecta,
  mr_ledger: mrLedger,
  rougarou,
  archivist,
  isolde,
};

/** What you can do at each place. */
export const PLACE_SCENES: Record<Exclude<PlaceId, TowerPlace>, PlaceScenes> &
  Partial<Record<TowerPlace, PlaceScenes>> = {
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
};
