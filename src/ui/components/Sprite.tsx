/**
 * A character's pixel-art sprite, drawn as inline SVG at a whole-number scale so every pixel stays
 * crisp. Decorative: the character's name is always shown as text beside it, so the art is hidden
 * from screen readers. Only spans and an svg, so it can sit inside a <p> or a <button>. The art and
 * the spec for every character: src/content/sprites/, docs/vision/character-design.md.
 */
import type { CSSProperties } from 'react';
import type { SpriteId } from '@core/ids/sprites';
import { compiled } from '@content/sprites';
import s from './Sprite.module.css';

/** Idle bob cycle (ms); `phase` offsets each sprite within it so a group doesn't bob in unison. */
const BOB_MS = 1600;

export function Sprite({
  id,
  scale,
  idle,
  flip,
  hit,
  phase = 0,
  className,
}: {
  /** Which sprite. */
  id: SpriteId;
  /** Pixel size in CSS px: 3 in battle and on the create screen, 2 for portraits and sheet rows. */
  scale: 1 | 2 | 3 | 4;
  /** Bob gently (battle). */
  idle?: boolean;
  /** Mirror it (the player's own lines face left, toward the text). */
  flip?: boolean;
  /** The newest damage float's id. Each new value flashes the sprite white once. */
  hit?: number | null;
  /** 0–1: where in the bob cycle this sprite starts. */
  phase?: number;
  /** Extra class for the wrapper. */
  className?: string;
}) {
  const c = compiled(id);
  const w = c.w * scale;
  const h = c.h * scale;
  const style = {
    '--px': `${scale}px`,
    '--glow': c.glow ?? undefined,
    '--phase': `${-Math.round(phase * BOB_MS)}ms`,
    width: w,
    height: h,
  } as CSSProperties;
  const wrap = [s.sprite, c.glow && s.glow, idle && s.idle, className].filter(Boolean).join(' ');
  const art = [hit ? s.hit : '', flip ? s.flip : ''].filter(Boolean).join(' ') || undefined;
  return (
    <span className={wrap} style={style} data-testid={`sprite:${id}`}>
      <span className={c.fx ? s[c.fx] : s.still}>
        {/* Keyed on the hit, so each new hit remounts the svg and replays the flash. */}
        <svg
          key={hit ?? 'rest'}
          className={art}
          width={w}
          height={h}
          viewBox={`0 0 ${c.w} ${c.h}`}
          shapeRendering="crispEdges"
          aria-hidden="true"
        >
          {c.paths.map(p => (
            <path key={p.fill} fill={p.fill} d={p.d} />
          ))}
        </svg>
      </span>
    </span>
  );
}
