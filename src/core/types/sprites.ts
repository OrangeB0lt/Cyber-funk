/**
 * The shape of a sprite row. A sprite is either drawn as its own grid of pixels, or made from
 * another sprite's pixels (recoloured, painted over, or both). Rules for drawing them, and the
 * spec for every character: docs/vision/character-design.md.
 */
import type { PaletteId, SpriteId } from '../ids/sprites';
import type { Table } from './content';

/** A CSS effect on a sprite. Each has a static look, so it still reads with reduce motion on. */
export type SpriteFx = 'ghost' | 'holo' | 'glitch';

/** Pixel rows, top to bottom, one character per pixel. Every row has the same length. */
export type PixelRows = readonly string[];

/** The palette colour each grid character paints. */
export type PixelKeys = Readonly<Record<string, PaletteId>>;

/** A sprite drawn as its own grid. */
export interface GridSpriteDef {
  /** Id. */
  id: SpriteId;
  /** The pixels: 24 rows of 24 characters (32 of 32 for bosses). '.' is transparent. */
  rows: PixelRows;
  /** The palette colour for every other character used in `rows`. */
  keys: PixelKeys;
  /** CSS effect: translucent ghost, scanlined hologram, or data glitch. */
  fx?: SpriteFx;
  /** The colour of the soft glow around the sprite (its accent), so dark outlines read on dark cards. */
  glow?: PaletteId;
}

/** A sprite made from another sprite's pixels. */
export interface VariantSpriteDef {
  /** Id. */
  id: SpriteId;
  /** The sprite whose pixels this starts from. Same size; variants of variants are fine, up to 3 deep. */
  from: SpriteId;
  /** Palette swaps applied to the base pixels (not to the overlay). */
  recolor?: Readonly<Partial<Record<PaletteId, PaletteId>>>;
  /** Pixels painted over the base: '.' keeps the base pixel, '_' erases it, others use `keys`. */
  overlay?: PixelRows;
  /** The palette colour for each character used in `overlay`. */
  keys?: PixelKeys;
  /** CSS effect. Inherited from the base when omitted. */
  fx?: SpriteFx;
  /** Glow colour. Inherited from the base when omitted. */
  glow?: PaletteId;
}

/** A sprite row: drawn, or made from another sprite. */
export type SpriteDef = GridSpriteDef | VariantSpriteDef;

/** Every sprite, one row per SpriteId. */
export type SpriteTable = Table<SpriteId, SpriteDef>;
