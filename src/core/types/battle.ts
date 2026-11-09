/**
 * Runtime combat state: actors, the battle object, and the event stream the UI animates.
 *
 * Field names follow v1 deliberately (`hp`, `fp`, `charged`, `onceUsed`…): until cutover the parity
 * oracle compared these objects field for field with v1's (ADR-0003). Battles are plain objects owned
 * by the engine; they are never put in a Valtio proxy.
 */
import type { ClassId } from '../ids/characters';
import type { CombatStatKey, SkillId, StatusId, TimingId, ToneId } from '../ids/combat';
import type { BossId, OpponentId } from '../ids/enemies';
import type { BandmateId } from '../ids/band';
import type { ItemId } from '../ids/items';
import type { Rng } from '../rng';
import type { StoryPosition } from '../ids/story';
import type { GameState } from './state';

/** The four stats an actor fights with. */
export type CombatStats = Record<CombatStatKey, number>;

/** One status on an actor. */
export interface StatusInstance {
  /** Which status. */
  id: StatusId;
  /** Turns remaining. Counts down at the end of the owner's turn. */
  turns: number;
  /** Applied (or refreshed) since the owner's last turn ended, so it skips one countdown. */
  fresh: boolean;
}

/** A Bell Wall or VAMP brace, cleared at the start of the owner's next turn. */
export interface Guard {
  /** Fraction of damage still taken. */
  pct: number;
  /** Fraction of blocked damage reflected to the attacker. */
  reflect: number;
}

/** Per-actor scratch state used by specific skills and boss AI. */
export interface ActorFlags {
  /** Dirge: the next damaging skill this battle deals +50%. */
  dirgeNext?: boolean;
  /** Dirge: the round Dirge was played (Cut the Body Loose checks it). */
  dirgeTurn?: number;
  /** Count Off: set the Big Four beat to this value after the current action. */
  setBeat?: number;
  /** Fermata: lose the next turn. */
  loseTurn?: boolean;
  /** The boss's half-Heart line has been spoken. */
  halfLine?: boolean;
  /** Rougarou: round of the last Howl. */
  lastHowl?: number;
  /** Mr. Ledger: Hostile Takeover has fired. */
  takeover?: boolean;
  /** Isolde: the first Cadenza has been used. */
  cadenzaDone?: boolean;
  /** Conductor: turn of the last Fermata. */
  lastFermata?: number;
  /** The Click: Perfect Silence has been re-raised at half Heart. */
  reshield?: boolean;
}

/** Which team an actor fights for. Assist helpers are on the player's side. */
export type Side = 'player' | 'enemy';

/**
 * Anyone in a fight: the player, an enemy, a boss, or a bandmate's momentary assist helper.
 * Fields marked "player only" or "enemy only" are unset on the other side.
 */
export interface Actor {
  /** Unique within the process. Never compare ids across battles or engines. */
  id: string;
  /** Team. */
  side: Side;
  /** Content id (`player` for the player; unset for assist helpers). */
  defId: OpponentId | 'player' | undefined;
  /** Display name. */
  name: string;
  /** Level. */
  level: number;
  /** Combat stats before status modifiers (see engine effStat). */
  stats: CombatStats;
  /** Maximum Heart. */
  maxHp: number;
  /** Current Heart. */
  hp: number;
  /** Maximum Funk. */
  maxFp: number;
  /** Current Funk. */
  fp: number;
  /** Damage type of the actor's plain attacks. */
  tone: ToneId;
  /** Takes ×1.5 from this tone. */
  weak: ToneId | null;
  /** Takes ×0.5 from this tone. */
  resist: ToneId | null;
  /** Active statuses, in the order applied. */
  statuses: StatusInstance[];
  /** Scratch state for specific mechanics. */
  flags: ActorFlags;
  /** Turns this actor has started this battle. */
  turnCount: number;
  /** Brace until the next turn, if any. */
  guard: Guard | null;
  /** A charged move waiting to release next turn. */
  charged: SkillId | null;
  /** Mr. Ledger's compounding Chops bonus (fraction). */
  chopsStack: number;
  /** Extra turns per round (Rougarou's overclock). */
  extraActions: number;
  /** Added dodge chance. */
  dodgeBonus: number;
  /** Once-per-battle uses spent (skill ids, `secondWind`, `revive`). */
  onceUsed: Record<string, boolean>;
  /** Still standing. */
  alive: boolean;
  /** SOLO meter 0–100 (player only). */
  groove: number;
  /** Big Four beat 1–4 (Bass Drum only). */
  beat: number;
  /** Usable skills (player: unlocked; rivals/clones: copied). */
  skills: SkillId[];
  /** Plain-attack skill (player, rivals, clones). */
  riff: SkillId | null;
  /** SOLO skill (player only). */
  solo: SkillId | null;
  /** Instrument class (player, rivals, clones). */
  cls?: ClassId;
  /** Perfect Pitch Shield hits remaining (Isolde). */
  shield?: { hits: number } | null;
  /** The next attack becomes this tone at +20% (tone beads). Player only. */
  nextTone?: ToneId | null;

