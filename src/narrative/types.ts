/**
 * The scene API: what story code can do, and what the presentation layer must provide.
 *
 * Scene authors only ever see `SceneContext`. The app implements it (app/sceneContext.ts) on top of
 * the engine and a `Presenter`; the React UI and the test harness are two Presenters. See
 * docs/adr/0004-scene-api.md and docs/guides/writing-scenes.md.
 */
import type { BandmateId } from '@core/ids/band';
import type { StatKey } from '@core/ids/combat';
import type { BossId, EnemyId, NoteId, OpponentId } from '@core/ids/enemies';
import type { FlagId, StoryChoices } from '@core/ids/flags';
import type { GearId, ItemId, ShopItemId } from '@core/ids/items';
import type { SpriteId } from '@core/ids/sprites';
import type { StoryPosition } from '@core/ids/story';
import type { DistrictId, NpcId, PlaceId, QuestId } from '@core/ids/world';
import type { Rng } from '@core/rng';
import type {
  Battle,
  BattleContext,
  BattleEvent,
  GameState,
  LevelUp,
  NextFightMods,
  PlayerIntent,
  QuestStatus,
  TimingGradeDef,
  TimingSpec,
  VictorySummary,
} from '@core/types';

/** A piece of story: everything a place option, NPC talk, event or boss scene does. */
export type Scene = (s: SceneContext) => Promise<void>;

/** Choice options keyed by what the code branches on; the value is the label (or a label with options). */
export type ChoiceOptions<K extends string> = { readonly [P in K]: string | ChoiceOption };

/** A choice option with extras. */
export interface ChoiceOption {
  /** Button text. */
  label: string;
  /** Hide the option unless true. Default true. */
  when?: boolean;
  /** Highlight it (the story-relevant choice). */
  hint?: boolean;
  /** Don't echo the choice into the transcript as the player's line. */
  silent?: boolean;
}

/** One line of stock in a shop. */
export interface ShopStock {
  /** What's for sale. */
  id: ShopItemId;
  /** Price override (before district discounts). */
  price?: number;
  /** Only stocked while true. */
  when?: boolean;
}

/** A sheet (bottom panel) a scene can open and wait on until the player closes it. */
export type SheetRequest =
  | {
      /** A shop. */
      kind: 'shop';
      /** Shop name. */
      title: string;
      /** What's for sale. */
      stock: readonly ShopStock[];
      /** Hide the Sell tab. */
      noSell?: boolean;
      /** Who runs the shop: their portrait shows beside the title. */
      keeper?: SpriteId;
    }
  | {
      /** Bandmate swapping. */
      kind: 'band';
    }
  | {
      /** The journal. */
      kind: 'journal';
    }
  | {
      /** The bounty board. */
      kind: 'bounties';
    };

/** Where the player is when no scene is running. */
export type Route =
  | {
      /** The district screen. */
      kind: 'district';
    }
  | {
      /** A place screen. */
      kind: 'place';
      /** Which place. */
      id: PlaceId;
    };

/** How a fight is set up. */
export interface FightSpec {
  /** Who: enemy ids, or `random` for a street group from the district pool. */
  enemies: readonly EnemyId[] | 'random';
  /** Fixed level for every enemy. Omitted: each rolls a level. */
  level?: number;
  /**
   * How omitted levels are rolled: `district` (default) uses the overlap of the enemy's and the
   * district's ranges; `own` uses the enemy's own range (Cutting Contest rivals).
   */
  levels?: 'district' | 'own';
  /** District for random groups and level ranges. Default: the current district. */
  district?: DistrictId;
  /** Framing. Default `street`. */
  context?: BattleContext;
  /** The player acts last in round 1. */
  ambush?: boolean;
  /** SPLIT is not allowed. */
  noFlee?: boolean;
  /** A line written to the battle log before round 1. */
  intro?: string;
}

/** How a fight ended for the scene. Losing a street fight never returns (see SceneInterrupt). */
export type FightOutcome = 'win' | 'fled';

/** How one boss battle ended: won, lost and run back (the player chose a retry), or walked away. */
export type BossFightOutcome = 'win' | 'retry' | 'lose';

