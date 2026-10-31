/**
 * Transcript oracle: ported scenes show the player exactly what v1 showed and leave the save in the
 * same state. v1 runs in jsdom with its UI functions replaced by recorders; both sides use a constant
 * random value (so every pick/chance lands the same way) and fights stubbed as wins.
 *
 * Intended deviations go in ALLOWED_DEVIATIONS with a reason. See docs/adr/0003.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { ScriptedPresenter, type TranscriptEntry } from '@app/testing/scriptedPresenter';
import type { Rng } from '@core/rng';
import type { ClassId, RootsId } from '@core/ids/characters';
import type { BossId, NoteId } from '@core/ids/enemies';
import type { FlagId } from '@core/ids/flags';
import type { ItemId } from '@core/ids/items';
import type { ActId } from '@core/ids/story';
import type { DistrictId, PlaceId, QuestId } from '@core/ids/world';
import type { GameState } from '@core/types';
import { cuttingContest, runEvent, STREET_EVENTS, wakeUpAtClub } from '@content/index';
import { defaultSettings, storyFromIndex } from '@engine/index';
import { firstDifference } from './driver';
import { loadLegacyDom } from './legacyDom';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A random stream that always returns `c`, so v1 and 2.0 make the same picks. */
function constantRng(c: number): Rng {
  const r: Rng = {
    next: () => c,
    draws: 0,
    float: (a, b) => a + c * (b - a),
    int: (a, b) => Math.floor(a + c * (b + 1 - a)),
    pick: items => items[Math.floor(c * items.length)]!,
    chance: p => c < p,
    fork: () => r,
    save: () => ({ s: 0, draws: 0 }),
  };
  return r;
}

type Entry =
  | { t: 'title'; text: string | null }
  | { t: 'line'; who: string | null; text: string }
  | { t: 'prompt'; text: string }
  | { t: 'choose'; options: string[]; picked: string }
  | { t: 'toast'; text: string }
  | { t: 'sheet'; title: string }
  | { t: 'confirm'; title: string }
  | { t: 'fight'; context: string }
  | { t: 'options'; labels: string[] };

const strip = (s: string) => s.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a, b) => b || a);

/* ------------------------------------------------------------------ */
/* v1 side                                                              */
/* ------------------------------------------------------------------ */

const dom = loadLegacyDom();
const w = dom.w;
afterAll(() => dom.close());
let legacyLog: Entry[] = [];
let legacyPick = 0;

function installRecorders() {
  const rec = (e: Entry) => legacyLog.push(e);
  const origStory = w.storyScreen;
  w.storyScreen = (title?: string) => {
    rec({ t: 'title', text: title || null });
    origStory(title);
  };
  w.line = async (who: string | null, text: string) => rec({ t: 'line', who: who || null, text });
  const choose = async (options: any[], prompt?: string) => {
    const opts = options.filter(o => o && (o.cond === undefined || o.cond));
    if (prompt) rec({ t: 'prompt', text: prompt });
    const o = opts[legacyPick % opts.length];
    rec({ t: 'choose', options: opts.map(x => strip(x.label)), picked: strip(o.label) });
    return options.indexOf(o);
  };
  w.choose = choose;
  dom.evaluate<any>('G').choose = choose;
  w.toast = (text: string) => rec({ t: 'toast', text });
  w.confirmBox = async (title: string) => {
    rec({ t: 'confirm', title });
    return true;
  };
  w.showLevelUps = async () => {};
  const sheet = (title: string) => {
    rec({ t: 'sheet', title });
    setTimeout(() => w.closeSheet(), 0);
  };
  w.openShop = (title: string) => sheet(title);
  w.openBand = () => sheet('band');
  w.openJournal = () => sheet('journal');
  w.openBountyBoard = () => sheet('bounties');
  w.runBattle = async (_enemies: unknown, opts: any) => {
    rec({ t: 'fight', context: opts?.context || 'street' });
    return 'win';
  };
}
installRecorders();

/* ------------------------------------------------------------------ */
/* Cases                                                                */
/* ------------------------------------------------------------------ */

interface CaseState {
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
}

interface Case {
  name: string;
  state: CaseState;
  /** Choice index the scripted player picks at every choice. */
  pick?: number;
  legacy: () => Promise<unknown>;
  ts: (session: Session) => Promise<unknown>;
  /** Compare only the transcript, not the save (scenes v1 split differently). */
  transcriptOnly?: boolean;
}

