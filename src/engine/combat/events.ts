/**
 * The tiny shared vocabulary of the combat modules: logging, ending a battle, finding actors.
 * Kept dependency-free so every other combat module can import it without cycles.
 */
import type { OpponentId } from '@core/ids/enemies';
import type { Actor, Battle, BattleResult, GameState, LogClass } from '@core/types';

/** Append a battle-log line. */
export function logLine(b: Battle, text: string, cls?: LogClass): void {
  b.events.push({ type: 'log', text, cls: cls || '' });
}

/** End the battle (first result wins; later calls are ignored). */
export function endBattle(b: Battle, result: BattleResult): void {
  if (b.over) return;
  b.over = true;
  b.result = result;
  b.events.push({ type: 'end', result });
}

/** Mark an opponent as seen in the Blue Book. */
export function recordSeen(s: GameState, defId: OpponentId): void {
  if (!s.book[defId]) s.book[defId] = { seen: true, weak: false };
}

/** The player or enemy with this id. */
export function actorById(b: Battle, id: string | undefined): Actor | undefined {
  return id === b.player.id ? b.player : b.enemies.find(e => e.id === id);
}
