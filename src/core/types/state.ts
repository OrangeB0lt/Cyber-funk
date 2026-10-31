/**
 * GameState: everything that persists between sessions. This is the save format (version 2).
 *
 * It is hand-written so it reads as documentation; app/persistence holds the matching Zod schema
 * and a compile-time check that the two agree. Add a field here, give it a value in
 * engine/state.ts `newGame`, and add a migration if older saves need it filled in.
 */
import type { BandmateId } from '../ids/band';
import type { ClassId, RootsId } from '../ids/characters';
import type { StatKey, StatusId } from '../ids/combat';
import type { BossId, NoteId, OpponentId } from '../ids/enemies';
import type { GearId, ItemId, SheetMusicId } from '../ids/items';
import type { StoryPosition } from '../ids/story';
import type { DistrictId, GlossaryId, QuestId } from '../ids/world';
import type { FlagId, StoryChoices } from '../ids/flags';

/** Player-adjustable settings. Saved with the game; the title screen keeps its own copy. */
export interface Settings {
  /** Typewriter speed for narration. */
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant';
  /** `manual` plays the On the One timing bar; `auto` rolls the timing. */
  rhythm: 'manual' | 'auto';
  /** Enemy damage and Heart scaling. */
  difficulty: 'tourist' | 'local' | 'grand';
  /** Sound effects on. */
  sound: boolean;
  /** Fewer and shorter animations. */
  reduceMotion: boolean;
  /** Text size. */
  textSize: 'S' | 'M' | 'L';
}

/** Equipped gear. An instrument is always equipped. */
export interface EquippedGear {
  /** Instrument (class-specific). */
  instrument: GearId;
  /** Threads. */
  threads: GearId | null;
  /** Charm. */
  charm: GearId | null;
  /** Cyber mod. */
  mod: GearId | null;
}

/** A Blue Book (bestiary) entry. */
export interface BookEntry {
  /** Has been fought. */
  seen: boolean;
  /** Weakness discovered. */
  weak: boolean;
  /** Someone told you about it (shows a hint before you meet it). */
  hint?: boolean;
}

/** A sit-down meal: +Chops/+Grit for a number of fights. */
export interface MealBuff {
  /** Fights remaining. */
  fights: number;
  /** Chops multiplier bonus (fraction). */
  chops: number;
  /** Grit multiplier bonus (fraction). */
  grit: number;
}

/** A dream at the Velvet Lantern: +10% Chops/Grit, +20% Mojo for a number of fights. */
export interface DreamBuff {
  /** Fights remaining. */
  fights: number;
}

/** One-shot bonuses for the next battle (drinks, tarot, place flavor). */
export interface NextFightMods {
  /** Starting Groove. */
  groove?: number;
  /** Mojo change for the fight. */
  mojo?: number;
  /** Start Hyped. */
  hyped?: boolean;
  /** Start In the Pocket. */
  pocket?: boolean;
  /** Start with this status. */
  status?: StatusId;
}

/** A marcher in the formed second line. */
export interface SecondLineEntry {
  /** Who. */
  id: string;
  /** Display name. */
  name: string;
}

/** Side-quest progress. */
export type QuestStatus = 'active' | 'done';

/**
 * Where to pick up after a reload, when the player quit at a moment that can't simply restart
 * from the district screen. Cleared once the moment is over.
 */
export type ResumePoint =
  /** In the prologue's tutorial fights (step 1 or 2). */
  | { kind: 'tutorial'; step: 1 | 2 }
  /** In a battle that restarts when the player goes back in (shows a notice on load). */
  | {
      kind: 'battle';
      context: 'quest' | 'boss' | 'bounty' | 'cutting' | 'spar' | 'street' | 'tower' | 'tutorial';
    };

/** Everything that persists. */
export interface GameState {
  /** Player name. */
  name: string;
  /** Roots chosen at creation. */
  roots: RootsId;
  /** Instrument class. */
  cls: ClassId;
  /** Level 1–15. */
  level: number;
  /** XP toward the next level. */
  xp: number;
  /** Current Heart. */
  hp: number;
  /** Current Funk. */
  fp: number;
  /** Money. */
  doubloons: number;
  /** In-game day (rests advance it). */
  day: number;
  /** Consumables and key items with counts. */
  bag: Partial<Record<ItemId, number>>;
  /** Story items shown on the status screen. */
  keyItems: ItemId[];
  /** Equipped gear. */
  gear: EquippedGear;
  /** Owned gear, equipped or not. */
  gearBag: GearId[];
  /** Learned sheet music. */
  sheet: SheetMusicId[];
  /** Blessings bought so far (max 3). */
  blessings: number;
  /** Permanent stat bonuses (blessings, King Cake). */
  perm: Record<StatKey, number>;
  /** Bandmates. Up to two are active in battle. */
  band: { recruited: BandmateId[]; active: BandmateId[] };
  /** Blue Notes recovered. */
  notes: NoteId[];
  /** Main-quest position. */
  story: StoryPosition;
  /** Side quests. */
  quests: Partial<Record<QuestId, QuestStatus>>;
  /** Bosses beaten. */
  bossesDefeated: BossId[];
  /** Bosses whose pre-fight scene has played (going back in skips it). */
  bossIntros: BossId[];
  /** Districts whose arrival narration has played. */
  districtIntros: DistrictId[];
  /** The three big boss choices. */
  choices: StoryChoices;
  /** One-time story beats. */
  flags: Partial<Record<FlagId, true>>;
  /** Progress counters for quests and story steps. */
  counters: Partial<Record<string, number>>;
  /** Current district. */
  district: DistrictId;
  /** Districts reachable by travel. */
  unlocked: DistrictId[];
  /** Blue Book (bestiary). */
  book: Partial<Record<OpponentId, BookEntry>>;
  /** Lexicon terms seen. */
  lexicon: GlossaryId[];
  /** District whose bounty is being tracked. */
  bounty: DistrictId | null;
  /** Bounties claimed. */
  bountiesDone: DistrictId[];
  /** Active meal buff. */
  mealBuff: MealBuff | null;
  /** Active dream buff. */
  dreamBuff: DreamBuff | null;
  /** Bonuses for the next battle. */
  nextFight: NextFightMods | null;
  /** Day of the last paid Sit In at Club Feu Follet. */
  sitInDay: number;
  /** Settings. */
  settings: Settings;
  /** New Game+ cycle (0 = first playthrough). */
  ngPlus: number;
  /** The formed second line (null until it forms). */
  secondLine: SecondLineEntry[] | null;
  /** Inside Metronome Tower (the second line's stat bonus applies). */
  inTower: boolean;
  /** A moment to resume after a reload, if any. */
  resume: ResumePoint | null;
}