  /** Is a boss (enemy only). */
  boss?: boolean;
  /** Is an elite (enemy only). */
  elite?: boolean;
  /** Is a machine: bonus damage from Static's Scratch (enemy only). */
  machine?: boolean;
  /** Is a hologram (enemy only; flavor). */
  hologram?: boolean;
  /** Signature move (enemy only). */
  special?: SkillId | 'clone';
  /** Chance per turn to use the signature move (enemy only). */
  specialChance?: number;
  /** Difficulty damage multiplier (enemy only). */
  dmgMult?: number;
  /** Plays as this class with real skills (Cutting Contest rivals). */
  rival?: ClassId | null;
  /** A Session Clone that copies the player's class. */
  clone?: boolean;
  /** Arrived mid-battle (reduced rewards). */
  summoned?: boolean;
  /** A bandmate's momentary helper actor. */
  assist?: boolean;

  /** Width multiplier of the ONE timing zone (player only). */
  oneZone?: number;
  /** Added crit chance from gear (player only). */
  critBonus?: number;
  /** Chance to shrug off a negative status (player only). */
  statusResist?: number;
  /** Per-tone damage bonuses from gear (player only). */
  toneBonus?: Partial<Record<ToneId, number>>;
  /** Bass Drum's Big Four mechanic (player only). */
  bigFour?: boolean;
  /** Survive one lethal hit at 1 Heart (Second Wind sheet music; player only). */
  secondWind?: boolean;
  /** Carried revive item: revive once at this fraction of Heart (Gris-Gris; player only). */
  revive?: { itemId: ItemId; pct: number; line: string } | null;
  /** Healing received bonus (Sugar; player only). */
  healBonus?: number;
  /** Funk regained per turn (player only). */
  funkRegen?: number;
  /** Crit damage multiplier (player only). */
  critDmg?: number;
}

/** Where a battle happens; decides rewards, defeat handling and UI framing. */
export type BattleContext =
  'street' | 'boss' | 'tutorial' | 'quest' | 'tower' | 'bounty' | 'cutting' | 'spar';

/** Options when starting a battle. */
export interface BattleOptions {
  /** Boss fight: intro line, boss rules, no fleeing. */
  boss?: BossId | null;
  /** Framing. Default `street`. */
  context?: BattleContext;
  /** The player acts last in round 1. */
  ambush?: boolean;
  /** SPLIT is not allowed. */
  noFlee?: boolean;
  /** The Click's final phase: Perfect Silence until the player Plays the Blues. */
  clickPhase?: boolean;
}

/** Styling class of a battle log line. */
export type LogClass =
  '' | 'boss' | 'telegraph' | 'good' | 'bad' | 'heal' | 'crit' | 'you' | 'solo' | 'assist' | 'narr';

/** The final outcome of a battle. */
export type BattleResult = 'win' | 'lose' | 'fled';

/**
 * Something that happened, in order. The engine only appends; the UI animates them.
 * Events that change Heart carry `hpAfter`, so the view can step health bars event by event.
 */
export type BattleEvent =
  | { type: 'log'; text: string; cls: LogClass }
  | { type: 'round'; round: number }
  | { type: 'turn'; actor: string }
  | { type: 'status'; target: string; id: StatusId | null; add: boolean }
  | { type: 'summon'; actor: string }
  | { type: 'dodge'; target: string }
  | {
      type: 'dmg';
      target: string;
      amount: number;
      tone: ToneId;
      crit?: boolean;
      weak?: boolean;
      resisted?: boolean;
      silent?: boolean;
      hpAfter: number;
    }
  | { type: 'heal'; target: string; amount: number; hpAfter: number }
  | { type: 'revive'; target: string; hpAfter: number }
  | { type: 'shatter'; target: string }
  | { type: 'death'; target: string }
  | { type: 'assist'; bandmate: BandmateId }
  | { type: 'blues'; accuracy: number }
  | { type: 'end'; result: BattleResult };

