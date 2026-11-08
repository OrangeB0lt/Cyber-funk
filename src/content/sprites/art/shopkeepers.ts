/** Shopkeepers in places P3 still has to port (no NpcId yet; see RESERVED_P3). Specs: docs/vision/character-design.md (Shopkeepers (P3)). */
import type { SpriteTable } from '@core/types';
import { todo } from '../placeholder';

export const SHOPKEEPER_ART = {
  pelican_bartender: todo('pelican_bartender'),
  faisdodo_bartender: todo('faisdodo_bartender'),
  market_vendor: todo('market_vendor'),
  chop_surgeon: todo('chop_surgeon'),
  maison_clerk: todo('maison_clerk'),
  tuxedo_maitre: todo('tuxedo_maitre'),
} satisfies Partial<SpriteTable>;
