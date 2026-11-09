/**
 * What the scene context and battle controller need from a Session. A separate interface so those
 * modules don't import the Session class (which imports them), keeping the module graph acyclic.
 */
import type { BossId } from '@core/ids/enemies';
import type { Rng } from '@core/rng';
import type { GameState } from '@core/types';
import type { FightSpec, Presenter, Route } from '@narrative/types';

/** A battle's full outcome (scenes see only win/fled; bosses also retry/lose). */
export type BattleOutcome = 'win' | 'fled' | 'retry' | 'lose';

/** The session, as scenes and battles see it. */
export interface SessionPort {
  /** The current save. */
  readonly game: GameState;
  /** The game's random stream. */
  rng: Rng;
  /** Presentation-only randomness. */
  readonly cosmetic: Rng;
  /** Where the player returns when the scene ends. */
  route: Route;
  /** Environment. */
  readonly deps: {
    /** How scenes and battles are shown. */
    presenter: Presenter;
    /** Test seam: replaces real battles. */
    battle?: (spec: FightSpec, opts: { boss?: BossId; clickPhase?: boolean }) => Promise<BattleOutcome>;
  };
  /** Autosave (manual saves report failure). */
  save(manual?: boolean): boolean;
  /** Make `next` the current save (New Game+); the random stream carries on. */
  replaceGame(next: GameState): void;
}