/** One entry in a block of cards (see SceneContext.cards). */
export interface StoryCard {
  /** Bold heading (a marcher's name, an epilogue subject). */
  title?: string;
  /** The text. `\n` is a line break. */
  text: string;
  /** Fainter text (the credits' dedications). */
  dim?: boolean;
}

/** How a block of cards is drawn: the second-line roster, the epilogue cards, or the credits. */
export type CardStyle = 'roster' | 'epilogue' | 'credits';

/** Everything a scene can do. Methods that show something to the player return a Promise; await it. */
export interface SceneContext {
  /** The live save. Read anything; write simple fields directly (helpers below add toasts and rules). */
  readonly game: GameState;
  /** Aborted when the player leaves the scene (back to title, load). Long waits should honor it. */
  readonly signal: AbortSignal;
  /** The game's random stream. Never use Math.random in scenes. */
  readonly rng: Rng;

  /** Clear the story view and show a title (a new screen of story). */
  title(text?: string | null): void;
  /** Narration: typed out, then the player taps Continue. */
  narrate(text: string): Promise<void>;
  /** A character speaks. Their portrait shows beside the line. */
  say(who: NpcId, text: string): Promise<void>;
  /**
   * Someone outside the NPC table speaks, with an explicit name color and, optionally, a portrait
   * (for example the Restless Haints ghosts, drawn as `'haint'`).
   */
  speak(name: string, color: string, text: string, sprite?: SpriteId): Promise<void>;
  /** Offer choices; resolves with the chosen key. The label is echoed as the player's line. */
  choose<K extends string>(options: ChoiceOptions<K>, prompt?: string): Promise<K>;
  /** A yes/no dialog. */
  confirm(title: string, body: string, yes?: string, no?: string): Promise<boolean>;
  /** A brief message that fades. */
  toast(text: string): void;
  /** Open a sheet and wait for the player to close it. */
  sheet(req: SheetRequest): Promise<void>;
  /** Pause. */
  wait(ms: number): Promise<void>;
  /**
   * One On the One timing bar outside battle (the Feu Follet sit-in): the player taps it, or with
   * auto rhythm it rolls. Resolves with the grade.
   */
  timing(): Promise<TimingGradeDef>;
  /**
   * A block of fixed-width text in the story that redraws in place each call (the crawfish race's
   * track). The first call after a new screen adds it below the lines so far; later calls replace it.
   */
  board(text: string): void;

  /** Travel to a district: autosave, then its first-visit narration, then the district screen. */
  goto(district: DistrictId): Promise<void>;
  /** Where the player returns when this scene ends (defaults to wherever the scene started). */
  returnTo(route: Route): void;

  /** Add items (toast "Got X." unless silent). */
  give(id: ItemId, n?: number, opts?: { silent?: boolean }): void;
  /** Remove items. False if the player had none. */
  take(id: ItemId, n?: number): boolean;
  /** How many the player carries. */
  count(id: ItemId): number;
  /** Change Doubloons (a gain toasts). Spending more than the player has fails and returns false. */
  gold(delta: number): boolean;
  /** Grant XP: toast, then level-up popups (awaited). */
  xp(n: number): Promise<void>;
  /** Heal a fraction of max Heart. */
  heal(pct: number): void;
  /** Restore a fraction of max Funk. */
  funk(pct: number): void;
  /** Full Heart and Funk. */
  rest(): void;
  /** A stat check: base + 1.5% per point of the stat (+15% for Yat roots if `yatBonus`), 10–95%. */
  check(stat: StatKey, base: number, yatBonus?: boolean): boolean;
  /** Scale a base XP reward by level (+35% per level). */
  scaleXp(base: number): number;
  /** Scale a base Doubloon reward by level (+30% per level). */
  scaleGold(base: number): number;
  /** Bonuses for the next battle (merged with any already queued). */
  nextFight(mods: NextFightMods): void;
  /** Note a tip about an opponent in the Blue Book (shows its weakness early). */
  bookHint(id: OpponentId): void;
  /** Permanently raise a stat (blessings, the traiteur's herbs, King Cake). Heart and Funk raise their maximums. */
  permStat(stat: StatKey, n: number): void;

