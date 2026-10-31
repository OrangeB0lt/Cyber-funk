/**
 * Presentation state: everything React renders that isn't the save. Serializable data only; the
 * promises that scenes wait on live in the ReactPresenter, keyed by the ids stored here.
 */
import { proxy } from 'valtio/vanilla';
import type { StatusId, TimingId, ToneId } from '@core/ids/combat';
import type { GearSlot } from '@core/ids/items';
import type { DistrictId, GlossaryId } from '@core/ids/world';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { LevelUp, LogClass, Settings, TimingGradeDef, TimingSpec } from '@core/types';
import type { LegalActions } from '@engine/index';
import type { ChoiceView, Route, ShopStock } from '@narrative/types';
import { SAVE_SLOT_IDS, type SaveSlotId } from '@core/ids/saves';
import { defaultSettings } from '@engine/index';
import type { HistoryEntry } from './save/cloud';
import type { SaveSummary } from './save/format';
import type { SlotInfo } from './save/slots';
import type { CloudMode, SlotSyncState } from './save/sync';

/** Which screen fills the middle of the app. */
export type Screen = 'title' | 'create' | 'story' | 'district' | 'place' | 'battle';

/** A line in the story transcript. */
export interface StoryLine {
  /** Id. */
  id: number;
  /** Narration, a character's line, the player's echoed choice, or a choice prompt. */
  kind: 'narr' | 'spoken' | 'you' | 'prompt';
  /** Speaker name. */
  who?: string;
  /** Speaker color. */
  color?: string;
  /** The text (may contain [[lexicon]] markup). */
  text: string;
  /** Fully revealed (typewriter finished or skipped). */
  typed: boolean;
}

/** What the action bar is waiting for in a story. */
export type Prompt =
  | { id: number; kind: 'continue'; lineId: number }
  | { id: number; kind: 'choice'; options: ChoiceView[] }
  | { id: number; kind: 'outcome'; buttons: { key: string; label: string; primary?: boolean }[] };

/** The victory or defeat card shown after a battle. */
export type Outcome =
  | {
      kind: 'victory';
      title: string;
      rows: { label: string; value: string; gold?: boolean }[];
      notes: string[];
    }
  | { kind: 'defeat'; title: string; text: string; cost?: string };

/** Modal dialogs, shown one at a time in order. */
export type Popup =
  | { id: number; kind: 'confirm'; title: string; body: string; yes: string; no: string }
  | { id: number; kind: 'levelup'; up: LevelUp }
  | { id: number; kind: 'lexicon'; term: GlossaryId }
  | { id: number; kind: 'status'; status: StatusId };

/** Bottom sheets. `awaited` sheets resolve a scene's wait when closed. */
export type SheetView = { id: number; awaited?: boolean } & (
  | { kind: 'menu' }
  | { kind: 'status' }
  | { kind: 'bag'; battle: boolean }
  | { kind: 'gear' }
  | { kind: 'slot'; slot: GearSlot }
  | { kind: 'band' }
  | { kind: 'journal' }
  | { kind: 'book' }
  | { kind: 'lexicon' }
  | { kind: 'settings'; fromTitle: boolean }
  | { kind: 'shop'; title: string; stock: ShopStock[]; noSell: boolean; tab: 'buy' | 'sell' }
  | { kind: 'travel' }
  | { kind: 'howto'; start: boolean }
  | { kind: 'dev' }
  | { kind: 'bounties' }
  | { kind: 'saves'; mode: SlotPick; raw?: string }
  | { kind: 'history'; slot: SaveSlotId }
);

/** Why the slot picker is open: load a game, start one, or import a save code into a slot. */
export type SlotPick = 'continue' | 'new' | 'import';

/** How a save slot stands with the cloud. */
export type SlotSync = SlotSyncState;

/** Cloud saves as Settings shows them. */
export interface CloudView {
  /** Connection: 'off' when this build has no server. */
  mode: CloudMode;
  /** This device has a player (it has synced at least once, or linked a code). */
  linked: boolean;
  /** The player code to show (null until linked). */
  code: string | null;
  /** Slots with changes the server hasn't seen. */
  pending: number;
}

/** A slot's checkpoints on the server (the history sheet). */
export interface HistoryView {
  /** The slot. */
  slot: SaveSlotId;
  /** Newest first; null while loading. */
  entries: HistoryEntry[] | null;
  /** Couldn't be fetched. */
  failed: boolean;
}

/** A save slot as the slot picker shows it. */
export interface SlotView {
  /** The slot. */
  slot: SaveSlotId;
  /** Who and how far (null when empty or unreadable). */
  summary: SaveSummary | null;
  /** When it was saved (ISO time). */
  savedAt: string | null;
  /** The stored save can't be loaded. */
  problem: SlotInfo['problem'];
  /** Cloud status ('local' when cloud saves are off or the device isn't linked). */
  sync: SlotSync;
}

