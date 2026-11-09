/**
 * A play session: the live save (a Valtio proxy the UI renders from), the random streams, the
 * Director that runs scenes, the current route, and the commands the UI calls.
 *
 * The session is UI-agnostic: give it the React presenter to play in the browser, or the scripted
 * presenter to play headlessly in tests. Nothing here imports React.
 */
import { proxy } from 'valtio/vanilla';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { DistrictId, PlaceId } from '@core/ids/world';
import { createRng, restoreRng, type Rng } from '@core/rng';
import type { GameState, Settings } from '@core/types';
import {
  DISTRICTS,
  PLACE_SCENES,
  TEXT,
  hitTheStreets,
  prologue,
  resumeTutorial,
  trackBounty,
  travel,
  wakeUpAtClub,
} from '@content/index';
import { clampVitals, newGame, priceFor, storyIs, storyReached } from '@engine/index';
import { Director } from '@narrative/director';
import type { PlaceHelpers, PlaceIntro, PlaceOption } from '@narrative/define';
import type { FightSpec, Presenter, Route, RunResult, Scene } from '@narrative/types';
import type { BossId } from '@core/ids/enemies';
import type { BattleOutcome, SessionPort } from './sessionPort';
import { decodeSave, encodeSave, type LoadError } from './save/format';
import type { SaveStorage } from './save/storage';
import { createSceneContext, gotoDistrict } from './sceneContext';

/** What a session needs from its environment. */
export interface SessionDeps {
  /** How scenes and battles are shown. */
  presenter: Presenter;
  /** Where saves go. */
  storage: SaveStorage;
  /** Seed source for new games and cosmetic randomness (defaults to crypto randomness). */
  seed?: () => number;
  /** Report unexpected errors (defaults to console.error). */
  onError?: (e: unknown) => void;
  /** A scene started or finished (for a busy indicator). */
  onBusy?: (busy: boolean) => void;
  /**
   * Replace real battles (tests only): the transcript oracle stubs every fight as a win so it can
   * compare scenes against v1 without battle noise.
   */
  battle?: (spec: FightSpec, opts: { boss?: BossId }) => Promise<BattleOutcome>;
}

/** A random 31-bit seed from the platform's crypto source. */
export function randomSeed(): number {
  const a = new Uint32Array(1);
  globalThis.crypto.getRandomValues(a);
  return a[0]! >>> 1;
}

/** The live session. */
export class Session implements SessionPort {
  /** The save, as a Valtio proxy: the engine mutates it, React renders snapshots of it. */
  readonly store = proxy<{ game: GameState | null }>({ game: null });
  /** The game's random stream (saved with the game). */
  rng: Rng = createRng(1);
  /** Randomness that only affects presentation (timing-bar placement). Never saved. */
  readonly cosmetic: Rng;
  /** Where the player is when no scene runs. */
  route: Route = { kind: 'district' };
  /** Runs scenes one at a time. */
  readonly director: Director;

  constructor(readonly deps: SessionDeps) {
    this.cosmetic = createRng((deps.seed ?? randomSeed)());
    this.director = new Director({
      makeContext: signal => createSceneContext(this, signal),
      onInterrupt: {
        cut: async s => {
          this.afterCut();
          await wakeUpAtClub(s);
        },
      },
      onError: e => {
        (this.deps.onError ?? console.error)(e);
        return async s => {
          s.toast(TEXT.somethingBroke);
          this.route = { kind: 'district' };
        };
      },
      onSettled: () => this.showRoute(),
      onBusy: busy => this.deps.onBusy?.(busy),
    });
  }

  /** The current save. Throws when no game is loaded. */
  get game(): GameState {
    if (!this.store.game) throw new Error('No game in progress.');
    return this.store.game;
  }

  /* ---------------- lifecycle ---------------- */

  /** Start a new character (does not start the prologue). */
  newGame(name: string, roots: RootsId, cls: ClassId, settings?: Settings): void {
    this.store.game = newGame(name, roots, cls, settings, 0);
    this.rng = createRng((this.deps.seed ?? randomSeed)());
    this.route = { kind: 'district' };
  }

  /** Load the saved game. Returns why not, or null on success. */
  load(raw: string | null = this.deps.storage.read()): LoadError | null {
    const r = decodeSave(raw);
    if (typeof r === 'string') return r;
    this.store.game = r.game;
    this.rng = restoreRng(r.rng);
    this.route = { kind: 'district' };
    return null;
  }

