/**
 * The shapes of every content table row. Hover a field in a data file to read its doc here.
 *
 * Tables are typed `{ [K in Id]: Def & { id: K } }` (see `Table` below): every id in core/ids has
 * exactly one row, and each row's `id` matches its key. A missing row, an extra row, or a mismatched
 * id is a compile error.
 */
import type { BandmateId, SecondLineId } from '../ids/band';
import type { ClassId, RootsId } from '../ids/characters';
import type { SkillId, StatKey, StatusId, TimingId, ToneId } from '../ids/combat';
import type { BossId, EnemyId, NoteId } from '../ids/enemies';
import type { GearId, GearSlot, InstrumentTierId, ItemId, SheetMusicId } from '../ids/items';
import type { ActId, StoryPosition } from '../ids/story';
import type { DistrictId, GlossaryId, NpcId, PlaceId, QuestId } from '../ids/world';
import type { Rng } from '../rng';
import type { Actor, Battle } from './battle';
import type { Effect, EffectOps } from './effects';
import type { GameState } from './state';

/** A complete content table: one row per id, and each row's `id` equals its key. */
export type Table<Id extends string, Def extends { id: string }> = { readonly [K in Id]: Def & { id: K } };

/** Stat bonuses keyed by stat. */
export type StatBlock = Partial<Record<StatKey, number>>;

/* ------------------------------------------------------------------ */
/* Combat basics                                                        */
/* ------------------------------------------------------------------ */

/** A musical damage type. Every enemy is weak to one and may resist one. */
export interface ToneDef {
  /** Id. */
  id: ToneId;
  /** Display name. */
  name: string;
  /** UI color. */
  color: string;
  /** One-line description for the lexicon. */
  desc: string;
}

/** A status effect. Its numbers live in `mod` or in engine mechanics keyed by id. */
export interface StatusDef {
  /** Id. */
  id: StatusId;
  /** Display name. */
  name: string;
  /** Buff or debuff. Cleanse removes `bad`; strip removes `good`. */
  kind: 'good' | 'bad';
  /** Default duration in turns. */
  turns: number;
  /** Chip color. */
  color: string;
  /** Player-facing description. Keep it in sync with the numbers. */
  desc: string;
  /** Stat multipliers while active, e.g. `{ grit: -0.4 }` = Grit −40%. */
  mod?: Partial<Record<'chops' | 'grit' | 'tempo' | 'mojo', number>>;
  /** Doesn't count down; stays until its trigger consumes it. */
  untilTriggered?: boolean;
}

/** An On the One timing grade. */
export interface TimingGradeDef {
  /** Id. */
  id: TimingId;
  /** What the player sees, e.g. "ON THE ONE!". */
  label: string;
  /** Damage multiplier for the whole action. */
  mult: number;
  /** Extra Groove after the action. */
  groove: number;
  /** Flash color. */
  color: string;
}

/** Anything castable: a skill, or an item used in battle. */
export interface Castable {
  /** Id. */
  id: string;
  /** Display name. */
  name: string;
  /** What happens, in order. */
  effects: readonly Effect[];
  /** A plain attack (no Funk cost; builds Groove). */
  riff?: boolean;
  /** A SOLO (needs 100 Groove). */
  solo?: boolean;
}

/** A skill: player skill, enemy special, boss move, or bandmate assist. */
export interface SkillDef extends Castable {
  /** Id. */
  id: SkillId;
  /** Funk cost. */
  fp: number;
  /** Level the player unlocks it at (display; unlocks follow SKILL_LEVELS). */
  level?: number;
  /** Usable once per battle. */
  once?: boolean;
  /** Display tone for non-damaging skills (e.g. SWEET heals). */
  tone?: ToneId;
  /** Player-facing description. Keep it in sync with the numbers. */
  desc: string;
}

/* ------------------------------------------------------------------ */
/* Characters                                                           */
/* ------------------------------------------------------------------ */

