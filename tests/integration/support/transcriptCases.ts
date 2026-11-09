/**
 * The scene-transcript cases: a save, a scene, and what 2.0 shows and saves when it runs.
 *
 * - Until cutover, tools/parity/transcripts.test.ts runs each case in v1 too (`legacy`) and requires
 *   the same transcript and save.
 * - tests/fixtures/transcripts.jsonl freezes what 2.0 gives (written while it matched v1), and
 *   tests/integration/transcripts.test.ts keeps it there after cutover.
 */
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { ScriptedPresenter, type TranscriptEntry } from '@app/testing/scriptedPresenter';
import { constantRng } from '@app/testing/rng';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { BossId, NoteId, OpponentId } from '@core/ids/enemies';
import type { BandmateId, SecondLineId } from '@core/ids/band';
import type { FlagId, StoryChoices } from '@core/ids/flags';
import type { ItemId, SheetMusicId } from '@core/ids/items';
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import type { DistrictId, GlossaryId, PlaceId, QuestId } from '@core/ids/world';
import type { GameState } from '@core/types';
import {
  BOSSES,
  DISTRICTS,
  SECOND_LINE,
  creditsAndNewGamePlus,
  cuttingContest,
  ending,
  towerFlow,
  runEvent,
  STREET_EVENTS,
  wakeUpAtClub,
} from '@content/index';
import { defaultSettings } from '@engine/index';
import { SceneInterrupt } from '@narrative/types';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What a case's v1 side gets: the legacy page's window and the recorder. */
export interface LegacyEnv {
  w: any;
  rec(e: Entry): void;
}

/** v1 numbered its story steps; cases do too. */
const stepAt = (act: ActId, step: number) => ({ act, step: ACT_STEPS[act][step] }) as StoryPosition;

/** One thing the player saw, in the form both sides record. */
export type Entry =
  | { t: 'title'; text: string | null }
  | { t: 'line'; who: string | null; text: string }
  | { t: 'prompt'; text: string }
  | { t: 'choose'; options: string[]; picked: string }
  | { t: 'toast'; text: string }
  | { t: 'sheet'; title: string }
  | { t: 'confirm'; title: string }
  | { t: 'fight'; context: string }
  | { t: 'options'; labels: string[] }
  | { t: 'board'; text: string }
  | { t: 'cards'; style: string; items: { title?: string; text: string; dim?: boolean }[] };

/** How a scripted fight ends: as asked, or `cut` (a street loss: wake up at the club). */
export type Fight = 'win' | 'retry' | 'lose' | 'cut';

/** Strip [[lexicon]] markup. */
export const strip = (s: string) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a, b) => b || a);

export interface CaseState {
  roots?: RootsId;
  cls?: ClassId;
  level?: number;
  doubloons?: number;
  story: { act: ActId; step: number };
  district?: DistrictId;
  unlocked?: DistrictId[];
  flags?: FlagId[];
  quests?: Partial<Record<QuestId, 'active' | 'done'>>;
  bag?: Partial<Record<ItemId, number>>;
  notes?: NoteId[];
  defeated?: BossId[];
  intros?: BossId[];
  counters?: Record<string, number>;
  day?: number;
  sitInDay?: number;
  choices?: StoryChoices;
  blessings?: number;
  recruited?: BandmateId[];
  keyItems?: ItemId[];
  sheet?: SheetMusicId[];
  /** The formed second line, by member id (null/absent: not formed). */
  secondLine?: SecondLineId[];
  ngPlus?: number;
  tower?: { floor: number; fight: number };
  inTower?: boolean;
  lexicon?: GlossaryId[];
  book?: Partial<Record<OpponentId, { seen: boolean; weak: boolean }>>;
  /** Heart (default: the new save's, at level 1). */
  hp?: number;
}

export interface Case {
  name: string;
  state: CaseState;
  /** Choice index the scripted player picks at every choice. */
  pick?: number;
  /** Choice indexes for the first choices, in order (then `pick`): for menus that come back. */
  picks?: number[];
  /** The v1 side (the parity oracle, until cutover): run the same scene in the legacy page. */
  legacy: (v1: LegacyEnv) => Promise<unknown>;
  ts: (session: Session) => Promise<unknown>;
  /** Compare only the transcript, not the save (scenes v1 split differently). */
  transcriptOnly?: boolean;
  /** How each fight ends, in order (then `win`). */
  fights?: Fight[];
  /** The answer to every confirm dialog (default yes). */
  confirm?: boolean;
}

/** Run an option at a place, matched by its label in v1's rendered place screen. */
function placeCase(name: string, place: PlaceId, key: string, state: CaseState, pick = 0): Case {
  let label = '';
  return {
    name,
    state,
    pick,
    legacy: async ({ w, rec }) => {
      await w.enterPlace(place);
      const buttons = [...w.document.querySelectorAll('#options [data-act^="opt:"]')];
      rec({ t: 'options', labels: buttons.map((b: any) => b.querySelector('span').textContent) });
      const i = buttons.findIndex((b: any) => b.querySelector('span').textContent === label);
      if (i < 0) throw new Error(`v1 has no option "${label}" at ${place}`);
      await w.CF.UI.h.opt(String(i));
    },
    ts: async session => {
      const opts = session.placeOptions(place);
      tsExtra.push({ t: 'options', labels: opts.map(o => o.label) });
      const o = opts.find(x => x.key === key);
      if (!o) throw new Error(`2.0 has no option "${key}" at ${place}`);
      label = o.label;
      await session.chooseOption(place, key);
    },
  };
}
/** Entries the 2.0 side records itself (a place's option labels), ahead of the transcript. */
let tsExtra: Entry[] = [];

const T = (step: number, more: Partial<CaseState> = {}): CaseState => ({
  story: { act: 'treme', step },
  ...more,
});

/**
 * A save in `act` at step index `step`, in that act's district, with every district so far unlocked
 * and every earlier boss beaten (their Blue Notes held), as the dev menu's act jump sets it up.
 */