  /** The current save as text (for export codes). */
  serialize(): string | null {
    return this.store.game ? encodeSave(this.store.game, this.rng.save()) : null;
  }

  /** Write the save. Manual saves report failure (the UI shows a toast). */
  save(manual = false): boolean {
    const raw = this.serialize();
    if (!raw) return false;
    const ok = this.deps.storage.write(raw);
    if (!ok && manual) this.deps.presenter.toast('Storage is unavailable here. Use Export Save in Settings.');
    return ok;
  }

  /** Leave the current game: abort any scene. The save stays on disk. */
  async quit(): Promise<void> {
    await this.director.abort('title');
    this.store.game = null;
  }

  /* ---------------- flows ---------------- */

  /** Run a scene (single flight; refused while another runs). */
  run(scene: Scene, name: string): Promise<RunResult> {
    return this.director.run(scene, { name });
  }

  /** The opening. */
  startPrologue(): Promise<RunResult> {
    return this.run(prologue, 'prologue');
  }

  /** Continue a loaded game where it left off (v1: resumeGame). */
  resume(): Promise<RunResult> {
    const g = this.game;
    const pending = g.resume;
    g.resume = null;
    if (pending?.kind === 'tutorial') return this.run(resumeTutorial(pending.step), 'resume-tutorial');
    if (storyIs(g, { act: 'treme', step: 'meet_roux' }) && !g.flags.metRoux && !g.flags.hasCassette) {
      return this.startPrologue();
    }
    if (!DISTRICTS[g.district] || !g.unlocked.includes(g.district)) g.district = 'treme';
    const district = g.district;
    return this.run(async s => {
      // DEVIATION: v1's resume went through goDistrict, which reset the Tower floor; a reload keeps
      // the climb (known-issues, "fixed by the new architecture").
      await gotoDistrict(this, s, district, { keepClimb: true });
      if (pending?.kind === 'battle' && pending.context !== 'street') s.toast(TEXT.fightRestarts);
    }, 'resume');
  }

  /** After losing on the streets: back to the club (before the wake-up scene). */
  private afterCut(): void {
    const g = this.game;
    g.district = 'treme';
    g.resume = null;
    g.inTower = false;
    clampVitals(g);
    this.save();
    this.route = { kind: 'district' };
  }

  /* ---------------- navigation (UI commands) ---------------- */

  /** Show the current route. */
  showRoute(): void {
    if (this.store.game) this.deps.presenter.route(this.route);
  }

  /** Read-only rules places need for their options. */
  placeHelpers(): PlaceHelpers {
    const g = this.game;
    return {
      price: (base, district) => priceFor(g, base, district ?? g.district),
      is: p => storyIs(g, p),
      reached: p => storyReached(g, p),
    };
  }

  /** A place's intro right now. */
  placeIntro(id: PlaceId): PlaceIntro | null {
    return PLACE_SCENES[id]?.intro?.(this.game, this.placeHelpers()) ?? null;
  }

  /** The options at a place right now. */
  placeOptions(id: PlaceId): PlaceOption[] {
    return PLACE_SCENES[id]?.options(this.game, this.placeHelpers()) ?? [];
  }

  /** Walk into a place. */
  enterPlace(id: PlaceId): void {
    if (this.director.busy) return;
    this.route = { kind: 'place', id };
    this.showRoute();
  }

  /** Back to the district screen. */
  leavePlace(): void {
    if (this.director.busy) return;
    this.route = { kind: 'district' };
    this.showRoute();
  }

  /** Choose an option at the current place. */
  chooseOption(place: PlaceId, key: string): Promise<RunResult> | null {
    const opt = this.placeOptions(place).find(o => o.key === key);
    if (!opt) return null;
    return this.run(opt.run, `${place}:${key}`);
  }

  /** Hit the Streets. */
  hitTheStreets(): Promise<RunResult> {
    return this.run(hitTheStreets, 'streets');
  }

  /** Hunt the district bounty. */
  trackBounty(): Promise<RunResult> {
    return this.run(trackBounty, 'bounty');
  }

  /** Ride to another district. */
  travel(to: DistrictId): Promise<RunResult> {
    this.route = { kind: 'district' };
    return this.run(travel(to), `travel:${to}`);
  }
}