/** Run an option at a place, matched by its label in v1's rendered place screen. */
function placeCase(name: string, place: PlaceId, key: string, state: CaseState, pick = 0): Case {
  let label = '';
  return {
    name,
    state,
    pick,
    legacy: async () => {
      await w.enterPlace(place);
      const buttons = [...w.document.querySelectorAll('#options [data-act^="opt:"]')];
      legacyLog.push({ t: 'options', labels: buttons.map((b: any) => b.querySelector('span').textContent) });
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
let tsExtra: Entry[] = [];

const T = (step: number, more: Partial<CaseState> = {}): CaseState => ({
  story: { act: 'treme', step },
  ...more,
});
const cases: Case[] = [
  {
    name: 'prologue',
    state: T(0, { flags: [] }),
    legacy: () => w.prologue(),
    ts: s => s.startPrologue(),
  },
  {
    name: 'prologue (creole)',
    state: T(0, { roots: 'creole', flags: [] }),
    legacy: () => w.prologue(),
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
    legacy: () => w.hitTheStreets(),
    ts: s => s.hitTheStreets(),
  },
  {
    name: 'vox perfecta boss flow',
    state: { story: { act: 'quarter', step: 2 }, district: 'quarter', unlocked: ['treme', 'quarter'] },
    legacy: () => w.bossFlow('vox_perfecta'),
    ts: s => s.run(c => c.boss('vox_perfecta').then(() => {}), 'vox'),
  },
  {
    name: 'vox perfecta boss flow (shutdown)',
    pick: 1,
    state: { story: { act: 'quarter', step: 2 }, district: 'quarter', unlocked: ['treme', 'quarter'] },
    legacy: () => w.bossFlow('vox_perfecta'),
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
    legacy: () => w.cuttingContest(),
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
    legacy: () => w.cuttingContest(),
    ts: s => s.run(cuttingContest, 'cutting'),
  },
  ...(['quarter', 'bayou'] as const).map((to): Case => ({
    name: `travel to ${to}`,
    state: T(1, { unlocked: ['treme', 'quarter', 'bayou'] }),
    legacy: async () => {
      w.openTravel();
      await w.CF.UI.sh.go(to);
    },
    ts: (s: Session) => s.travel(to),
  })),
  {
    name: 'wake up at the club',
    state: T(1),
    transcriptOnly: true,
    legacy: () => w.wakeUpAtClub(),
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
      legacy: () => w.runEvent(ev.id),
      ts: (s: Session) => s.run(c => runEvent(c, ev.id), `event:${ev.id}`),
    })),
  ),
];

/* ------------------------------------------------------------------ */
/* Running a case on both sides                                         */
/* ------------------------------------------------------------------ */

const settings = {
  ...defaultSettings(),
  textSpeed: 'instant' as const,
  rhythm: 'auto' as const,
  sound: false,
};

function setupLegacy(st: CaseState) {
  w.closeSheet();
  w.closePopup();
  w.resetFlows();
  const S = w.newState('Dawlin', st.roots ?? 'yat', st.cls ?? 'trumpet', { ...settings }, 0);
  S.level = st.level ?? 3;
  S.doubloons = st.doubloons ?? 120;
  S.main = { ...st.story };
  S.district = st.district ?? 'treme';
  S.unlocked = [...(st.unlocked ?? ['treme'])];
  for (const d of S.unlocked) S.flags['intro_' + d] = true;
  for (const f of st.flags ?? ['metRoux']) S.flags[f] = true;
  Object.assign(S.quests, st.quests ?? {});
  Object.assign(S.bag, st.bag ?? {});
  S.notes = [...(st.notes ?? [])];
  for (const b of st.defeated ?? []) S.flags['boss_' + b] = true;
  for (const b of st.intros ?? []) S.flags['bosspre_' + b] = true;
  w.CF.S = S;
  return S;
}

function setupTs(session: Session, st: CaseState): GameState {
  session.newGame('Dawlin', st.roots ?? 'yat', st.cls ?? 'trumpet', { ...settings });
  const g = session.game;
  g.level = st.level ?? 3;
  g.doubloons = st.doubloons ?? 120;
  g.story = storyFromIndex(st.story.act, st.story.step);
  g.district = st.district ?? 'treme';
  g.unlocked = [...(st.unlocked ?? ['treme'])];
  g.districtIntros = [...g.unlocked];
  for (const f of st.flags ?? ['metRoux']) g.flags[f] = true;
  Object.assign(g.quests, st.quests ?? {});
  Object.assign(g.bag, st.bag ?? {});
  g.notes = [...(st.notes ?? [])];
  g.bossesDefeated = [...(st.defeated ?? [])];
  g.bossIntros = [...(st.intros ?? [])];
  return g;
}