/** A battle in progress. Created by engine `createBattle`, advanced by `runUntilPlayer`/`playerAction`. */
export interface Battle {
  /** This battle's random stream. */
  rng: Rng;
  /** The live game state (Doubloons can be stolen mid-fight; the bestiary is updated). */
  state: GameState;
  /** The player's actor. */
  player: Actor;
  /** Enemies, including summons appended mid-fight. */
  enemies: Actor[];
  /** Current round (starts at 1). */
  round: number;
  /** Actor ids in this round's turn order (extra actions appended). */
  order: string[];
  /** Index into `order` of the actor whose turn it is (-1 before a round starts). */
  idx: number;
  /** Pending events for the presentation layer. */
  events: BattleEvent[];
  /** The battle has ended. */
  over: boolean;
  /** How it ended. */
  result: BattleResult | null;
  /** Boss id for boss fights. */
  boss: BossId | null;
  /** Framing context. */
  context: BattleContext;
  /** Set by Second Line Smoke: escape after this action. */
  flee: boolean;
  /** Last skill the player used (Vox samples it). */
  lastPlayerSkill: SkillId | null;
  /** Doubloons stolen this battle, returned on a win. */
  stolen: number;
  /** The player acts last in round 1. */
  ambush: boolean;
  /** Waiting for the player's action. */
  waiting: boolean;
  /** SPLIT is not allowed. */
  noFlee: boolean;
  /** The fight was called off by the engine's turn guard: it ends as `fled`, with no winner and no penalty. */
  stalled?: boolean;
  /** The Click's final phase. */
  clickPhase: boolean;
  /** The first Play the Blues of the Click phase costs no Groove. */
  bluesFree: boolean;
  /** Enemy weaknesses discovered this battle (for the victory screen). */
  discoveries: OpponentId[];
  /** Enemies summoned so far (capped at six). */
  summonCount: number;
}

/** A player's chosen action. Targets are actor ids from the battle. */
export type PlayerIntent =
  | { type: 'riff'; targetId?: string }
  | { type: 'play'; skillId: SkillId; targetId?: string }
  | { type: 'solo'; targetId?: string }
  | { type: 'vamp' }
  | { type: 'bag'; itemId: ItemId }
  | { type: 'split' }
  | { type: 'blues'; accuracy: number };

/** The timing grade passed with an action. */
export interface TimingResult {
  /** Grade id. */
  id: TimingId;
  /** Damage multiplier. */
  mult: number;
  /** Groove bonus. */
  groove: number;
}

/** One level gained. */
export interface LevelUp {
  /** The new level. */
  level: number;
  /** Displayed stat increases. */
  gains: Record<'heart' | 'funk' | 'chops' | 'grit' | 'tempo' | 'mojo', number>;
  /** A skill unlocked at this level, if any. */
  newSkill: SkillId | null;
}

/** The On the One bar for one action. Positions are fractions of the track (0–1). */
export interface TimingSpec {
  /** How long the marker takes to cross the track. Faster against higher-level enemies. */
  durationMs: number;
  /** Center of the target zones. */
  center: number;
  /** Half-width of the ONE zone. */
  one: number;
  /** Half-width of the pocket zone. */
  pocket: number;
  /** Half-width of the loose zone. */
  loose: number;
}

/** XP, Doubloons and item drops for a won battle. */
export interface BattleRewards {
  /** XP earned. */
  xp: number;
  /** Doubloons earned, including any stolen Doubloons returned. */
  gold: number;
  /** Items dropped. */
  drops: ItemId[];
}

/** What the victory screen shows. */
export interface VictorySummary {
  /** XP (applied after the screen), Doubloons and drops (already applied). */
  rewards: BattleRewards;
  /** Bounty paid out, if this was the bounty fight. */
  bountyGold: number;
  /** Names of enemies whose weakness was discovered this fight. */
  discoveries: string[];
  /** The main-quest step this battle completed, if any (show its completeToast). */
  completedStep: StoryPosition | null;
}