/** A six-number stat line in STAT_KEYS order: heart, funk, chops, grit, tempo, mojo. */
export type StatLine = readonly [number, number, number, number, number, number];

/** A playable instrument class. */
export interface ClassDef {
  /** Id. */
  id: ClassId;
  /** Display name, e.g. "Trumpet". */
  name: string;
  /** Band role nickname, e.g. "Lead Horn". */
  title: string;
  /** One-line combat role. */
  role: string;
  /** Tones the class plays (display). */
  tones: readonly ToneId[];
  /** Theme color. */
  color: string;
  /** Level-1 stats. */
  base: StatLine;
  /** Stats gained per level. */
  growth: StatLine;
  /** Plain-attack skill. */
  riff: SkillId;
  /** The six unlockable skills, in unlock order (levels in SKILL_LEVELS). */
  skills: readonly [SkillId, SkillId, SkillId, SkillId, SkillId, SkillId];
  /** SOLO skill. */
  solo: SkillId;
  /** Name of the class's legendary instrument. */
  legendary: string;
  /** Creation-screen blurb. */
  blurb: string;
  /** Uses the Big Four beat counter (Bass Drum). */
  bigFour?: boolean;
}

/** Where the character grew up. */
export interface RootsDef {
  /** Id. */
  id: RootsId;
  /** Display name. */
  name: string;
  /** Home neighborhood. */
  home: string;
  /** Permanent stat bonus. */
  bonus: StatBlock;
  /** Starting items. */
  items: Partial<Record<ItemId, number>>;
  /** Starting gear (equipped if the slot is empty). */
  gear?: readonly GearId[];
  /** Extra starting Doubloons. */
  doubloons: number;
  /** Shop discount in home districts. */
  discount?: { districts: readonly DistrictId[]; mult: number };
  /** Creation-screen summary. */
  blurb: string;
  /** Creation-screen flavor line. */
  flavor: string;
}

/* ------------------------------------------------------------------ */
/* Opponents                                                            */
/* ------------------------------------------------------------------ */

/** A non-boss enemy. */
export interface EnemyDef {
  /** Id. */
  id: EnemyId;
  /** Display name. */
  name: string;
  /** Home district (bestiary grouping). */
  district: DistrictId;
  /** Level range [min, max] when spawned without an explicit level. */
  levels: readonly [number, number];
  /** Damage type of its attacks. */
  tone: ToneId;
  /** Takes ×1.5 from this tone. */
  weak: ToneId;
  /** Takes ×0.5 from this tone. */
  resist: ToneId | null;
  /** Signature move, or `clone` for a Session Clone that copies the player's class. Rivals have none. */
  special?: SkillId | 'clone';
  /** Chance per turn to use the signature move. Default 0.3. */
  specialChance?: number;
  /** Elite: tougher, better rewards, bounty target. */
  elite?: boolean;
  /** Machine: Static's Scratch deals double. */
  machine?: boolean;
  /** Hologram (flavor). */
  hologram?: boolean;
  /** Grit multiplier. */
  gritMult?: number;
  /** Heart multiplier. */
  hpMult?: number;
  /** Extra dodge chance. */
  dodgeBonus?: number;
  /** Cutting Contest rival: fights with this class's real skills. */
  rival?: ClassId;
  /** Always appears as a pack of exactly this many, alone (String Quartet Drones). */
  pack?: number;
  /** Blue Book (bestiary) entry. */
  book: string;
}

/** What a boss does on its turn. */
export interface BossMove {
  /** Skill to use. */
  skill: SkillId;
  /** Optional warning line logged before the move. */
  telegraph?: string;
}

/** What boss AI hooks receive. */
export interface BossCtx {
  /** The battle. */
  battle: Battle;
  /** The boss actor. */
  self: Actor;
  /** Engine capabilities, acting as the boss. */
  ops: EffectOps;
  /** The battle's random stream. */
  rng: Rng;
}