/** v1 and 2.0 saves, projected onto the same shape. */
function legacyView(S: any) {
  const flags = Object.keys(S.flags)
    .filter(
      k =>
        S.flags[k] &&
        !/^(intro_|boss_|bosspre_)/.test(k) &&
        !['vox', 'contracts', 'lucien', 'tremeStepToast', 'pupToast'].includes(k),
    )
    .sort();
  return {
    doubloons: S.doubloons,
    bag: S.bag,
    keyItems: S.keyItems,
    gear: S.gear,
    gearBag: S.gearBag,
    notes: S.notes,
    band: S.band,
    quests: S.quests,
    story: storyFromIndex(S.main.act, S.main.step),
    flags,
    defeated: Object.keys(S.flags)
      .filter(k => k.startsWith('boss_') && S.flags[k])
      .map(k => k.slice(5))
      .sort(),
    intros: Object.keys(S.flags)
      .filter(k => k.startsWith('bosspre_'))
      .map(k => k.slice(8))
      .sort(),
    districtIntros: Object.keys(S.flags)
      .filter(k => k.startsWith('intro_'))
      .map(k => k.slice(6))
      .sort(),
    choices: { vox: S.flags.vox, contracts: S.flags.contracts, lucien: S.flags.lucien },
    nextFight: S.nextFight,
    mealBuff: S.mealBuff,
    day: S.day,
    hp: S.hp,
    fp: S.fp,
    level: S.level,
    xp: S.xp,
    district: S.district,
    unlocked: S.unlocked,
    counters: S.counters,
    perm: S.perm,
    book: Object.fromEntries(Object.entries(S.book).map(([k, v]: [string, any]) => [k, { hint: !!v.hint }])),
  };
}
function tsView(g: GameState) {
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
    day: g.day,
    hp: g.hp,
    fp: g.fp,
    level: g.level,
    xp: g.xp,
    district: g.district,
    unlocked: g.unlocked,
    counters: g.counters,
    perm: g.perm,
    book: Object.fromEntries(Object.entries(g.book).map(([k, v]) => [k, { hint: !!v?.hint }])),
  };
}

function tsTranscript(p: ScriptedPresenter): Entry[] {
  const out: Entry[] = [];
  for (const e of p.transcript as TranscriptEntry[]) {
    if (e.t === 'title') out.push({ t: 'title', text: e.text });
    else if (e.t === 'line') out.push({ t: 'line', who: e.who, text: e.text });
    else if (e.t === 'prompt') out.push({ t: 'prompt', text: e.text });
    else if (e.t === 'choose') out.push({ t: 'choose', options: e.options, picked: e.label });
    else if (e.t === 'toast') out.push({ t: 'toast', text: e.text });
    else if (e.t === 'sheet')
      out.push({ t: 'sheet', title: e.req.kind === 'shop' ? e.req.title : e.req.kind });
    else if (e.t === 'confirm') out.push({ t: 'confirm', title: e.title });
    else if (e.t === 'fight') out.push({ t: 'fight', context: e.context });
  }
  return out;
}

/**
 * Known, intended differences: [case-name prefix, reason]. Empty means every transcript matches v1.
 */
const ALLOWED_DEVIATIONS: [string, string][] = [];

describe('scene transcripts match v1', () => {
  for (const c of cases) {
    for (const rnd of [0, 0.5, 0.99]) {
      it(`${c.name} @ rng ${rnd}`, async () => {
        if (ALLOWED_DEVIATIONS.some(([p]) => c.name.startsWith(p))) return;
        // v1
        legacyLog = [];
        legacyPick = c.pick ?? 0;
        dom.setRandom(() => rnd);
        const S = setupLegacy(c.state);
        // 2.0 (run first to learn place-option labels for the legacy lookup)
        const presenter = new ScriptedPresenter({ chooseIndex: c.pick ?? 0 });
        const session = new Session({
          presenter,
          storage: memorySaveStorage(),
          seed: () => 1,
          battle: async (spec, opts) => {
            presenter.transcript.push({
              t: 'fight',
              context: opts.boss ? 'boss' : (spec.context ?? 'street'),
            });
            return 'win';
          },
          onError: e => {
            throw e;
          },
        });
        const g = setupTs(session, c.state);
        session.rng = constantRng(rnd);
        tsExtra = [];
        await c.ts(session);
        await c.legacy();
        await new Promise(r => setTimeout(r, 0));

        const mine = [...tsExtra, ...tsTranscript(presenter)];
        const d = firstDifference(legacyLog, mine);
        if (d) {
          expect.fail(
            `${c.name}: transcript differs at ${d}\n v1:  ${JSON.stringify(legacyLog.slice(0, 40))}\n 2.0: ${JSON.stringify(mine.slice(0, 40))}`,
          );
        }
        if (!c.transcriptOnly) {
          const sd = firstDifference(legacyView(S), tsView(g));
          if (sd) expect.fail(`${c.name}: save differs at ${sd}`);
        }
      });
    }
  }

  it('the v1 page logged no errors', () => {
    expect(dom.errors).toEqual([]);
  });
});
