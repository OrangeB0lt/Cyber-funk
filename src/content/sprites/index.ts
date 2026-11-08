/**
 * Character art, for the UI and tools only. The engine, app, scenes and the rest of content never
 * import it (depcruise rule `sprites-ui-and-tools-only`), so the sim and headless sessions never
 * load the art. Spec: docs/vision/character-design.md.
 */
import type { SpriteId } from '@core/ids/sprites';
import { compileSprite, type CompiledSprite } from './compile';
import { PALETTE } from './palette';
import { SPRITES } from './table';

export { PALETTE } from './palette';
export { SPRITES } from './table';
export {
  MAX_VARIANT_DEPTH,
  compileSprite,
  resolveSprite,
  spriteSvg,
  type CompiledSprite,
  type Palette,
  type ResolvedSprite,
} from './compile';
export {
  CLONE_RECOLOR,
  NPC_SPRITE,
  SHOPKEEPERS,
  actorSprite,
  cloneSprite,
  heroSprite,
  npcSprite,
  opponentSprite,
} from './refs';

const cache = new Map<SpriteId, CompiledSprite>();

/** A sprite ready to draw, compiled on first use and cached. */
export function compiled(id: SpriteId): CompiledSprite {
  let c = cache.get(id);
  if (!c) cache.set(id, (c = compileSprite(id, SPRITES, PALETTE)));
  return c;
}
