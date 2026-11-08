/**
 * Stand-in art: a grey "?" bust that keeps the sprite table complete while the real art lands, one
 * batch at a time. The last art batch deletes this file, so any sprite still using it stops compiling.
 */
import type { SpriteId } from '@core/ids/sprites';
import type { GridSpriteDef, SpriteDef } from '@core/types';

const Q24: readonly string[] = [
  '........................',
  '........................',
  '.........kkkkkk.........',
  '........kppppppk........',
  '.......kppppppppk.......',
  '.......kppppppppk.......',
  '.......kppppppppk.......',
  '.......kppppppppk.......',
  '........kppppppk........',
  '.........kppppk.........',
  '.....kkkkkppppkkkkk.....',
  '....kppppppppppppppk....',
  '...kppppppaaaappppppk...',
  '...kpppppaappaapppppk...',
  '...kpppppppppaapppppk...',
  '...kppppppppaappppppk...',
  '...kpppppppaapppppppk...',
  '...kpppppppaapppppppk...',
  '...kppppppppppppppppk...',
  '...kpppppppaapppppppk...',
  '...kqqqqqqqqqqqqqqqqk...',
  '...kkkkkkkkkkkkkkkkkk...',
  '........................',
  '........................',
];
const Q32: readonly string[] = [...Array<string>(8).fill('.'.repeat(32)), ...Q24.map(r => `....${r}....`)];

/** A placeholder row for `id` (32×32 for bosses). */
export function todo<K extends SpriteId>(id: K, size: 24 | 32 = 24): GridSpriteDef & { id: K } {
  return { id, rows: size === 32 ? Q32 : Q24, keys: { k: 'ink', p: 'grey', q: 'grey_lo', a: 'chrome_md' } };
}

/** Whether a row is still a placeholder (the validator skips those). */
export function isTodo(def: SpriteDef): boolean {
  return 'rows' in def && (def.rows === Q24 || def.rows === Q32);
}
