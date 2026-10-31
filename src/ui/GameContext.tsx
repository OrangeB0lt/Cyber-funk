/**
 * React access to the game. Components read snapshots (frozen; writing to them throws in dev) and
 * call commands on the app. They never mutate state directly.
 */
import { createContext, useContext } from 'react';
import { useSnapshot } from 'valtio';
import type { GameApp } from '@app/game';
import type { GameState } from '@core/types';

export const GameContext = createContext<GameApp | null>(null);

/** The game app (commands). */
export function useApp(): GameApp {
  const app = useContext(GameContext);
  if (!app) throw new Error('useApp outside <GameContext>');
  return app;
}

/** A snapshot of the presentation state. */
export function useView() {
  return useSnapshot(useApp().view);
}

/**
 * A snapshot of the save (null on the title screen), typed as GameState so read-only engine queries
 * (derivedStats, legalActions…) accept it. It is frozen: writing to it throws. Change state through
 * app commands.
 */
export function useGame(): GameState | null {
  return useSnapshot(useApp().store).game as GameState | null;
}
