/**
 * The Director runs scenes, one at a time.
 *
 * - Single flight: while a scene runs, `run` refuses another (`{ status: 'busy' }`), so a double tap
 *   can't start two scenes.
 * - Cancellation: `abort` signals the running scene. Presenter waits reject, so the scene unwinds
 *   instead of being orphaned (v1 left dangling promises when you went back to the title).
 * - Interrupts: a SceneInterrupt (losing a street fight) runs its handler scene in the same flight.
 * - Errors: anything else runs the error handler (a toast and a return to the hub) instead of
 *   leaving the player stuck.
 * - Settling: when the flight ends, `onSettled` shows the current route, so there are no dead ends.
 */
import { SceneInterrupt, type RunResult, type Scene, type SceneContext } from './types';

/** How the Director talks to the rest of the app. */
export interface DirectorConfig {
  /** Build a fresh scene context bound to this run's abort signal. */
  makeContext(signal: AbortSignal): SceneContext;
  /** Handler scenes for interrupts (e.g. `cut` → wake up at the club). */
  onInterrupt: Record<SceneInterrupt['kind'], Scene>;
  /** Called with an unexpected error; may return a recovery scene to run. */
  onError(error: unknown): Scene | null;
  /** Called when a flight ends (finished, interrupted, failed or aborted). */
  onSettled(result: RunResult): void;
  /** Called when a flight starts and ends (for a busy indicator). */
  onBusy?(busy: boolean): void;
}

/** True for errors caused by aborting (DOMException AbortError or our own abort reason). */
export function isAbort(e: unknown): boolean {
  return (
    (e instanceof Error && e.name === 'AbortError') ||
    (typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError')
  );
}

/** An abort reason that reads well in logs. */
export function abortError(reason: string): Error {
  const e = new Error(`Scene aborted: ${reason}`);
  e.name = 'AbortError';
  return e;
}

/** Runs scenes one at a time. */
export class Director {
  private flight: { name: string; ctrl: AbortController; done: Promise<RunResult> } | null = null;

  /** Create a Director with its wiring. */
  constructor(private readonly cfg: DirectorConfig) {}

  /** A scene is running. */
  get busy(): boolean {
    return this.flight !== null;
  }

  /** Name of the running scene (for debugging). */
  get current(): string | null {
    return this.flight?.name ?? null;
  }

  /** Run a scene unless one is already running. */
  run(scene: Scene, meta: { name: string }): Promise<RunResult> {
    if (this.flight) return Promise.resolve({ status: 'busy' });
    const ctrl = new AbortController();
    const done = this.fly(scene, ctrl).then(result => {
      this.flight = null;
      this.cfg.onBusy?.(false);
      this.cfg.onSettled(result);
      return result;
    });
    this.flight = { name: meta.name, ctrl, done };
    this.cfg.onBusy?.(true);
    return done;
  }

  /** Abort the running scene (if any) and wait for it to unwind. */
  async abort(reason: string): Promise<void> {
    const f = this.flight;
    if (!f) return;
    f.ctrl.abort(abortError(reason));
    await f.done;
  }

  private async fly(scene: Scene, ctrl: AbortController): Promise<RunResult> {
    try {
      await scene(this.cfg.makeContext(ctrl.signal));
      return { status: 'done' };
    } catch (e) {
      if (ctrl.signal.aborted || isAbort(e)) return { status: 'aborted' };
      if (e instanceof SceneInterrupt) {
        try {
          await this.cfg.onInterrupt[e.kind](this.cfg.makeContext(ctrl.signal));
        } catch (inner) {
          if (ctrl.signal.aborted || isAbort(inner)) return { status: 'aborted' };
          return this.recover(inner, ctrl);
        }
        return { status: 'interrupted', kind: e.kind };
      }
      return this.recover(e, ctrl);
    }
  }

  private async recover(error: unknown, ctrl: AbortController): Promise<RunResult> {
    const fallback = this.cfg.onError(error);
    if (fallback) {
      try {
        await fallback(this.cfg.makeContext(ctrl.signal));
      } catch {
        // The recovery scene itself failed; settle anyway so the player isn't stuck.
      }
    }
    return { status: 'failed', error };
  }
}