function inAct(act: DistrictId, step: number, more: Partial<CaseState> = {}): CaseState {
  const upTo = ACT_ORDER.slice(0, ACT_ORDER.indexOf(act) + 1).filter((a): a is DistrictId => a in DISTRICTS);
  const earlier = upTo.slice(0, -1).map(d => DISTRICTS[d].boss);
  return {
    story: { act, step },
    district: act,
    unlocked: upTo,
    defeated: earlier,
    notes: earlier.map(b => BOSSES[b].note).filter((n): n is NoteId => !!n),
    level: Math.max(3, DISTRICTS[act].levels[0]),
    ...more,
  };
}
/** Everyone the second line can hold: Gus, the band, the three spared or freed, four quests done. */
const EVERYONE: Partial<CaseState> = {
  flags: ['metRoux', 'gusFreed'],
  recruited: ['sugar', 'static', 'remy', 'moses'],
  choices: { vox: 'reprogrammed', contracts: 'burned', lucien: 'spared' },
  quests: { lost_eye: 'done', herbs: 'done', haints: 'done', rolls: 'done' },
};

/**
 * At the Lagniappe club, ready to form the second line: every boss before the Tower beaten, the
 * Tower district not yet open (unless `more` says so).
 */
function atSecondLine(more: Partial<CaseState> = {}): CaseState {
  return inAct('tower', 0, {
    district: 'treme',
    unlocked: ['treme', 'quarter', 'storyville', 'bayou', 'cemetery', 'garden'],
    ...more,
  });
}

function secondLineCases(): Case[] {
  return [
    placeCase('second line: three marchers', 'club', 'secondline', atSecondLine()),
    placeCase(
      'second line: Gus and the band',
      'club',
      'secondline',
      atSecondLine({ flags: ['metRoux', 'gusFreed'], recruited: ['sugar', 'static', 'remy', 'moses'] }),
    ),
    placeCase('second line: everyone (the bonus caps at 25%)', 'club', 'secondline', atSecondLine(EVERYONE)),
    placeCase(
      'second line: the Tower district already seen',
      'club',
      'secondline',
      atSecondLine({ unlocked: ['treme', 'quarter', 'storyville', 'bayou', 'cemetery', 'garden', 'tower'] }),
    ),
    placeCase(
      "second line: Gus's cassette is still there",
      'club',
      'cassette',
      atSecondLine({ flags: ['metRoux', 'gusFreed', 'hasCassette'] }),
    ),
  ];
}

const THREE: SecondLineId[] = ['mamaroux', 'tijacques', 'odette'];
const ALL_MARCHERS = SECOND_LINE.map(m => m.id as SecondLineId);

/** Just after the Click falls: the Tower act's last step, the second line formed. */
function afterClick(more: Partial<CaseState> = {}): CaseState {
  return inAct('tower', 3, { secondLine: ALL_MARCHERS, ...more });
}

/** The game finished: the done act, the ending flag set, back in the city. */
function finished(more: Partial<CaseState> = {}): CaseState {
  return {
    ...inAct('tower', 0),
    story: { act: 'done', step: 0 },
    district: 'treme',
    flags: ['metRoux', 'gusFreed', 'ending'],
    secondLine: ALL_MARCHERS,
    // Things New Game+ carries over, with values a fresh save wouldn't have.
    doubloons: 1001,
    day: 37,
    blessings: 2,
    sheet: ['sm_swing'],
    bag: { gumbo: 3, cayenne: 1 },
    lexicon: ['krewe', 'second line'],
    book: { hush_patrol: { seen: false, weak: true }, nutria: { seen: true, weak: false } },
    ...more,
  };
}

function finaleCases(): Case[] {
  const combos = (['reprogrammed', 'shutdown'] as const).flatMap(vox =>
    (['burned', 'kept'] as const).flatMap(contracts =>
      (['spared', 'finished'] as const).map(lucien => ({ vox, contracts, lucien })),
    ),
  );
  return [
    // pick 1 at the credits: keep playing this city.
    ...combos.map((choices): Case => ({
      name: `ending (${choices.vox}, ${choices.contracts}, ${choices.lucien})`,
      pick: 1,
      state: afterClick({ choices }),
      legacy: ({ w }) => w.ending(),
      ts: s => s.run(ending, 'ending'),
    })),
    {
      name: 'ending with no choices on record, three marchers',
      pick: 1,
      state: afterClick({ secondLine: THREE }),
      legacy: ({ w }) => w.ending(),
      ts: s => s.run(ending, 'ending'),
    },
    {
      name: 'credits, keep playing',
      pick: 1,
      state: finished(),
      legacy: ({ w }) => w.creditsAndNewGamePlus(),
      ts: s => s.run(creditsAndNewGamePlus, 'credits'),
    },
    {
      name: 'credits at New Game+2',
      pick: 1,
      state: finished({ ngPlus: 2 }),
      legacy: ({ w }) => w.creditsAndNewGamePlus(),
      ts: s => s.run(creditsAndNewGamePlus, 'credits'),
    },
    {
      name: 'credits, New Game+, not yet',
      pick: 0,
      confirm: false,
      state: finished(),
      legacy: ({ w }) => w.creditsAndNewGamePlus(),
      ts: s => s.run(creditsAndNewGamePlus, 'credits'),
    },
    {
      // The whole New Game+ save is compared, and the prologue plays at ngPlus 1.
      name: 'credits, New Game+',
      pick: 0,
      state: finished(),
      legacy: ({ w }) => w.creditsAndNewGamePlus(),
      ts: s => s.run(creditsAndNewGamePlus, 'credits'),
    },
    {
      name: 'credits, New Game+ from New Game+1',
      pick: 0,
      state: finished({ ngPlus: 1 }),
      legacy: ({ w }) => w.creditsAndNewGamePlus(),
      ts: s => s.run(creditsAndNewGamePlus, 'credits'),
    },
    placeCase('club: march again', 'club', 'ngplus', finished(), 1),
  ];
}

