/**
 * Ids for character art: who has a sprite, and the colours sprites may use. The design spec for
 * every sprite is docs/vision/character-design.md.
 */
import { CLASS_IDS, type ClassId } from './characters';
import { BOSS_IDS, ENEMY_IDS, type EnemyId, type OpponentId } from './enemies';

/**
 * People with their own art: speakers not drawn with opponent art, and shopkeepers in places P3 still
 * has to port (they have no NpcId yet).
 */
export const PERSON_SPRITE_IDS = [
  'mamaroux',
  'tijacques',
  'gus',
  'pralinelady',
  'stranger',
  'busker',
  'preacher',
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
  // NpcId 'valet' is the Silver Tuxedo valet. EnemyId 'valet' is the Valet Assassin, someone else.
  'tuxedo_valet',
  'vendor',
  'pelican_bartender',
  'faisdodo_bartender',
  'market_vendor',
  'chop_surgeon',
  'maison_clerk',
  'tuxedo_maitre',
] as const;
/** A person with their own art. */
export type PersonSpriteId = (typeof PERSON_SPRITE_IDS)[number];

/** A class hero: the player's sprite. */
export type HeroSpriteId = `hero_${ClassId}`;
/** A Session Clone of a class: the hero recoloured in corporate chrome. */
export type CloneSpriteId = `clone_${ClassId}`;
/** Opponents with art of their own. A Session Clone is drawn as the clone of the class it copied. */
export type ArtOpponentId = Exclude<OpponentId, 'session_clone'>;
/** Any sprite. An opponent's sprite id is its opponent id. */
export type SpriteId = ArtOpponentId | HeroSpriteId | CloneSpriteId | PersonSpriteId;

/** The seven class heroes, in class order. */
export const HERO_SPRITE_IDS: readonly HeroSpriteId[] = CLASS_IDS.map(c => `hero_${c}` as const);
/** The seven Session Clone looks, in class order. */
export const CLONE_SPRITE_IDS: readonly CloneSpriteId[] = CLASS_IDS.map(c => `clone_${c}` as const);

/** Every sprite: opponents, heroes, clones, people. */
export const SPRITE_IDS: readonly SpriteId[] = [
  ...ENEMY_IDS.filter((id): id is Exclude<EnemyId, 'session_clone'> => id !== 'session_clone'),
  ...BOSS_IDS,
  ...HERO_SPRITE_IDS,
  ...CLONE_SPRITE_IDS,
  ...PERSON_SPRITE_IDS,
];

type Assert<T extends true> = T;
/**
 * Compile-time guard: a person sprite id must never also be an opponent id, or the two would
 * silently share one row of the sprite table (the `valet` trap). Fails to compile on a clash.
 */
export type PersonIdsAreNotOpponentIds = Assert<
  [Extract<PersonSpriteId, OpponentId>] extends [never] ? true : false
>;

/** The master palette's colour names (hex values in content/sprites/palette.ts). */
export const PALETTE_IDS = [
  'ink',
  'shadow',
  'skin1_hi',
  'skin1',
  'skin1_lo',
  'skin2_hi',
  'skin2',
  'skin2_lo',
  'skin3_hi',
  'skin3',
  'skin3_lo',
  'skin4_hi',
  'skin4',
  'skin4_lo',
  'skin5_hi',
  'skin5',
  'skin5_lo',
  'skin6_hi',
  'skin6',
  'skin6_lo',
  'hair_black',
  'hair_black_hi',
  'hair_brown',
  'hair_brown_hi',
  'hair_grey',
  'hair_white',
  'brass_hi',
  'gold',
  'brass_lo',
  'brass_dk',
  'chrome_hi',
  'chrome',
  'chrome_md',
  'chrome_lo',
  'chrome_dk',
  'purple',
  'purple_lo',
  'green',
  'green_lo',
  'green_hi',
  'magenta',
  'magenta_lo',
  'magenta_hi',
  'cyan',
  'cyan_lo',
  'cyan_hi',
  'red',
  'red_lo',
  'hot',
  'hot_lo',
  'low',
  'low_lo',
  'blue',
  'blue_lo',
  'sweet',
  'sweet_lo',
  'ghost_hi',
  'ghost',
  'white',
  'cream',
  'cream_lo',
  'grey',
  'grey_lo',
  'charcoal',
  'navy',
  'navy_lo',
  'wine',
  'wine_lo',
  'leather',
  'leather_lo',
  'moss',
  'moss_lo',
  'swamp',
  'mud',
  'wood',
  'wood_lo',
  'bone',
  'bone_lo',
  'marble',
  'marble_lo',
] as const;
/** A master palette colour. */
export type PaletteId = (typeof PALETTE_IDS)[number];