  /** One-time story beats. */
  readonly flags: {
    /** Is the flag set? */
    has(id: FlagId): boolean;
    /** Set it. */
    set(id: FlagId): void;
  };
  /** The main quest. */
  readonly story: {
    /** Exactly at this step? */
    is(p: StoryPosition): boolean;
    /** At or past this step? */
    reached(p: StoryPosition): boolean;
    /** Jump to a step. */
    set(p: StoryPosition): void;
  };
  /** A side quest's status (undefined = never offered). */
  quest(id: QuestId): QuestStatus | undefined;
  /** Set a side quest's status. */
  setQuest(id: QuestId, status: QuestStatus): void;
  /** Read a progress counter. */
  counter(name: string): number;
  /** Record one of the three big boss decisions. */
  choice<K extends keyof StoryChoices>(key: K, value: NonNullable<StoryChoices[K]>): void;
  /** Add a key item to the status screen. */
  keyItem(id: ItemId): void;
  /** Add gear to the gear bag, unless it is already there (optionally equip it either way). */
  gainGear(id: GearId, opts?: { equip?: boolean }): void;
  /** A bandmate joins (and is brought along if there's room). */
  recruit(id: BandmateId): void;
  /** Recover a Blue Note: the chime, the quote, the count. */
  giveNote(id: NoteId): Promise<void>;
  /** Autosave now. Manual saves report failure. */
  save(manual?: boolean): boolean;

  /** Fight. Resolves on a win or an escape; losing a street fight sends the player to the club. */
  fight(spec: FightSpec): Promise<FightOutcome>;
  /** The full boss sequence: pre-scene (first time), the fight (retry on loss), post-scene, next act. */
  boss(id: BossId): Promise<'win' | 'lose'>;
  /**
   * One boss battle and nothing around it, for scenes that run their own boss sequence (the Tower).
   * A loss shows the defeat screen and puts Heart, Funk, the bag and buffs back; the result says
   * whether the player ran it back (`retry`) or walked away (`lose`). A win records the boss as
   * beaten and checkpoints the save, so a reload replays its post-fight scene (`BOSS_SCENES[id].post`).
   * `clickPhase` is the Click's shield, broken by Play the Blues.
   */
  bossFight(id: BossId, opts?: { clickPhase?: boolean }): Promise<BossFightOutcome>;
  /**
   * A static block of cards below the lines so far, with no Continue: the second-line roster, the
   * epilogue, the credits. Like `board`, it's drawn once; a new screen (`title`) clears it.
   */
  cards(style: CardStyle, items: readonly StoryCard[]): void;
  /**
   * Start New Game+: the save becomes a fresh one for the same character, one cycle up, carrying
   * level, XP, gear, sheet music, blessings, permanent stats, the bag, half the Doubloons, the Lexicon,
   * the Blue Book (all seen) and the day; Heart and Funk full; saved. `s.game` is the new save
   * afterwards (a reference taken before the call is the old one).
   */
  newGamePlus(): void;
  /** Round Heart and Funk and clamp them to the current maximums (after something changes those). */
  clampVitals(): void;
}

/** Thrown by a scene to stop it and hand control to the Director's interrupt handler. */
export class SceneInterrupt extends Error {
  /** `cut`: lost a street fight (wake up at the club). */
  readonly kind: 'cut';

  /** Create an interrupt of a kind. */
  constructor(kind: 'cut') {
    super(kind);
    this.kind = kind;
  }
}

/* ------------------------------------------------------------------ */
/* Presenter                                                            */
/* ------------------------------------------------------------------ */

/** A typed-out story line. */
export interface StoryLineSpec {
  /** Speaker name (null = narration). */
  who: string | null;
  /** Speaker color. */
  color?: string;
  /** The text (may contain [[lexicon]] markup). */
  text: string;
  /** Who is speaking, when it's someone from the NPC table (the UI shows their portrait). */
  npc?: NpcId;
  /** The portrait for a speaker outside the NPC table (`speak` with a sprite). */
  sprite?: SpriteId;
}