/** On Tower floor `floor` (fight 0), the second line formed, every boss before the Tower beaten. */
function onFloor(floor: number, more: Partial<CaseState> = {}): CaseState {
  return inAct('tower', floor === 4 ? 3 : 1, {
    district: 'tower',
    secondLine: ALL_MARCHERS,
    tower: { floor, fight: 0 },
    ...more,
  });
}
const BEEN_IN: FlagId[] = [
  'metRoux',
  'gusFreed',
  'towerEntered',
  'towerintro_0',
  'towerintro_1',
  'towerintro_2',
];

function towerCases(): Case[] {
  const climb = (name: string, state: CaseState, more: Partial<Case> = {}): Case => ({
    name,
    state,
    legacy: ({ w }) => w.towerFlow(),
    ts: s => s.run(towerFlow, 'tower'),
    ...more,
  });
  const afterConductor = onFloor(4, { flags: BEEN_IN });
  afterConductor.defeated = [...(afterConductor.defeated ?? []), 'conductor'];
  return [
    // Vending: snacks, save, rest, then up (rest is gone from the menu); at the credits, stay.
    {
      ...placeCase('tower: the whole climb, first time in', 'towerlobby', 'march', onFloor(0)),
      picks: [0, 1, 2, 2, 1],
    },
    {
      ...climb('tower: from the Server Floors, second fight', {
        ...onFloor(1, { flags: BEEN_IN.slice(0, 5) }),
        tower: { floor: 1, fight: 1 },
      }),
      picks: [3, 1],
    },
    {
      ...placeCase(
        'tower: continue the climb at the Studio Floor, rested already',
        'towerlobby',
        'march',
        onFloor(2, { flags: [...BEEN_IN, 'towerRested'] }),
      ),
      picks: [2, 1],
    },
    climb('tower: the Booth, first time, run it back once', onFloor(3, { flags: BEEN_IN }), {
      fights: ['retry', 'win'],
      picks: [1],
    }),
    climb(
      'tower: the Booth again, walk away',
      onFloor(3, { flags: BEEN_IN, story: { act: 'tower', step: 2 }, intros: ['conductor'] }),
      { fights: ['lose'] },
    ),
    // 200 Heart: over the street maximum (175 at level 13), under the Tower's. The rally fills it to
    // the Tower maximum; walking away from the Click brings it down to the street one.
    climb(
      'tower: the Booth, then walk away from the Click (Heart comes down)',
      onFloor(3, { flags: BEEN_IN, hp: 200 }),
      { fights: ['win', 'lose'] },
    ),
    climb('tower: the Crown, run it back, then the ending', afterConductor, {
      fights: ['retry', 'win'],
      picks: [1],
    }),
    climb(
      'tower: the Crown again, walk away',
      { ...afterConductor, intros: ['the_click'] },
      { fights: ['lose'] },
    ),
    climb('tower: a loss in the Lobby wakes you at the club', onFloor(0), { fights: ['cut'] }),
    placeCase('tower lobby after the ending: look up', 'towerlobby', 'look', finished({ district: 'tower' })),
  ];
}

