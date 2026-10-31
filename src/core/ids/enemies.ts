/** Ids for opponents and the Blue Notes they guard. */

/** Every non-boss enemy (district enemies, elites, summons, Cutting Contest rivals). */
export const ENEMY_IDS = [
  'hush_patrol',
  'click_drone',
  'nutria',
  'hustler',
  'hush_sergeant',
  'gocup_golem',
  'neon_mime',
  'busker_bot',
  'barker',
  'hooligan',
  'enforcer',
  'bouncer',
  'absinthe',
  'repo_drone',
  'bagman',
  'chrome_gator',
  'feu_follet',
  'grunch',
  'skeeter',
  'rougarou_pup',
  'big_grunch',
  'haint',
  'data_wraith',
  'tomb_crawler',
  'archive_drone',
  'bone_choir',
  'crypt_keeper',
  'debutante',
  'butler',
  'topiary',
  'quartet',
  'valet',
  'beaumont',
  'hush_elite',
  'quantizer',
  'session_clone',
  'sentinel',
  'warden',
  'ghost_track',
  'rival_hotrod',
  'rival_bigmae',
  'rival_twotone',
] as const;
/** A non-boss enemy. */
export type EnemyId = (typeof ENEMY_IDS)[number];

/** Every boss, in story order. */
export const BOSS_IDS = [
  'captain_hush',
  'vox_perfecta',
  'mr_ledger',
  'rougarou',
  'archivist',
  'isolde',
  'conductor',
  'the_click',
] as const;
/** A boss. */
export type BossId = (typeof BOSS_IDS)[number];

/** Anything the player can fight; also the key of the Blue Book (bestiary). */
export type OpponentId = EnemyId | BossId;

/** The six Blue Notes of the blues scale, in scale order. */
export const NOTE_IDS = ['C', 'Eb', 'F', 'Gb', 'G', 'Bb'] as const;
/** A Blue Note. */
export type NoteId = (typeof NOTE_IDS)[number];