/** A boss. Bosses guard Blue Notes and have scripted AI. */
export interface BossDef {
  /** Id. */
  id: BossId;
  /** Display name. */
  name: string;
  /** Fight level. */
  level: number;
  /** The district where the boss is fought. */
  district: DistrictId;
  /** Damage type of plain attacks. */
  tone: ToneId;
  /** Takes ×1.5 from this tone. */
  weak: ToneId;
  /** Takes ×0.5 from this tone. */
  resist: ToneId | null;
  /** The Blue Note recovered by beating this boss (null for the Tower bosses). */
  note: NoteId | null;
  /** Machine: Static's Scratch deals double. */
  machine?: boolean;
  /** Hologram (flavor). */
  hologram?: boolean;
  /** Heart multiplier. */
  hpMult?: number;
  /** Only Playing the Blues breaks this boss's Perfect Silence (The Click). */
  bluesTarget?: boolean;
  /** What beating the boss opens up: a district to unlock and the act that starts. */
  next?: { unlock: DistrictId | null; act: ActId };
  /** What the boss says at the start, at half Heart, and on defeat. */
  lines: { intro: string; half: string; defeat: string };
  /** Blue Book entry, including the fight's tells. */
  book: string;
  /** Choose this turn's move. Called once per boss turn. */
  ai(c: BossCtx): BossMove;
  /** Fires once when the boss drops to half Heart. */
  onHalf?(c: BossCtx): void;
  /** Fires at the start of each boss turn. */
  onTurnStart?(c: BossCtx): void;
  /** Fires after every hit the boss survives. */
  onHp?(c: BossCtx): void;
}

/** A Blue Note: one of the six notes of the blues scale the player recovers. */
export interface NoteDef {
  /** Id. */
  id: NoteId;
  /** Display name, e.g. "♭3 (E♭)". */
  name: string;
  /** Scale degree name. */
  degree: string;
  /** What the note says when recovered. */
  quote: string;
  /** Pitch in Hz for the synth. */
  freq: number;
}

/* ------------------------------------------------------------------ */
/* Items, gear, sheet music, band                                       */
/* ------------------------------------------------------------------ */

/** A consumable or key item. */
export interface ItemDef {
  /** Id. */
  id: ItemId;
  /** Display name. */
  name: string;
  /** Base price in Doubloons (before district/roots modifiers). */
  price: number;
  /** Player-facing description. */
  desc: string;
  /** Usable in battle. */
  battle: boolean;
  /** Usable from the menu outside battle. */
  field: boolean;
  /** What using it does. */
  effects?: readonly Effect[];
  /** Carry limit. */
  max?: number;
  /** Works just by being carried (shown as passive in the bag). */
  passive?: boolean;
  /** Carried: revive once per battle at this fraction of Heart, consuming the item. */
  revive?: { pct: number; line: string };
  /** Drop-only. */
  rare?: boolean;
  /** Ends the fight as an escape. Refused, keeping the item and the turn, where fleeing isn't allowed (boss and no-flee fights). */
  escape?: boolean;
  /** Story item; can't be sold or used. */
  key?: boolean;
  /** Drunk outside battle: grants this status at the start of the next fight. */
  prefight?: { status: StatusId };
}

/** An instrument quality tier (every class has one instrument per tier). */
export interface InstrumentTierDef {
  /** Id. */
  id: InstrumentTierId;
  /** Name prefix, e.g. "Street-Tuned". */
  label: string;
  /** Chops bonus. */
  chops: number;
  /** Price. */
  price: number;
  /** Minimum level to buy. */
  level: number;
  /** The class's legendary instrument (named per class). */
  legendary?: boolean;
}