/** Every transcript case. */
export const cases: Case[] = [
  {
    name: 'prologue',
    state: T(0, { flags: [] }),
    legacy: ({ w }) => w.prologue(),
    ts: s => s.startPrologue(),
  },
  {
    name: 'prologue (creole)',
    state: T(0, { roots: 'creole', flags: [] }),
    legacy: ({ w }) => w.prologue(),
    ts: s => s.startPrologue(),
  },
  ...[0, 1].map(pick => placeCase(`kitchen talk at step 0`, 'kitchen', 'talk', T(0, { flags: [] }), pick)),
  ...[0, 1].map(pick => placeCase(`kitchen talk offers red beans (${pick})`, 'kitchen', 'talk', T(1), pick)),
  placeCase(
    'kitchen talk, beans active',
    'kitchen',
    'talk',
    T(1, { quests: { redbeans: 'active' }, notes: ['C', 'Eb', 'F'] }),
  ),
  placeCase('kitchen food shop', 'kitchen', 'food', T(1)),
  placeCase('kitchen meal', 'kitchen', 'meal', T(1, { doubloons: 200, roots: 'creole' })),
  placeCase('kitchen meal, broke', 'kitchen', 'meal', T(1, { doubloons: 5 })),
  placeCase(
    'kitchen meal after red beans',
    'kitchen',
    'meal',
    T(1, { doubloons: 200, quests: { redbeans: 'done' } }),
  ),
  placeCase(
    'kitchen gives red beans',
    'kitchen',
    'beans',
    T(1, { quests: { redbeans: 'active' }, bag: { redbeans: 1 } }),
  ),
  ...(['trumpet', 'saxophone'] as const).map(cls =>
    placeCase(`pawn talk with Hush hint (${cls})`, 'pawn', 'talk', T(1, { cls })),
  ),
  placeCase('pawn talk after the hint', 'pawn', 'talk', T(2, { flags: ['metRoux', 'hushHint'] })),
  placeCase('pawn gear shop', 'pawn', 'gear', T(1, { cls: 'bassdrum' })),
  placeCase('pawn accessories', 'pawn', 'accessories', T(1)),
  placeCase('pawn legendary', 'pawn', 'legend', T(1, { notes: ['C', 'Eb', 'F', 'G', 'Bb'], doubloons: 400 })),
  placeCase(
    'pawn legendary, broke',
    'pawn',
    'legend',
    T(1, { notes: ['C', 'Eb', 'F', 'G', 'Bb'], doubloons: 10 }),
  ),
  placeCase('club rest', 'club', 'rest', T(1)),
  placeCase('club band', 'club', 'band', T(1)),
  placeCase('club board', 'club', 'board', T(1)),
  placeCase('club cassette', 'club', 'cassette', T(1, { flags: ['metRoux', 'hasCassette'] })),
  placeCase('congo look', 'congo', 'look', T(1)),
  placeCase('congo boss (first time)', 'congo', 'boss', T(2, { level: 4 })),
  placeCase('congo boss (again)', 'congo', 'boss', T(2, { intros: ['captain_hush'] })),
  placeCase('congo boss (creole)', 'congo', 'boss', T(2, { roots: 'creole' })),
  placeCase('congo spar', 'congo', 'spar', T(1, { defeated: ['captain_hush'] })),
  placeCase('congo spar +2', 'congo', 'spar2', T(1, { defeated: ['captain_hush'] })),
  placeCase('congo drums', 'congo', 'drums', T(1, { defeated: ['captain_hush'] })),
  {
    name: 'hit the streets',
    state: T(1),
    legacy: ({ w }) => w.hitTheStreets(),
    ts: s => s.hitTheStreets(),
  },
  // ---- The French Quarter ----
  placeCase('feufollet talk, first time', 'feufollet', 'talk', inAct('quarter', 0)),
  placeCase('feufollet talk, first time, later step', 'feufollet', 'talk', inAct('quarter', 2)),
  placeCase('feufollet talk', 'feufollet', 'talk', inAct('quarter', 1, { flags: ['metRoux', 'metOdette'] })),
  placeCase(
    'feufollet talk after the cutting contest and Vox (reprogrammed)',
    'feufollet',
    'talk',
    inAct('storyville', 0, {
      district: 'quarter',
      flags: ['metRoux', 'metOdette', 'voxHint'],
      quests: { cutting: 'done' },
      choices: { vox: 'reprogrammed' },
    }),
  ),
  placeCase(
    'feufollet talk after Vox (shutdown)',
    'feufollet',
    'talk',
    inAct('storyville', 0, {
      district: 'quarter',
      flags: ['metRoux', 'metOdette'],
      choices: { vox: 'shutdown' },
    }),
  ),
  ...[0, 1].map(pick =>
    placeCase(
      `feufollet cutting contest (${pick})`,
      'feufollet',
      'cutting',
      inAct('quarter', 1, { flags: ['metRoux', 'metOdette'], quests: { cutting: 'active' } }),
      pick,
    ),
  ),
  placeCase(
    'feufollet sit in',
    'feufollet',
    'sitin',
    inAct('quarter', 1, { flags: ['metRoux', 'metOdette'], day: 3, sitInDay: 1 }),
  ),
  placeCase(
    'feufollet sit in, level 9',
    'feufollet',
    'sitin',
    inAct('quarter', 2, { flags: ['metRoux', 'metOdette'], level: 9 }),
  ),
  placeCase(
    'feufollet sit in, already today',
    'feufollet',
    'sitin',
    inAct('quarter', 1, { flags: ['metRoux', 'metOdette'], day: 2, sitInDay: 2 }),
  ),
  placeCase('pelican drinks', 'pelican', 'drinks', inAct('quarter', 1)),
  placeCase('pelican rumors', 'pelican', 'rumors', inAct('quarter', 1)),
  placeCase('pelican rumors, later', 'pelican', 'rumors', inAct('cemetery', 0, { district: 'quarter' })),
  placeCase('pelican rumors, all beaten', 'pelican', 'rumors', {
    ...inAct('tower', 1, { district: 'quarter' }),
    defeated: ['captain_hush', 'vox_perfecta', 'mr_ledger', 'rougarou', 'archivist', 'isolde', 'conductor'],
  }),
  placeCase('pelican bounty board', 'pelican', 'bounties', inAct('quarter', 1)),
  ...[0, 1, 2, 3].map(pick =>
    placeCase(
      `pelican crawfish races (${pick})`,
      'pelican',
      'crawfish',
      inAct('quarter', 1, { doubloons: 200 }),
      pick,
    ),
  ),
  placeCase(
    'pelican crawfish races, broke',
    'pelican',
    'crawfish',
    inAct('quarter', 1, { doubloons: 15 }),
    1,
  ),
  placeCase('market stalls', 'market', 'stalls', inAct('quarter', 1)),
  placeCase(
    'market stalls with red beans on the list',
    'market',
    'stalls',
    inAct('quarter', 1, { quests: { redbeans: 'active' } }),
  ),
  placeCase('market vendors', 'market', 'vendors', inAct('quarter', 1)),
  placeCase('jackson tarot', 'jackson', 'tarot', inAct('quarter', 1, { doubloons: 100 })),
  placeCase('jackson tarot, broke', 'jackson', 'tarot', inAct('quarter', 1, { doubloons: 20 })),
  placeCase('jackson charms', 'jackson', 'charms', inAct('quarter', 1)),
  placeCase('jackson lost eye, asked', 'jackson', 'losteye', inAct('quarter', 1)),
  placeCase(
    'jackson lost eye, found',
    'jackson',
    'losteye',
    inAct('quarter', 1, { quests: { lost_eye: 'active' } }),
  ),
  placeCase('jackson busker, asked', 'jackson', 'busker', inAct('quarter', 1)),
  placeCase(
    'jackson busker, two more',
    'jackson',
    'busker',
    inAct('quarter', 1, { quests: { horn: 'active' }, counters: { hornFights: 1 } }),
  ),
  placeCase(
    'jackson busker, horn back',
    'jackson',
    'busker',
    inAct('quarter', 2, { quests: { horn: 'active' }, counters: { hornFights: 3 } }),
  ),
  ...[0, 1, 2].map(pick =>
    placeCase(
      `jackson broadcaster (${pick})`,
      'jackson',
      'broadcaster',
      inAct('quarter', 1, { flags: ['metRoux', 'metOdette'] }),
      pick,
    ),
  ),
  placeCase('jackson look, before', 'jackson', 'look', inAct('quarter', 0)),
  placeCase(
    'jackson look, after',
    'jackson',
    'look',
    inAct('quarter', 2, { flags: ['metRoux', 'broadcasterDone'] }),
  ),
  placeCase('strip walk', 'strip', 'walk', inAct('quarter', 1)),
  ...[0, 1].map(pick => placeCase(`strip boss (${pick})`, 'strip', 'boss', inAct('quarter', 2), pick)),
  placeCase('strip boss (again)', 'strip', 'boss', inAct('quarter', 2, { intros: ['vox_perfecta'] })),
  placeCase(
    'strip listen (reprogrammed)',
    'strip',
    'listen',
    inAct('storyville', 0, { district: 'quarter', choices: { vox: 'reprogrammed' } }),
  ),
  placeCase(
    'strip listen (shutdown)',
    'strip',
    'listen',
    inAct('storyville', 0, { district: 'quarter', choices: { vox: 'shutdown' } }),
  ),
  // ---- Storyville ----
  placeCase('lantern talk, first time', 'lantern', 'talk', inAct('storyville', 0)),
  placeCase('lantern talk, first time, later step', 'lantern', 'talk', inAct('storyville', 2)),
  placeCase('lantern talk', 'lantern', 'talk', inAct('storyville', 1, { flags: ['metRoux', 'metCeleste'] })),
  ...(['burned', 'kept'] as const).map(contracts =>
    placeCase(
      `lantern talk after Ledger (${contracts})`,
      'lantern',
      'talk',
      inAct('bayou', 1, {
        district: 'storyville',
        flags: ['metRoux', 'metCeleste', 'ledgerHint'],
        choices: { contracts },
      }),
    ),
  ),
  placeCase(
    'lantern talk calls in the ball invitation',
    'lantern',
    'talk',
    inAct('garden', 0, {
      district: 'storyville',
      flags: ['metRoux', 'metCeleste'],
      choices: { contracts: 'burned' },
    }),
  ),
  placeCase(
    'lantern talk, ball, contracts kept',
    'lantern',
    'talk',
    inAct('garden', 0, {
      district: 'storyville',
      flags: ['metRoux', 'metCeleste'],
      choices: { contracts: 'kept' },
    }),
  ),
  placeCase('lantern deluxe rest', 'lantern', 'rest', inAct('storyville', 1, { doubloons: 100, day: 4 })),
  placeCase('lantern deluxe rest, broke', 'lantern', 'rest', inAct('storyville', 1, { doubloons: 50 })),
  placeCase(
    'lantern deluxe rest, free',
    'lantern',
    'rest',
    inAct('bayou', 0, { district: 'storyville', doubloons: 10, choices: { contracts: 'burned' } }),
  ),
  ...[0, 1].map(pick =>
    placeCase(
      `lantern whispers, the vault (${pick})`,
      'lantern',
      'whispers',
      inAct('storyville', 2, { doubloons: 100, bag: { ledgerpage: 3 } }),
      pick,
    ),
  ),
  placeCase(
    'lantern whispers, the vault, broke',
    'lantern',
    'whispers',
    inAct('storyville', 2, { doubloons: 30, bag: { ledgerpage: 3 } }),
  ),
  ...[0, 2, 6].map(pick =>
    placeCase(
      `lantern whispers, a boss (${pick})`,
      'lantern',
      'whispers',
      inAct('storyville', 1, { doubloons: 200 }),
      pick,
    ),
  ),
  placeCase(
    'lantern whispers, a boss, broke',
    'lantern',
    'whispers',
    inAct('storyville', 1, { doubloons: 50 }),
  ),
  placeCase('lantern whispers, nobody left', 'lantern', 'whispers', {
    ...inAct('tower', 1, { district: 'storyville', doubloons: 200 }),
    defeated: ['captain_hush', 'vox_perfecta', 'mr_ledger', 'rougarou', 'archivist', 'isolde', 'conductor'],
  }),
  placeCase('lantern theo, first time', 'lantern', 'theo', inAct('storyville', 1)),
  placeCase(
    'lantern theo, rolls being found',
    'lantern',
    'theo',
    inAct('storyville', 1, {
      flags: ['metRoux', 'metTheo'],
      quests: { rolls: 'active' },
      bag: { pianoroll: 1 },
    }),
  ),
  ...[0, 3].map(pick =>
    placeCase(
      `lantern theo, all three rolls (${pick})`,
      'lantern',
      'theo',
      inAct('storyville', 2, {
        flags: ['metRoux', 'metTheo'],
        quests: { rolls: 'active' },
        bag: { pianoroll: 3 },
        sheet: ['sm_swing'],
      }),
      pick,
    ),
  ),
  placeCase(
    'lantern theo, rolls done',
    'lantern',
    'theo',
    inAct('storyville', 3, { flags: ['metRoux', 'metTheo'], quests: { rolls: 'done' } }),
  ),
  ...[0, 1].map(pick =>
    placeCase(
      `lantern static, asked (${pick})`,
      'lantern',
      'static',
      inAct('storyville', 1, { flags: ['metRoux', 'metCeleste'] }),
      pick,
    ),
  ),
  placeCase(
    'lantern static, the walk',
    'lantern',
    'static',
    inAct('storyville', 1, { flags: ['metRoux', 'metCeleste'], quests: { static_contract: 'active' } }),
  ),
  placeCase(
    'lantern static, in the band',
    'lantern',
    'static',
    inAct('storyville', 2, {
      flags: ['metRoux', 'metCeleste'],
      quests: { static_contract: 'done' },
      recruited: ['static'],
    }),
  ),
  placeCase(
    'lantern static forges the ball invitation',
    'lantern',
    'static',
    inAct('garden', 0, {
      district: 'storyville',
      flags: ['metRoux', 'metCeleste'],
      quests: { static_contract: 'done' },
      recruited: ['static'],
    }),
  ),
  placeCase(
    'chopshop cyberware',
    'chopshop',
    'cyberware',
    inAct('storyville', 1, { level: 8, doubloons: 900 }),
  ),
  placeCase('chopshop surgeon', 'chopshop', 'surgeon', inAct('storyville', 1)),
  placeCase('counting case', 'counting', 'case', inAct('storyville', 2)),
  ...[0, 1].map(pick =>
    placeCase(`counting boss (${pick})`, 'counting', 'boss', inAct('storyville', 3), pick),
  ),
  placeCase('counting boss (again)', 'counting', 'boss', inAct('storyville', 3, { intros: ['mr_ledger'] })),
  ...(['burned', 'kept'] as const).map(contracts =>
    placeCase(
      `counting look (${contracts})`,
      'counting',
      'look',
      inAct('bayou', 1, { district: 'storyville', choices: { contracts } }),
    ),
  ),
  // ---- Manchac Swamp ----
  ...(['yat', 'cajun'] as const).map(roots =>
    placeCase(`cabin talk, first time (${roots})`, 'cabin', 'talk', inAct('bayou', 1, { roots })),
  ),
  placeCase('cabin talk, first time, later step', 'cabin', 'talk', inAct('bayou', 3)),
  ...(['yat', 'cajun'] as const).map(roots =>
    placeCase(
      `cabin talk (${roots})`,
      'cabin',
      'talk',
      inAct('bayou', 2, { roots, flags: ['metRoux', 'metClothilde'] }),
    ),
  ),
  ...(['spared', 'finished'] as const).map(lucien =>
    placeCase(
      `cabin talk after the rougarou (${lucien})`,
      'cabin',
      'talk',
      inAct('cemetery', 0, { district: 'bayou', flags: ['metRoux', 'metClothilde'], choices: { lucien } }),
    ),
  ),
  placeCase('cabin treat', 'cabin', 'treat', inAct('bayou', 2)),
  ...[0, 1].map(pick =>
    placeCase(
      `cabin treat with boudin (${pick})`,
      'cabin',
      'treat',
      inAct('bayou', 2, { bag: { boudin: 2 } }),
      pick,
    ),
  ),
  placeCase('cabin herbs, asked', 'cabin', 'herbs', inAct('bayou', 2)),
  ...[0, 1, 5].map(pick =>
    placeCase(
      `cabin herbs, all three (${pick})`,
      'cabin',
      'herbs',
      inAct('bayou', 3, { quests: { herbs: 'active' }, bag: { swampherb: 3 } }),
      pick,
    ),
  ),
  placeCase('faisdodo drinks', 'faisdodo', 'drinks', inAct('bayou', 2)),
  placeCase('faisdodo rumors', 'faisdodo', 'rumors', inAct('bayou', 2)),
  ...(['yat', 'cajun'] as const).flatMap(roots =>
    [0, 1].map(pick =>
      placeCase(
        `faisdodo remy, asked (${roots}, ${pick})`,
        'faisdodo',
        'remy',
        inAct('bayou', 2, { roots }),
        pick,
      ),
    ),
  ),
  placeCase(
    'faisdodo remy, the waves',
    'faisdodo',
    'remy',
    inAct('bayou', 2, { quests: { faisdodo: 'active' } }),
  ),
  ...(['yat', 'cajun'] as const).map(roots =>
    placeCase(
      `faisdodo remy, in the band (${roots})`,
      'faisdodo',
      'remy',
      inAct('bayou', 3, { roots, quests: { faisdodo: 'done' }, recruited: ['remy'] }),
    ),
  ),
  placeCase('faisdodo dance', 'faisdodo', 'dance', inAct('bayou', 2)),
  placeCase('boudin food', 'boudin', 'food', inAct('bayou', 2)),
  placeCase('boudin joke', 'boudin', 'joke', inAct('bayou', 2)),
  placeCase('pump fence', 'pump', 'fence', inAct('bayou', 2)),
  ...[0, 1].map(pick => placeCase(`pump boss (${pick})`, 'pump', 'boss', inAct('bayou', 3), pick)),
  placeCase('pump boss (again)', 'pump', 'boss', inAct('bayou', 3, { intros: ['rougarou'] })),
  ...(['spared', 'finished'] as const).map(lucien =>
    placeCase(
      `pump listen (${lucien})`,
      'pump',
      'listen',
      inAct('cemetery', 0, { district: 'bayou', choices: { lucien } }),
    ),
  ),
  // ---- St. Louis No. 1 ----
  placeCase('temple talk, first time', 'temple', 'talk', inAct('cemetery', 0)),
  placeCase('temple talk, first time, later step', 'temple', 'talk', inAct('cemetery', 2)),
  placeCase('temple talk', 'temple', 'talk', inAct('cemetery', 1, { flags: ['metRoux', 'metRosalie'] })),
  placeCase(
    'temple talk, Gus freed and the haints at rest',
    'temple',
    'talk',
    inAct('garden', 0, {
      district: 'cemetery',
      flags: ['metRoux', 'metRosalie', 'gusFreed'],
      quests: { haints: 'done' },
    }),
  ),
  ...[0, 2, 5].map(pick =>
    placeCase(
      `temple blessing (${pick})`,
      'temple',
      'blessing',
      inAct('cemetery', 1, { doubloons: 400 }),
      pick,
    ),
  ),
  placeCase(
    'temple blessing, the last one',
    'temple',
    'blessing',
    inAct('cemetery', 1, { doubloons: 400, blessings: 2 }),
  ),
  placeCase('temple blessing, broke', 'temple', 'blessing', inAct('cemetery', 1, { doubloons: 100 })),
  placeCase('temple altar', 'temple', 'altar', inAct('cemetery', 1)),
  ...[0, 1].map(pick =>
    placeCase(
      `temple haints, the first (${pick})`,
      'temple',
      'haints',
      inAct('cemetery', 1, { flags: ['metRoux', 'metRosalie'], quests: { haints: 'active' } }),
      pick,
    ),
  ),
  placeCase(
    'temple haints, the second',
    'temple',
    'haints',
    inAct('cemetery', 1, {
      flags: ['metRoux', 'metRosalie'],
      quests: { haints: 'active' },
      counters: { haints: 1 },
    }),
  ),
  placeCase(
    'temple haints, the third, and Moses joins',
    'temple',
    'haints',
    inAct('cemetery', 2, {
      flags: ['metRoux', 'metRosalie'],
      quests: { haints: 'active' },
      counters: { haints: 2 },
    }),
  ),
  placeCase(
    'temple haints, all three already',
    'temple',
    'haints',
    inAct('cemetery', 2, {
      flags: ['metRoux', 'metRosalie'],
      quests: { haints: 'active' },
      counters: { haints: 3 },
    }),
  ),
  placeCase('crypts walk', 'crypts', 'walk', inAct('cemetery', 1, { doubloons: 300 })),
  placeCase('crypts inscriptions', 'crypts', 'inscriptions', inAct('cemetery', 1)),
  placeCase('mausoleum door', 'mausoleum', 'door', inAct('cemetery', 1)),
  placeCase('mausoleum boss', 'mausoleum', 'boss', inAct('cemetery', 2)),
  placeCase('mausoleum boss (again)', 'mausoleum', 'boss', inAct('cemetery', 2, { intros: ['archivist'] })),
  placeCase('mausoleum listen', 'mausoleum', 'listen', inAct('garden', 0, { district: 'cemetery' })),
  // ---- The Garden District ----
  placeCase(
    'maison gear',
    'maison',
    'gear',
    inAct('garden', 1, { level: 13, doubloons: 3000, cls: 'clarinet' }),
  ),
  placeCase('maison browse', 'maison', 'browse', inAct('garden', 0)),
  placeCase('tuxedo buffs', 'tuxedo', 'buffs', inAct('garden', 0, { doubloons: 500 })),
  placeCase('tuxedo rumors', 'tuxedo', 'rumors', inAct('garden', 0)),
  ...[0, 1].map(pick =>
    placeCase(`tuxedo valet (${pick})`, 'tuxedo', 'valet', inAct('garden', 0, { doubloons: 400 }), pick),
  ),
  placeCase('tuxedo valet, broke', 'tuxedo', 'valet', inAct('garden', 0, { doubloons: 100 })),
  placeCase('tuxedo quartet', 'tuxedo', 'quartet', inAct('garden', 0)),
  placeCase('manor gate', 'manor', 'gate', inAct('garden', 0)),
  placeCase('manor gate, before the Garden', 'manor', 'gate', inAct('cemetery', 1, { district: 'garden' })),
  ...(['yat', 'creole', 'cajun'] as const).flatMap(roots =>
    [0, 1, 2, 3].map(pick =>
      placeCase(
        `manor ball (${roots}, ${pick})`,
        'manor',
        'ball',
        inAct('garden', 1, { roots, keyItems: ['invitation'] }),
        pick,
      ),
    ),
  ),
  placeCase('manor boss', 'manor', 'boss', inAct('garden', 2, { keyItems: ['invitation'] })),
  placeCase('manor boss (again)', 'manor', 'boss', inAct('garden', 2, { intros: ['isolde'] })),
  placeCase('manor grounds', 'manor', 'grounds', inAct('tower', 0, { district: 'garden' })),
  {
    name: 'vox perfecta boss flow',
    state: inAct('quarter', 2),
    legacy: ({ w }) => w.bossFlow('vox_perfecta'),
    ts: s => s.run(c => c.boss('vox_perfecta').then(() => {}), 'vox'),
  },
  {
    name: 'vox perfecta boss flow (shutdown)',
    pick: 1,
    state: inAct('quarter', 2),
    legacy: ({ w }) => w.bossFlow('vox_perfecta'),
    ts: s => s.run(c => c.boss('vox_perfecta').then(() => {}), 'vox'),
  },
  ...[0, 1].map((pick): Case => ({
    name: `cutting contest (${pick})`,
    pick,
    state: {
      story: { act: 'quarter', step: 1 },
      district: 'quarter',
      unlocked: ['treme', 'quarter'],
      quests: { cutting: 'active' },
    },
    legacy: ({ w }) => w.cuttingContest(),
    ts: (s: Session) => s.run(cuttingContest, 'cutting'),
  })),
  {
    name: 'cutting contest exhibition',
    state: {
      story: { act: 'storyville', step: 0 },
      district: 'quarter',
      unlocked: ['treme', 'quarter', 'storyville'],
      quests: { cutting: 'done' },
    },
    legacy: ({ w }) => w.cuttingContest(),
    ts: s => s.run(cuttingContest, 'cutting'),
  },
  ...(['quarter', 'bayou'] as const).map((to): Case => ({
    name: `travel to ${to}`,
    state: T(1, { unlocked: ['treme', 'quarter', 'bayou'] }),
    legacy: async ({ w }) => {
      w.openTravel();
      await w.CF.UI.sh.go(to);
    },
    ts: (s: Session) => s.travel(to),
  })),
  {
    name: 'wake up at the club',
    state: T(1),
    transcriptOnly: true,
    legacy: ({ w }) => w.wakeUpAtClub(),
    ts: s => s.run(wakeUpAtClub, 'wake'),
  },
  ...STREET_EVENTS.flatMap(ev =>
    ev.options.map((_, i): Case => ({
      name: `event ${ev.id} #${i}`,
      pick: i,
      state: T(1, {
        district: (ev.districts?.[0] ?? 'treme') as DistrictId,
        unlocked: ['treme', 'quarter', 'storyville', 'bayou', 'cemetery', 'garden', 'tower'] as DistrictId[],
        quests: { rolls: 'active', herbs: 'active' } as CaseState['quests'],
        doubloons: i === 0 ? 3 : 300,
      }),
      legacy: ({ w }) => w.runEvent(ev.id),
      ts: (s: Session) => s.run(c => runEvent(c, ev.id), `event:${ev.id}`),
    })),
  ),
  /* ---------------- The Tower act: the second line (v1 09:200, 08:171) ---------------- */
  ...secondLineCases(),

  /* ---------------- The ending, the credits, New Game+ (v1 09:271-319) ---------------- */
  ...finaleCases(),

  /* ---------------- Metronome Tower (v1 09:215-270, 08:371) ---------------- */
  ...towerCases(),
];

