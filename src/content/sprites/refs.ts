/**
 * Who is drawn with which sprite. Speakers map to their art through NPC_SPRITE (some reuse an
 * opponent's art); heroes and clones are derived from the class; shopkeepers who never speak are in
 * SHOPKEEPERS. The UI resolves sprites with these helpers; nothing below ui/ needs them.
 */
import type { ClassId } from '@core/ids/characters';
import type { OpponentId } from '@core/ids/enemies';
import type { CloneSpriteId, HeroSpriteId, PaletteId, PersonSpriteId, SpriteId } from '@core/ids/sprites';
import type { NpcId, PlaceId } from '@core/ids/world';

/** Each speaker's sprite. 'player' is the player's class hero. */
export const NPC_SPRITE: Readonly<Record<NpcId, SpriteId | 'player'>> = {
  mamaroux: 'mamaroux',
  tijacques: 'tijacques',
  gus: 'gus',
  odette: 'odette',
  sugar: 'sugar',
  zinnia: 'zinnia',
  celeste: 'celeste',
  theo: 'theo',
  static: 'static',
  clothilde: 'clothilde',
  remy: 'remy',
  boudreaux: 'boudreaux',
  lucien: 'lucien',
  rosalie: 'rosalie',
  moses: 'moses',
  // The Silver Tuxedo valet, not the Valet Assassin (EnemyId 'valet').
  valet: 'tuxedo_valet',
  isolde: 'isolde',
  hush: 'captain_hush',
  vox: 'vox_perfecta',
  ledger: 'mr_ledger',
  archivist: 'archivist',
  conductor: 'conductor',
  pralinelady: 'pralinelady',
  stranger: 'stranger',
  haint: 'haint',
  busker: 'busker',
  preacher: 'preacher',
  vendor: 'vendor',
  you: 'player',
};

/**
 * Shopkeepers who never speak, and the place whose shop they run. Their portrait shows beside the
 * shop's title (the scene passes them as `keeper`); the crawler checks each one appears.
 */
export const SHOPKEEPERS: Readonly<Partial<Record<PersonSpriteId, PlaceId>>> = {
  pelican_bartender: 'pelican',
  faisdodo_bartender: 'faisdodo',
  market_vendor: 'market',
  chop_surgeon: 'chopshop',
  maison_clerk: 'maison',
  tuxedo_maitre: 'tuxedo',
};

/**
 * The Session Clone look: a hero in corporate chrome. Skin and hair go to chrome, every warm or neon
 * colour to cyan, brass to chrome, cloth to greys. Hero pupils are drawn in `shadow` (heroes use it
 * for nothing else), which becomes a cyan LED.
 */
export const CLONE_RECOLOR: Readonly<Partial<Record<PaletteId, PaletteId>>> = {
  shadow: 'cyan',
  skin1_hi: 'chrome',
  skin1: 'chrome_md',
  skin1_lo: 'chrome_lo',
  skin2_hi: 'chrome',
  skin2: 'chrome_md',
  skin2_lo: 'chrome_lo',
  skin3_hi: 'chrome',
  skin3: 'chrome_md',
  skin3_lo: 'chrome_lo',
  skin4_hi: 'chrome',
  skin4: 'chrome_md',
  skin4_lo: 'chrome_lo',
  skin5_hi: 'chrome',
  skin5: 'chrome_md',
  skin5_lo: 'chrome_lo',
  skin6_hi: 'chrome',
  skin6: 'chrome_md',
  skin6_lo: 'chrome_lo',
  hair_black: 'chrome_dk',
  hair_black_hi: 'chrome_lo',
  hair_brown: 'chrome_dk',
  hair_brown_hi: 'chrome_lo',
  hair_grey: 'chrome_md',
  hair_white: 'chrome',
  brass_hi: 'chrome_hi',
  gold: 'chrome',
  brass_lo: 'chrome_md',
  brass_dk: 'chrome_lo',
  purple: 'cyan',
  purple_lo: 'cyan_lo',
  green: 'cyan',
  green_lo: 'cyan_lo',
  green_hi: 'cyan_hi',
  magenta: 'cyan',
  magenta_lo: 'cyan_lo',
  magenta_hi: 'cyan_hi',
  red: 'cyan',
  red_lo: 'cyan_lo',
  hot: 'cyan',
  hot_lo: 'cyan_lo',
  low: 'cyan',
  low_lo: 'cyan_lo',
  blue: 'cyan',
  blue_lo: 'cyan_lo',
  sweet: 'cyan',
  sweet_lo: 'cyan_lo',
  ghost_hi: 'cyan_hi',
  ghost: 'cyan',
  white: 'chrome',
  cream: 'chrome',
  cream_lo: 'chrome_md',
  grey: 'chrome_lo',
  grey_lo: 'chrome_dk',
  charcoal: 'chrome_dk',
  navy: 'chrome_lo',
  navy_lo: 'chrome_dk',
  wine: 'chrome_lo',
  wine_lo: 'chrome_dk',
  leather: 'chrome_lo',
  leather_lo: 'chrome_dk',
  moss: 'chrome_md',
  moss_lo: 'chrome_lo',
  swamp: 'chrome_dk',
  mud: 'chrome_lo',
  wood: 'chrome_md',
  wood_lo: 'chrome_lo',
  bone: 'chrome',
  bone_lo: 'chrome_md',
  marble: 'chrome',
  marble_lo: 'chrome_md',
};

/** A class's hero sprite. */
export const heroSprite = (cls: ClassId): HeroSpriteId => `hero_${cls}`;

/** A class's Session Clone sprite. */
export const cloneSprite = (cls: ClassId): CloneSpriteId => `clone_${cls}`;

/** A speaker's sprite. 'you' is the player's hero. */
export function npcSprite(id: NpcId, playerCls: ClassId): SpriteId {
  const s = NPC_SPRITE[id];
  return s === 'player' ? heroSprite(playerCls) : s;
}

/** An opponent's sprite outside battle (the Blue Book). A Session Clone shows the clone of your class. */
export function opponentSprite(id: OpponentId, playerCls: ClassId): SpriteId {
  return id === 'session_clone' ? cloneSprite(playerCls) : id;
}

/**
 * A battle actor's sprite. A Session Clone draws the clone of the class it copied (its `clone` flag;
 * Cutting Contest rivals also carry a class but have art of their own).
 */
export function actorSprite(
  a: { defId: OpponentId | 'player'; clone: boolean; cls: ClassId | null },
  playerCls: ClassId,
): SpriteId {
  if (a.defId === 'player') return heroSprite(playerCls);
  if (a.clone && a.cls) return cloneSprite(a.cls);
  return opponentSprite(a.defId, playerCls);
}
