/**
 * Battle-input UI state: which menu is open, and whether we're waiting for a target tap. It's
 * purely presentational, so it lives in a small store here rather than in the game's view state.
 */
import { proxy, useSnapshot } from 'valtio';
import type { PlayerIntent } from '@core/types';
import type { GameApp } from '@app/game';
import { useApp } from '../GameContext';

type MakeIntent = (targetId: string) => PlayerIntent;

export const battleInput = proxy<{ menu: 'actions' | 'skills'; pending: MakeIntent | null }>({
  menu: 'actions',
  pending: null,
});

/** Back to the six actions with nothing pending. */
export function resetBattleInput(): void {
  battleInput.menu = 'actions';
  battleInput.pending = null;
}

/** Act now when only one enemy stands; otherwise wait for a tap on an enemy card. */
export function withTarget(app: GameApp, targets: readonly string[], make: MakeIntent): void {
  if (targets.length === 1) {
    resetBattleInput();
    app.chooseIntent(make(targets[0]!));
    return;
  }
  battleInput.pending = make;
}

/** Enemy cards use this to know whether they're tappable, and to answer the tap. */
export function useTargeting() {
  const app = useApp();
  const snap = useSnapshot(battleInput);
  return {
    pending: snap.pending !== null,
    pick(id: string) {
      const make = battleInput.pending;
      if (!make) return;
      resetBattleInput();
      app.chooseIntent(make(id));
    },
  };
}