/** The settings every case plays with. */
export const settings = {
  ...defaultSettings(),
  textSpeed: 'instant' as const,
  rhythm: 'auto' as const,
  sound: false,
};

export function setupTs(session: Session, st: CaseState): GameState {
  session.newGame('Dawlin', st.roots ?? 'yat', st.cls ?? 'trumpet', { ...settings });
  const g = session.game;
  g.level = st.level ?? 3;
  g.doubloons = st.doubloons ?? 120;
  g.story = stepAt(st.story.act, st.story.step);
  g.district = st.district ?? 'treme';
  g.unlocked = [...(st.unlocked ?? ['treme'])];
  g.districtIntros = [...g.unlocked];
  for (const f of st.flags ?? ['metRoux']) g.flags[f] = true;
  Object.assign(g.quests, st.quests ?? {});
  Object.assign(g.bag, st.bag ?? {});
  g.notes = [...(st.notes ?? [])];
  g.bossesDefeated = [...(st.defeated ?? [])];
  g.bossIntros = [...(st.intros ?? [])];
  Object.assign(g.counters, st.counters ?? {});
  if (st.day !== undefined) g.day = st.day;
  if (st.sitInDay !== undefined) g.sitInDay = st.sitInDay;
  g.choices = { ...(st.choices ?? {}) };
  if (st.blessings !== undefined) g.blessings = st.blessings;
  g.band.recruited = [...(st.recruited ?? [])];
  g.keyItems = [...(st.keyItems ?? [])];
  g.sheet = [...(st.sheet ?? [])];
  if (st.secondLine)
    g.secondLine = st.secondLine.map(id => {
      const m = SECOND_LINE.find(x => x.id === id)!;
      return { id: m.id, name: m.name };
    });
  if (st.ngPlus) g.ngPlus = st.ngPlus;
  if (st.tower) Object.assign(g, { towerFloor: st.tower.floor, towerFight: st.tower.fight });
  if (st.inTower) g.inTower = true;
  if (st.lexicon) g.lexicon = [...st.lexicon];
  if (st.book) g.book = JSON.parse(JSON.stringify(st.book));
  if (st.hp !== undefined) g.hp = st.hp;
  return g;
}

