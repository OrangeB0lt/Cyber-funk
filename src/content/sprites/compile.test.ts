/** Sprite compilation: grids and variants resolve to the right pixels, and runs draw them back exactly. */
import { describe, expect, it } from 'vitest';
import { SPRITE_IDS } from '@core/ids/sprites';
import type { SpriteTable } from '@core/types';
import { compileSprite, resolveSprite, spriteSvg, type CompiledSprite } from './compile';
import { PALETTE } from './palette';
import { SPRITES } from './table';

/** A tiny stand-in table (a real one needs a row for every sprite id). */
const table = (rows: Record<string, unknown>) => rows as unknown as SpriteTable;

/** Paints a compiled sprite's runs back into one hex colour (or null) per pixel. */
function decode(c: CompiledSprite): (string | null)[] {
  const px: (string | null)[] = Array<string | null>(c.w * c.h).fill(null);
  for (const p of c.paths) {
    const runs = [...p.d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
    expect(runs.map(m => m[0]).join('')).toBe(p.d); // nothing but runs
    for (const [, x, y, n, back] of runs) {
      expect(back).toBe(n);
      for (let i = 0; i < Number(n); i++) {
        const at = Number(y) * c.w + Number(x) + i;
        expect(px[at], `pixel ${at} painted twice`).toBeNull();
        px[at] = p.fill;
      }
    }
  }
  return px;
}

describe('resolveSprite', () => {
  it('maps each grid character through its keys; "." is transparent', () => {
    const t = table({
      nutria: { id: 'nutria', rows: ['ab', '.a'], keys: { a: 'ink', b: 'gold' }, glow: 'hot' },
    });
    expect(resolveSprite('nutria', t)).toEqual({
      id: 'nutria',
      w: 2,
      h: 2,
      px: ['ink', 'gold', null, 'ink'],
      fx: null,
      glow: 'hot',
    });
  });

  it('recolours the base, then paints, keeps and erases with the overlay; fx and glow inherit', () => {
    const t = table({
      nutria: { id: 'nutria', rows: ['aa', 'ab'], keys: { a: 'ink', b: 'gold' }, fx: 'ghost', glow: 'hot' },
      hustler: {
        id: 'hustler',
        from: 'nutria',
        recolor: { gold: 'cyan' },
        overlay: ['.c', '_.'],
        keys: { c: 'red' },
      },
    });
    const r = resolveSprite('hustler', t);
    expect(r.px).toEqual(['ink', 'red', null, 'cyan']);
    expect(r.fx).toBe('ghost');
    expect(r.glow).toBe('hot');
  });

  it('rejects cycles, unknown characters and ragged rows', () => {
    const cycle = table({
      nutria: { id: 'nutria', from: 'hustler', recolor: { ink: 'gold' } },
      hustler: { id: 'hustler', from: 'nutria', recolor: { ink: 'gold' } },
    });
    expect(() => resolveSprite('nutria', cycle)).toThrow(/cycle/);
    expect(() =>
      resolveSprite('nutria', table({ nutria: { id: 'nutria', rows: ['ax'], keys: { a: 'ink' } } })),
    ).toThrow(/'x' has no key/);
    expect(() =>
      resolveSprite('nutria', table({ nutria: { id: 'nutria', rows: ['aa', 'a'], keys: { a: 'ink' } } })),
    ).toThrow(/row 1 is 1 wide/);
  });
});

describe('compileSprite', () => {
  it('merges each colour into horizontal runs, one path per colour', () => {
    const t = table({ nutria: { id: 'nutria', rows: ['aab.', 'a..b'], keys: { a: 'ink', b: 'gold' } } });
    const c = compileSprite('nutria', t, PALETTE);
    expect(c.paths).toEqual([
      { fill: PALETTE.ink, d: 'M0 0h2v1h-2zM0 1h1v1h-1z' },
      { fill: PALETTE.gold, d: 'M2 0h1v1h-1zM3 1h1v1h-1z' },
    ]);
  });

  it('draws every real sprite back to exactly its resolved pixels', () => {
    for (const id of SPRITE_IDS) {
      const r = resolveSprite(id, SPRITES);
      expect(decode(compileSprite(id, SPRITES, PALETTE)), id).toEqual(r.px.map(c => (c ? PALETTE[c] : null)));
    }
  });
});

describe('spriteSvg', () => {
  it('writes a standalone, crisp SVG with the glow as a drop-shadow', () => {
    const t = table({ nutria: { id: 'nutria', rows: ['a'], keys: { a: 'ink' }, glow: 'hot' } });
    const svg = spriteSvg(compileSprite('nutria', t, PALETTE), { scale: 4, background: '#140527' });
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="4" height="4" viewBox="0 0 1 1" shape-rendering="crispEdges"');
    expect(svg).toContain(`flood-color="${PALETTE.hot}"`);
    expect(svg).toContain('filter="url(#glow-nutria)"');
    expect(svg).toContain('<rect width="1" height="1" fill="#140527"/>');
  });
});
