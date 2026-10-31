/** Ids for the map: districts, places, NPCs, quests. */

/** Districts in travel and story order. */
export const DISTRICT_IDS = [
  'treme',
  'quarter',
  'storyville',
  'bayou',
  'cemetery',
  'garden',
  'tower',
] as const;
/** A district. */
export type DistrictId = (typeof DISTRICT_IDS)[number];

/** Places you can enter inside a district. */
export const PLACE_IDS = [
  'club',
  'kitchen',
  'pawn',
  'congo',
  'strip',
  'pelican',
  'feufollet',
  'market',
  'jackson',
  'lantern',
  'chopshop',
  'counting',
  'cabin',
  'faisdodo',
  'boudin',
  'pump',
  'temple',
  'crypts',
  'mausoleum',
  'maison',
  'tuxedo',
  'manor',
  'towerlobby',
] as const;
/** A place. */
export type PlaceId = (typeof PLACE_IDS)[number];

/** Speakers in dialogue. */
export const NPC_IDS = [
  'mamaroux',
  'tijacques',
  'gus',
  'odette',
  'sugar',
  'zinnia',
  'celeste',
  'theo',
  'static',
  'clothilde',
  'remy',
  'boudreaux',
  'lucien',
  'rosalie',
  'moses',
  'valet',
  'isolde',
  'hush',
  'vox',
  'ledger',
  'archivist',
  'conductor',
  'pralinelady',
  'stranger',
  'haint',
  'busker',
  'preacher',
  'vendor',
  'you',
] as const;
/** A speaker. */
export type NpcId = (typeof NPC_IDS)[number];

/** Side quests. */
export const QUEST_IDS = [
  'redbeans',
  'horn',
  'cutting',
  'lost_eye',
  'static_contract',
  'rolls',
  'faisdodo',
  'herbs',
  'haints',
] as const;
/** A side quest. */
export type QuestId = (typeof QUEST_IDS)[number];