export function tsView(g: GameState) {
  return {
    doubloons: g.doubloons,
    bag: g.bag,
    keyItems: g.keyItems,
    gear: g.gear,
    gearBag: g.gearBag,
    notes: g.notes,
    band: g.band,
    quests: g.quests,
    story: g.story,
    flags: Object.keys(g.flags).sort(),
    defeated: [...g.bossesDefeated].sort(),
    intros: [...g.bossIntros].sort(),
    districtIntros: [...g.districtIntros].sort(),
    choices: { vox: g.choices.vox, contracts: g.choices.contracts, lucien: g.choices.lucien },
    nextFight: g.nextFight,
    mealBuff: g.mealBuff,
    dreamBuff: g.dreamBuff,
    sheet: g.sheet,
    blessings: g.blessings,
    sitInDay: g.sitInDay,
    day: g.day,
    hp: g.hp,
    fp: g.fp,
    level: g.level,
    xp: g.xp,
    district: g.district,
    unlocked: g.unlocked,
    counters: g.counters,
    perm: g.perm,
    book: Object.fromEntries(
      Object.entries(g.book).map(([k, v]) => [k, { hint: !!v?.hint, seen: !!v?.seen }]),
    ),
    towerFloor: g.towerFloor,
    towerFight: g.towerFight,
    inTower: g.inTower,
    ngPlus: g.ngPlus,
    secondLine: g.secondLine ? g.secondLine.map(m => ({ id: m.id, name: m.name })) : null,
    lexicon: g.lexicon,
    settings: g.settings,
  };
}