/** A choice as the presenter shows it. */
export interface ChoiceView {
  /** The key returned when picked. */
  key: string;
  /** Button text (lexicon markup stripped by the presenter). */
  label: string;
  /** Highlighted. */
  hint?: boolean;
}

/** What the presentation layer must do for scenes and battles. */
export interface Presenter {
  /** Start a new story screen. */
  story(title: string | null): void;
  /** Type a line, then wait for Continue. */
  line(l: StoryLineSpec, signal: AbortSignal): Promise<void>;
  /** Show a prompt line above choices (not typed, no Continue). */
  promptLine(text: string): void;
  /** Echo the player's choice as their line. */
  echo(text: string): void;
  /** Wait for a choice; resolves with its key. */
  choose(options: readonly ChoiceView[], signal: AbortSignal): Promise<string>;
  /** A yes/no dialog. */
  confirm(title: string, body: string, yes: string, no: string, signal: AbortSignal): Promise<boolean>;
  /** Open a sheet and wait until it's closed. */
  sheet(req: SheetRequest, signal: AbortSignal): Promise<void>;
  /** Show level-up popups one by one. */
  levelUps(ups: readonly LevelUp[], signal: AbortSignal): Promise<void>;
  /** A brief message. */
  toast(text: string): void;
  /** Play a sound cue. */
  sound(cue: SoundCue): void;
  /** Pause (honoring speed settings and the signal). */
  wait(ms: number, signal: AbortSignal): Promise<void>;
  /** Show or redraw the fixed-width board in the story (see SceneContext.board). */
  board(text: string): void;
  /** Show a block of cards in the story (see SceneContext.cards). */
  cards(style: CardStyle, items: readonly StoryCard[]): void;
  /** Show a route (district or place screen). */
  route(r: Route): void;
  /** Battle presentation. */
  readonly battle: BattlePresenter;
}

/** Sounds the game asks for. */
export type SoundCue =
  | {
      /** A class's battle-start stab. */
      kind: 'stab';
      /** Instrument class. */
      cls: string;
    }
  | {
      /** Coins. */
      kind: 'coin';
    }
  | {
      /** A Blue Note chime. */
      kind: 'note';
      /** Pitch. */
      freq: number;
      /** Seconds. */
      dur?: number;
    };

/** Battle presentation. The controller drives; the presenter animates and asks the player. */
export interface BattlePresenter {
  /** Show the battle screen. */
  open(b: Battle): void;
  /** Animate events in order; resolves when done. `b` is the live battle (for non-Heart state). */
  play(events: readonly BattleEvent[], b: Battle, signal: AbortSignal): Promise<void>;
  /** Ask the player for an action. */
  intent(b: Battle, signal: AbortSignal): Promise<PlayerIntent>;
  /** Run the timing bar; resolves with the tap phase (0–1) or null for no tap. */
  timing(spec: TimingSpec, signal: AbortSignal): Promise<number | null>;
  /** Show an auto-rhythm result briefly. */
  autoTiming(grade: TimingGradeDef, signal: AbortSignal): Promise<void>;
  /** Show a grade after a manual tap briefly. */
  timingResult(grade: TimingGradeDef, signal: AbortSignal): Promise<void>;
  /** Run Play the Blues; resolves with tap times (ms after the first pad was due). */
  blues(signal: AbortSignal): Promise<number[]>;
  /** The victory screen; resolves on Continue. */
  victory(v: VictorySummary, boss: boolean, signal: AbortSignal): Promise<void>;
  /** The defeat screen. Boss fights offer a retry. */
  defeat(boss: boolean, signal: AbortSignal): Promise<'retry' | 'leave'>;
  /** Leave the battle screen. */
  close(): void;
}

/** The result of running a scene. */
export type RunResult =
  | {
      /** Finished normally, aborted, or refused because another scene was running. */
      status: 'done' | 'aborted' | 'busy';
    }
  | {
      /** Stopped by a SceneInterrupt (its handler ran). */
      status: 'interrupted';
      /** Which interrupt. */
      kind: SceneInterrupt['kind'];
    }
  | {
      /** Threw. The error handler ran. */
      status: 'failed';
      /** What was thrown. */
      error: unknown;
    };
