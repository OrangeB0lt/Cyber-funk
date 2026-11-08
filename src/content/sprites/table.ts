/** Every sprite in one table: the art files, plus a generated Session Clone row per class. */
import { CLASS_IDS } from '@core/ids/characters';
import type { CloneSpriteId } from '@core/ids/sprites';
import type { SpriteTable, VariantSpriteDef } from '@core/types';
import { BAYOU_ART } from './art/bayou';
import { CEMETERY_ART } from './art/cemetery';
import { GARDEN_ART } from './art/garden';
import { HERO_ART } from './art/heroes';
import { PEOPLE_ART } from './art/people';
import { QUARTER_ART } from './art/quarter';
import { RIVAL_ART } from './art/rivals';
import { SHOPKEEPER_ART } from './art/shopkeepers';
import { STORYVILLE_ART } from './art/storyville';
import { TOWER_ART } from './art/tower';
import { TREME_ART } from './art/treme';
import { CLONE_RECOLOR, cloneSprite, heroSprite } from './refs';

/** Each class's Session Clone: its hero in corporate chrome, glowing Metronome cyan. */
const CLONE_ART = Object.fromEntries(
  CLASS_IDS.map(c => [
    cloneSprite(c),
    { id: cloneSprite(c), from: heroSprite(c), recolor: CLONE_RECOLOR, glow: 'cyan' },
  ]),
) as { readonly [K in CloneSpriteId]: VariantSpriteDef & { id: K } };

export const SPRITES: SpriteTable = {
  ...HERO_ART,
  ...CLONE_ART,
  ...PEOPLE_ART,
  ...SHOPKEEPER_ART,
  ...TREME_ART,
  ...QUARTER_ART,
  ...STORYVILLE_ART,
  ...BAYOU_ART,
  ...CEMETERY_ART,
  ...GARDEN_ART,
  ...TOWER_ART,
  ...RIVAL_ART,
};