export function tsTranscript(p: ScriptedPresenter): Entry[] {
  const out: Entry[] = [];
  let board: string | null = null;
  for (const e of p.transcript as TranscriptEntry[]) {
    if (e.t === 'board') board = e.text;
    if (e.t === 'title') out.push({ t: 'title', text: e.text });
    else if (e.t === 'line') out.push({ t: 'line', who: e.who, text: e.text });
    else if (e.t === 'prompt') out.push({ t: 'prompt', text: e.text });
    else if (e.t === 'choose') out.push({ t: 'choose', options: e.options, picked: e.label });
    else if (e.t === 'toast') out.push({ t: 'toast', text: e.text });
    else if (e.t === 'sheet')
      out.push({ t: 'sheet', title: e.req.kind === 'shop' ? e.req.title : e.req.kind });
    else if (e.t === 'confirm') out.push({ t: 'confirm', title: e.title });
    else if (e.t === 'fight') out.push({ t: 'fight', context: e.context });
    else if (e.t === 'cards') out.push({ t: 'cards', style: e.style, items: e.items });
  }
  // v1 draws the board into the page; the oracle reads its final text after the scene.
  if (board !== null) out.push({ t: 'board', text: board });
  return out;
}

/** The 2.0 side of a run: its transcript (with the option labels first) and the save it leaves. */
export interface TsRun {
  entries: Entry[];
  view: ReturnType<typeof tsView>;
}

/** Run a case's 2.0 side at a constant random value. */
export async function runTs(c: Case, rnd: number): Promise<TsRun> {
  const fights: Fight[] = [...(c.fights ?? [])];
  const picks = [...(c.picks ?? [])];
  const presenter = new ScriptedPresenter({
    choose: opts => opts[(picks.length ? picks.shift()! : (c.pick ?? 0)) % opts.length]!.key,
    confirm: () => c.confirm ?? true,
  });
  const session = new Session({
    presenter,
    storage: memorySaveStorage(),
    seed: () => 1,
    battle: async (spec, opts) => {
      presenter.transcript.push({ t: 'fight', context: opts.boss ? 'boss' : (spec.context ?? 'street') });
      const r = fights.shift() ?? 'win';
      if (r === 'cut') throw new SceneInterrupt('cut');
      return r;
    },
    onError: e => {
      throw e;
    },
  });
  setupTs(session, c.state);
  session.rng = constantRng(rnd);
  tsExtra = [];
  await c.ts(session);
  // Read the save after the run: New Game+ replaces the save object.
  return { entries: [...tsExtra, ...tsTranscript(presenter)], view: tsView(session.game) };
}