/** Equipment for one of the four gear slots. */
export interface GearDef {
  /** Id. Instruments are `inst_<class>_<tier>`. */
  id: GearId;
  /** Which slot it fills. */
  slot: GearSlot;
  /** Display name. */
  name: string;
  /** Price (0 = not sold). */
  price: number;
  /** Minimum level to buy. */
  level: number;
  /** Flat stat bonuses. */
  stats: StatBlock;
  /** Player-facing description. */
  desc: string;
  /** Instruments: the class that can play it. */
  cls?: ClassId;
  /** Instruments: quality tier. */
  tier?: InstrumentTierId;
  /** Instruments: legendary. */
  legendary?: boolean;
  /** Story reward; not sold. */
  story?: boolean;
  /** Chance to shrug off negative statuses (the best charm wins; doesn't stack). */
  statusResist?: number;
  /** Extra Doubloons from fights (fraction). */
  doubloonBonus?: number;
  /** Damage bonus per tone (fraction). */
  toneBonus?: Partial<Record<ToneId, number>>;
  /** Wider ONE zone (fraction). */
  oneZone?: number;
  /** Added crit chance. */
  critBonus?: number;
}

/** Passive bonuses from a sheet music technique or an active bandmate. */
export interface PassiveMods {
  /** Wider ONE zone (fraction). */
  oneZone?: number;
  /** Added dodge chance. */
  dodgeBonus?: number;
  /** Extra Doubloons from fights (fraction). */
  doubloonBonus?: number;
  /** Funk regained per turn in battle. */
  funkRegen?: number;
  /** Healing received bonus (fraction). */
  healBonus?: number;
  /** Crit damage multiplier (replaces the default 1.75). */
  critDmg?: number;
  /** Survive one lethal hit per battle at 1 Heart. */
  secondWind?: boolean;
}

/** A sheet music technique: bought once, always on. */
export interface SheetMusicDef {
  /** Id. */
  id: SheetMusicId;
  /** Display name. */
  name: string;
  /** Price. */
  price: number;
  /** Player-facing description. */
  desc: string;
  /** What it does. */
  passive: PassiveMods;
}

/** A recruitable bandmate. */
export interface BandmateDef {
  /** Id. */
  id: BandmateId;
  /** Display name. */
  name: string;
  /** What they play. */
  inst: string;
  /** Theme color. */
  color: string;
  /** Assist move used every third round while active. */
  assist: SkillId;
  /** Passive bonus while active. */
  passive: PassiveMods;
  /** Player-facing passive description. */
  passiveDesc: string;
  /** Band-screen blurb. */
  blurb: string;
  /** Backstory line. */
  arc: string;
}

/** Someone who can join the second line on the march to the Tower. */
export interface SecondLineMemberDef {
  /** Id. */
  id: SecondLineId;
  /** Display name. */
  name: string;
  /** Joins if this holds when the second line forms. */
  when: (s: Readonly<GameState>) => boolean;
  /** What they do in the march. */
  line: string;
}

/* ------------------------------------------------------------------ */
/* World                                                                */
/* ------------------------------------------------------------------ */

/** A district of Neon Orleans. */
export interface DistrictDef {
  /** Id. */
  id: DistrictId;
  /** Display name. */
  name: string;
  /** Recommended level range [min, max]. */
  levels: readonly [number, number];
  /** Street encounter group size [min, max]. */
  groups: readonly [number, number];
  /** Enemies that spawn on the streets. */
  pool: readonly EnemyId[];
  /** The district's elite (rare street encounter, bounty target). */
  elite: EnemyId;
  /** The district's boss. */
  boss: BossId;
  /** Places, in display order. */
  places: readonly PlaceId[];
  /** First-arrival narration. */
  intro: string;
  /** Rotating flavor lines on the district screen. */
  ambient: readonly string[];
  /** Reached by airboat (flavor in travel). */
  airboat?: boolean;
  /** Doubloons for claiming the bounty on the district elite. */
  bountyGold: number;
}

/* ------------------------------------------------------------------ */
/* Rules                                                                */
/* ------------------------------------------------------------------ */

/** A quest item that can drop from specific enemies while the story is at a specific step. */
export interface QuestDropRule {
  /** The item that drops. */
  item: ItemId;
  /** Which enemies can drop it. */
  enemies: readonly EnemyId[];
  /** Only while the main quest is at this act and step. */
  at: StoryPosition;
  /** Stop dropping once the player carries this many. */
  max: number;
  /** Drop chance per qualifying enemy defeated. */
  chance: number;
}

