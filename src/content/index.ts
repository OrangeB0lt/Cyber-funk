/**
 * All content as the app sees it: the data (content/data.ts) plus every scene. The engine and the
 * sim never import this file (they use data.ts), which keeps prose out of their module graph.
 *
 * The scene registries are partial during the 2.0 migration: districts are added as they're ported
 * (P2: Tremé; P3: the rest; P4: the Tower and the ending). src/content/pending.ts lists the districts
 * still waiting; their places show TEXT.placeNotBuilt. The completeness tests fail if a place outside
 * those districts has no scenes.
 */
import type { BossId } from '@core/ids/enemies';
import type { PlaceId } from '@core/ids/world';
import type { PlaceScenes } from '@narrative/define';
import type { Scene } from '@narrative/types';
import * as captainHush from './bosses/captain_hush.scene';
import * as voxPerfecta from './bosses/vox_perfecta.scene';
import * as mrLedger from './bosses/mr_ledger.scene';
import * as rougarou from './bosses/rougarou.scene';
import * as archivist from './bosses/archivist.scene';
import { club, congo, kitchen, pawn } from './districts/treme/places.scene';
import { feufollet, jackson, market, pelican, strip } from './districts/quarter/places.scene';
import { chopshop, counting, lantern } from './districts/storyville/places.scene';
import { boudin, cabin, faisdodo, pump } from './districts/bayou/places.scene';
import { crypts, mausoleum, temple } from './districts/cemetery/places.scene';

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
export const BOSS_SCENES: Partial<Record<BossId, { pre: Scene; post: Scene }>> = {
  captain_hush: captainHush,
  vox_perfecta: voxPerfecta,
  mr_ledger: mrLedger,
  rougarou,
  archivist,
};

/** What you can do at each place. */
export const PLACE_SCENES: Partial<Record<PlaceId, PlaceScenes>> = {
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
};
