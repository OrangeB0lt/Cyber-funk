/** The bag: counted items with optional carry limits. */
import type { ItemId } from '@core/ids/items';
import type { GameState } from '@core/types';
import { ITEMS } from '@content/data';

/** Add `n` (default 1), respecting the item's carry limit. */
export function addItem(s: GameState, id: ItemId, n?: number): void {
  s.bag[id] = (s.bag[id] || 0) + (n || 1);
  const max = ITEMS[id] && ITEMS[id].max;
  if (max) s.bag[id] = Math.min(max, s.bag[id]!);
}

/** Remove `n` (default 1). Returns false if the player had none. */
export function removeItem(s: GameState, id: ItemId, n?: number): boolean {
  if (!s.bag[id]) return false;
  s.bag[id]! -= n || 1;
  if (s.bag[id]! <= 0) delete s.bag[id];
  return true;
}

/** How many the player carries. */
export function countItem(s: Readonly<GameState>, id: ItemId): number {
  return s.bag[id] || 0;
}