/** Random loot from defeated non-boss enemies. */
export interface LootTable {
  /** The rare drop. */
  rare: ItemId;
  /** Chance of the rare drop per enemy. */
  rareChance: number;
  /** Otherwise, chance of a common drop. */
  commonChance: number;
  /** Common drops, equally likely. */
  common: readonly ItemId[];
}

/* ------------------------------------------------------------------ */
/* Story                                                                */
/* ------------------------------------------------------------------ */

/**
 * How a main-quest step completes on its own, checked after every won battle.
 * - `streetWins`: win street fights in a district (counter).
 * - `kills`: defeat specific enemies (counter).
 * - `item`: carry enough of an item (e.g. quest drops).
 * Steps without `progress` are advanced by scenes.
 */
export type StepProgress =
  | { kind: 'streetWins'; counter: string; goal: number; district: DistrictId }
  | { kind: 'kills'; counter: string; goal: number; enemies: readonly EnemyId[] }
  | { kind: 'item'; item: ItemId; goal: number };

/** One step of the main quest, as the journal shows it. */
export interface StepDef {
  /** What to do next. */
  journal: string;
  /** Where to do it. */
  where: string;
  /** The place that gets the "!" hint on the district screen. */
  hintPlace?: PlaceId;
  /** Automatic completion after battles. */
  progress?: StepProgress;
  /** Toast shown when `progress` completes the step. */
  completeToast?: string;
}

/** A counter that side quests bump when specific enemies are defeated while the quest is active. */
export interface QuestKillCounter {
  /** The quest that must be active. */
  quest: QuestId;
  /** Counter name in GameState.counters. */
  counter: string;
  /** Which kills count. */
  enemies: readonly EnemyId[];
}

/** Street-encounter rigging: while the story is at `at`, every random group includes one of these. */
export interface EncounterRig {
  /** Story position that turns the rig on. */
  at: StoryPosition;
  /** The first enemy is replaced with one of these unless the group already has one. */
  anyOf: readonly EnemyId[];
}

/* ------------------------------------------------------------------ */
/* World                                                                */
/* ------------------------------------------------------------------ */

/** A place inside a district. What you can do there is its scene (content/districts/<id>/places.scene.ts). */
export interface PlaceDef {
  /** Id. */
  id: PlaceId;
  /** The district it's in. */
  district: DistrictId;
  /** Display name. */
  name: string;
  /** One-line description on the district screen. */
  desc: string;
  /** The boss fought here, if any. */
  boss?: BossId;
}

/** Someone who speaks in scenes. */
export interface NpcDef {
  /** Id. */
  id: NpcId;
  /** Name shown over their lines. */
  name: string;
  /** Name color. */
  color: string;
}

/** A side quest, as the journal shows it. Its logic lives in the giver's scene. */
export interface QuestDef {
  /** Id. */
  id: QuestId;
  /** Display name. */
  name: string;
  /** Where it's given. */
  district: DistrictId;
  /** Who gives it (display). */
  giver: string;
  /** What to do. */
  desc: string;
  /** What you get (display). */
  reward: string;
  /** XP reward. */
  xp: number;
  /** Doubloon reward. */
  gold: number;
  /** Journal progress: a counter name, or an item id when `item` is set. */
  progress?: string;
  /** Journal progress goal. */
  goal?: number;
  /** `progress` names an item to count in the bag. */
  item?: boolean;
}

/** A lexicon entry. Matching words in narration link to it automatically unless `noauto`. */
export interface GlossaryDef {
  /** Id: the lowercase term text matches. */
  id: GlossaryId;
  /** Display form. */
  term: string;
  /** Pronunciation hint ('' when obvious). */
  pron: string;
  /** Definition. */
  def: string;
  /** Lexicon category. */
  cat: string;
  /** Only link when written as [[term]], never automatically. */
  noauto?: boolean;
}
