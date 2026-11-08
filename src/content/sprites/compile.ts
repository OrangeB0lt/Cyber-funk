/**
 * Turns sprite rows into drawable data. resolveSprite follows variants down to one palette colour
 * per pixel; compileSprite merges each colour's pixels into horizontal runs, giving one SVG path
 * per colour. Pure: the table and palette come in as arguments (index.ts binds the real ones), so
 * this file never imports the art and tests can feed it tiny tables.
 */
import type { PaletteId, SpriteId } from '@core/ids/sprites';
import type { SpriteFx, SpriteTable } from '@core/types';

/** The master palette's hex values. */
export type Palette = Readonly<Record<PaletteId, string>>;

/** A sprite resolved to one palette colour (or nothing) per pixel, row by row. */
export interface ResolvedSprite {
  /** Id. */
  id: SpriteId;
  /** Width in pixels. */
  w: number;
  /** Height in pixels. */
  h: number;
  /** `w * h` entries, row-major. null is transparent. */
  px: readonly (PaletteId | null)[];
  /** CSS effect. */
  fx: SpriteFx | null;
  /** Glow colour. */
  glow: PaletteId | null;
}

/** A sprite ready to draw: one path per colour, in pixel units (viewBox 0 0 w h). */
export interface CompiledSprite {
  /** Id. */
  id: SpriteId;
  /** Width in pixels. */
  w: number;
  /** Height in pixels. */
  h: number;
  /** One path of 1px-high rectangles per colour. */
  paths: readonly { fill: string; d: string }[];
  /** CSS effect. */
  fx: SpriteFx | null;
  /** Glow colour (hex). */
  glow: string | null;
}

/** How deep variants may nest (a variant of a variant of a variant). */
export const MAX_VARIANT_DEPTH = 3;

/** Resolves a sprite (following `from` through variants) to one palette colour per pixel. */
export function resolveSprite(id: SpriteId, table: SpriteTable): ResolvedSprite {
  return resolve(id, table, []);
}

function resolve(id: SpriteId, table: SpriteTable, chain: readonly SpriteId[]): ResolvedSprite {
  if (chain.includes(id)) throw new Error(`Sprite ${[...chain, id].join(' → ')}: variants form a cycle.`);
  const def = table[id];
  if (!('from' in def)) {
    const h = def.rows.length;
    const w = def.rows[0]?.length ?? 0;
    const px: (PaletteId | null)[] = [];
    def.rows.forEach((row, y) => {
      if (row.length !== w) throw new Error(`Sprite ${id}: row ${y} is ${row.length} wide, expected ${w}.`);
      for (const ch of row) px.push(ch === '.' ? null : colorOf(id, def.keys, ch));
    });
    return { id, w, h, px, fx: def.fx ?? null, glow: def.glow ?? null };
  }
  const base = resolve(def.from, table, [...chain, id]);
  const recolor = def.recolor ?? {};
  const px = base.px.map(c => (c ? (recolor[c] ?? c) : null));
  if (def.overlay) {
    if (def.overlay.length !== base.h)
      throw new Error(`Sprite ${id}: overlay has ${def.overlay.length} rows, base has ${base.h}.`);
    def.overlay.forEach((row, y) => {
      if (row.length !== base.w)
        throw new Error(`Sprite ${id}: overlay row ${y} is ${row.length} wide, expected ${base.w}.`);
      [...row].forEach((ch, x) => {
        if (ch === '.') return;
        px[y * base.w + x] = ch === '_' ? null : colorOf(id, def.keys ?? {}, ch);
      });
    });
  }
  return { id, w: base.w, h: base.h, px, fx: def.fx ?? base.fx, glow: def.glow ?? base.glow };
}

function colorOf(id: SpriteId, keys: Readonly<Record<string, PaletteId>>, ch: string): PaletteId {
  const c = keys[ch];
  if (!c) throw new Error(`Sprite ${id}: character '${ch}' has no key.`);
  return c;
}

/** Compiles a sprite to SVG paths: each colour's pixels merged into horizontal runs. */
export function compileSprite(id: SpriteId, table: SpriteTable, palette: Palette): CompiledSprite {
  const r = resolveSprite(id, table);
  const runs = new Map<PaletteId, string[]>();
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w;) {
      const c = r.px[y * r.w + x];
      if (!c) {
        x++;
        continue;
      }
      let n = 1;
      while (x + n < r.w && r.px[y * r.w + x + n] === c) n++;
      let list = runs.get(c);
      if (!list) runs.set(c, (list = []));
      list.push(`M${x} ${y}h${n}v1h-${n}z`);
      x += n;
    }
  }
  return {
    id,
    w: r.w,
    h: r.h,
    paths: [...runs].map(([c, d]) => ({ fill: palette[c], d: d.join('') })),
    fx: r.fx,
    glow: r.glow ? palette[r.glow] : null,
  };
}

/**
 * A standalone SVG file for a compiled sprite (the docs gallery). `scale` sets the file's pixel size;
 * `background` paints a backdrop behind the sprite; the glow becomes an SVG drop-shadow.
 */
export function spriteSvg(c: CompiledSprite, o: { scale: number; background?: string }): string {
  const W = c.w * o.scale;
  const H = c.h * o.scale;
  const bg = o.background ? `<rect width="${c.w}" height="${c.h}" fill="${o.background}"/>` : '';
  const art = c.paths.map(p => `<path fill="${p.fill}" d="${p.d}"/>`).join('');
  const glow = c.glow
    ? `<filter id="glow-${c.id}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="0.6" flood-color="${c.glow}" flood-opacity="0.75"/></filter>`
    : '';
  const body = c.glow ? `<g filter="url(#glow-${c.id})">${art}</g>` : art;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${c.w} ${c.h}" shape-rendering="crispEdges">${glow}${bg}${body}</svg>\n`;
}