/** A sheet to open (a SheetView without its id). */
export type SheetSpec = SheetView extends infer T ? (T extends unknown ? Omit<T, 'id'> : never) : never;

/** An actor as the battle screen shows it. Heart steps with events; the rest mirrors the battle. */
export interface ActorView {
  /** Battle actor id. */
  id: string;
  /** Content id (bestiary lookups). */
  defId: string;
  /** Name. */
  name: string;
  /** Level. */
  level: number;
  /** Heart shown (updated per event). */
  hp: number;
  /** Max Heart. */
  maxHp: number;
  /** Funk. */
  fp: number;
  /** Max Funk. */
  maxFp: number;
  /** Groove. */
  groove: number;
  /** Big Four beat. */
  beat: number;
  /** Bass Drum. */
  bigFour: boolean;
  /** Standing. */
  alive: boolean;
  /** Boss card styling. */
  boss: boolean;
  /** Elite star. */
  elite: boolean;
  /** Status chips. */
  statuses: { id: StatusId; turns: number }[];
  /** Bracing. */
  guard: boolean;
  /** Weakness (shown once known). */
  weak: ToneId | null;
  /** Resistance (shown once known). */
  resist: ToneId | null;
}

/** A number floating up from an actor. */
export interface Float {
  /** Id. */
  id: number;
  /** Actor id. */
  target: string;
  /** Text. */
  text: string;
  /** Color. */
  color: string;
  /** Bigger (crits, weaknesses). */
  big: boolean;
  /** Horizontal position (%), for variety. */
  x: number;
}

/** The battle screen. */
export interface BattleView {
  /** The player. */
  player: ActorView;
  /** Enemies, in battle order. */
  enemies: ActorView[];
  /** The visible log (last lines). */
  log: { id: number; text: string; cls: LogClass | 'round' }[];
  /** Whose turn is highlighted. */
  active: string | null;
  /** Floating numbers. */
  floats: Float[];
  /** Increments on a crit (restarts the shake animation). */
  shake: number;
  /** Increments on a shatter (restarts the flash). */
  flash: number;
  /** Waiting for the player's action. */
  legal: LegalActions | null;
}

/** The timing overlay. */
export type TimingView =
  | { id: number; kind: 'bar'; spec: TimingSpec; result: TimingGradeDef | null }
  | { id: number; kind: 'auto'; grade: TimingGradeDef }
  | { id: number; kind: 'blues'; result: string | null };

/** Everything the UI renders besides the save. */
export interface ViewState {
  /** Current screen. */
  screen: Screen;
  /** Story title. */
  title: string | null;
  /** Story transcript. */
  lines: StoryLine[];
  /** What the story is waiting for. */
  prompt: Prompt | null;
  /** Victory/defeat card. */
  outcome: Outcome | null;
  /** Dialog queue (the first is shown). */
  popups: Popup[];
  /** Open sheet. */
  sheet: SheetView | null;
  /** The latest toast. */
  toast: { id: number; text: string } | null;
  /** Battle screen state. */
  battle: BattleView | null;
  /** Timing overlay. */
  timing: TimingView | null;
  /** Where the player is between scenes. */
  route: Route;
  /** A scene is running. */
  busy: boolean;
  /** Settings edited on the title screen before a game exists. */
  titleSettings: Settings;
  /** Ambient line index per district. */
  ambient: Partial<Record<DistrictId, number>>;
  /** The last graded tap (drives the tap sound). */
  lastGrade: TimingId | null;
  /** Character creation in progress. */
  create: { step: 1 | 2 | 3; name: string; roots: RootsId; cls: ClassId };
  /** The device's save slots, in order. */
  saves: SlotView[];
  /** Cloud saves. */
  cloud: CloudView;
  /** The open history sheet's data. */
  history: HistoryView | null;
}

/** A fresh view. */
export function createView(): ViewState {
  return proxy<ViewState>({
    screen: 'title',
    title: null,
    lines: [],
    prompt: null,
    outcome: null,
    popups: [],
    sheet: null,
    toast: null,
    battle: null,
    timing: null,
    route: { kind: 'district' },
    busy: false,
    titleSettings: defaultSettings(),
    ambient: {},
    lastGrade: null,
    create: { step: 1, name: '', roots: 'creole', cls: 'trumpet' },
    saves: SAVE_SLOT_IDS.map(slot => ({ slot, summary: null, savedAt: null, problem: null, sync: 'local' })),
    cloud: { mode: 'off', linked: false, code: null, pending: 0 },
    history: null,
  });
}
