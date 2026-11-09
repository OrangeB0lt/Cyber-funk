/**
 * The crawler's toolkit: build saves at every point of a district's story, run any scene in a fresh
 * headless Session with a scripted player, and explore every branch of its choices.
 *
 * Each run gets its own Session. A scene error is collected, not thrown: a throwing `onError` would
 * leave the Director's flight set and every later run on that Session would return `busy`.
 */
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { decodeSave } from '@app/save/format';
import { ScriptedPresenter, type TranscriptEntry } from '@app/testing/scriptedPresenter';
import { scriptedRng, type PickRecord } from '@app/testing/rng';
import { setupAct } from '@app/devStates';
import { BANDMATE_IDS } from '@core/ids/band';
import { CLASS_IDS, ROOTS_IDS } from '@core/ids/characters';
import { BOSS_IDS } from '@core/ids/enemies';
import { FLAG_IDS, type StoryChoices } from '@core/ids/flags';
import { ITEM_IDS, type ItemId } from '@core/ids/items';
import { ACT_ORDER, ACT_STEPS, type ActId, type StoryPosition } from '@core/ids/story';
import { QUEST_IDS, type DistrictId, type PlaceId } from '@core/ids/world';
import type { GameState } from '@core/types';
import { BOSSES, GEAR, GLOSSARY, ITEMS, QUESTS, SECOND_LINE } from '@content/index';
import {
  addItem,
  buy,
  defaultSettings,
  newGame,
  sell,
  sellables,
  shopRow,
  storyReached,
} from '@engine/index';
import { SceneInterrupt, type RunResult, type Scene, type SheetRequest } from '@narrative/types';
import { ALLOWED_UNLINKED } from '../../../tools/completeness';

/* ------------------------------------------------------------------ */
/* States                                                               */
/* ------------------------------------------------------------------ */

/**
 * How lived-in a save is: `fresh` (no quests, broke), `started` (every quest so far just taken,
 * a little money), `busy` (everyone met, quests ready to hand in, one of everything, flush), `done` (quests done,
 * every flag, the whole band, the other boss choices).
 */
export type Profile = 'fresh' | 'started' | 'busy' | 'done';

/** A save to crawl from, with a name for failure messages. */
export interface CrawlState {
  /** E.g. `quarter.sabotage_broadcaster/busy`. */
  label: string;
  /** The save (never mutated: each run clones it). */
  game: GameState;
}

const SETTINGS = { ...defaultSettings(), rhythm: 'auto', textSpeed: 'instant' } as const;

/** The act after this one. */
function nextAct(act: ActId): ActId {
  return ACT_ORDER[Math.min(ACT_ORDER.indexOf(act) + 1, ACT_ORDER.length - 1)]!;
}

/** Choices for the bosses already beaten: one way or the other. */
function choicesFor(g: GameState, flip: boolean): StoryChoices {
  const c: StoryChoices = {};
  if (g.bossesDefeated.includes('vox_perfecta')) c.vox = flip ? 'shutdown' : 'reprogrammed';
  if (g.bossesDefeated.includes('mr_ledger')) c.contracts = flip ? 'kept' : 'burned';
  if (g.bossesDefeated.includes('rougarou')) c.lucien = flip ? 'finished' : 'spared';
  return c;
}

/**
 * A save in district `d` at story position `pos` (or, for `after`, with this district's boss beaten;
 * for `late`, at the Tower), lived in according to `profile`. `i` rotates class and roots so
 * class- and roots-specific lines get exercised across states.
 */
export function buildState(
  d: DistrictId,
  pos: StoryPosition | 'after' | 'late',
  profile: Profile,
  i: number,
): CrawlState {
  const g = newGame('Crawler', ROOTS_IDS[i % ROOTS_IDS.length]!, CLASS_IDS[i % CLASS_IDS.length]!, {
    ...SETTINGS,
  });
  const act: ActId = pos === 'after' ? nextAct(d as ActId) : pos === 'late' ? 'tower' : pos.act;
  setupAct(g, act);
  if (typeof pos === 'object') g.story = { ...pos };
  g.district = d;
  if (!g.unlocked.includes(d)) g.unlocked.push(d);
  g.districtIntros = [...g.unlocked];
  // Every quest of every district reached so far: Mama Roux's red beans are bought in the Quarter.
  const quests = QUEST_IDS.filter(q => g.unlocked.includes(QUESTS[q].district));
  if (profile === 'fresh') g.doubloons = 0;
  if (profile === 'started') {
    g.doubloons = 150;
    for (const q of quests) g.quests[q] = 'active';
  }
  if (profile === 'busy') {
    g.doubloons = 5000;
    // Everyone met (their one-time introductions are covered by fresh and started), so options
    // gated on a first meeting are offered with quests ready to hand in.
    for (const f of FLAG_IDS) if (f.startsWith('met')) g.flags[f] = true;
    for (const id of ITEM_IDS) addItem(g, id, 1);
    for (const q of quests) {
      g.quests[q] = 'active';
      const def = QUESTS[q];
      if (def.progress && def.goal) {
        if (def.item) addItem(g, def.progress as ItemId, def.goal);
        else g.counters[def.progress] = def.goal;
      }
    }
    g.choices = choicesFor(g, false);
  }
  if (profile === 'done') {
    g.doubloons = 5000;
    for (const q of quests) g.quests[q] = 'done';
    for (const f of FLAG_IDS) g.flags[f] = true;
    g.band.recruited = [...BANDMATE_IDS];
    g.band.active = BANDMATE_IDS.slice(0, 2);
    g.choices = choicesFor(g, true);
    g.bossIntros = BOSS_IDS.filter(b => BOSSES[b].district === d);
  }
  // The Tower act from the climb on, and the finale: the second line has formed (from whoever this
  // profile has on side), the climb is on the floor its step is fought at, and the finale comes
  // after the ending. The busy profile stops at the Studio Floor's vending machine.
  if (g.story.act === 'done' || storyReached(g, { act: 'tower', step: 'climb_tower' })) {
    g.secondLine = SECOND_LINE.filter(m => m.when(g)).map(m => ({ id: m.id, name: m.name }));
    const step = g.story.act === 'tower' ? g.story.step : null;
    g.towerFloor =
      step === 'face_conductor' ? 3 : step === 'break_the_click' ? 4 : profile === 'busy' ? 2 : 0;
    if (g.story.act === 'done') g.flags.ending = true;
  }
  const where = typeof pos === 'object' ? `${pos.act}.${pos.step}` : pos;
  return { label: `${d} ${where}/${profile}`, game: g };
}

/** Every save to crawl a district from: each step of its act, after its boss and late game, × every profile. */
export function districtStates(d: DistrictId): CrawlState[] {
  const act = d as ActId;
  // Nobody stands in the Tower district before the second line forms (the club forms it).
  const steps = (ACT_STEPS[act] as readonly string[]).filter(
    s => !(d === 'tower' && s === 'form_second_line'),
  );
  const positions: (StoryPosition | 'after' | 'late')[] = [
    ...steps.map(step => ({ act, step }) as StoryPosition),
    'after',
    ...(d === 'tower' ? [] : (['late'] as const)),
  ];
  const profiles: Profile[] = ['fresh', 'started', 'busy', 'done'];
  return positions.flatMap((pos, pi) =>
    profiles.map((p, qi) => buildState(d, pos, p, pi * profiles.length + qi)),
  );
}

/* ------------------------------------------------------------------ */
/* One run                                                              */
/* ------------------------------------------------------------------ */

/** How stubbed fights end. `cut` throws the street-defeat interrupt (a `lose` result counts as a win). */
export type BattleMode = 'win' | 'fled' | 'lose' | 'cut';

/** How to run a scene. */
export interface RunSpec {
  /** Which way each choice or confirm goes, by position (missing = the first option / yes). */
  script?: readonly number[];
  /** The random values, in order (the last repeats). */
  rng?: readonly number[];
  /** How fights end. */
  battle?: BattleMode;
  /** Where the player stands when it starts. */
  place?: PlaceId;
}

/** A shop the player was shown. */
export interface ShopSeen {
  /** The sheet as requested. */
  req: Extract<SheetRequest, { kind: 'shop' }>;
  /** Problems with its rows (non-finite prices). */
  problems: string[];
}

/** What happened. */
export interface RunOutcome {
  /** How the run ended. */
  result: RunResult;
  /** Errors scenes threw. */
  errors: unknown[];
  /** What the player saw. */
  transcript: TranscriptEntry[];
  /** The number of options at each choice point, in order (a confirm counts as 2). */
  widths: number[];
  /** The index taken at each choice point. */
  taken: number[];
  /** Choice keys offered and taken, as `key` strings. */
  offered: string[];
  /** Choice keys taken. */
  chosen: string[];
  /** The save before and after (plain copies). */
  before: GameState;
  /** The save after. */
  after: GameState;
  /** Every `pick` the scene made. */
  picks: PickRecord[];
  /** Shops opened. */
  shops: ShopSeen[];
  /** The save round-trips through the save format. */
  saveOk: boolean;
  /** Every story position the run saved at, in order (steps a long scene passes through). */
  savedSteps: string[];
}

const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** How often one menu may come back before the default pick becomes its last option. */
const LOOP_LIMIT = 8;
/** Most choices one run may make. */
const CHOICE_CAP = 200;

/** Run `scene` (or a place option) once from `state` in a fresh Session. */
export async function runOnce(
  state: GameState,
  what: { scene: Scene; name: string } | { place: PlaceId; key: string },
  spec: RunSpec = {},
): Promise<RunOutcome> {
  const script = spec.script ?? [];
  const widths: number[] = [];
  const taken: number[] = [];
  const offered: string[] = [];
  const chosen: string[] = [];
  const shops: ShopSeen[] = [];
  const errors: unknown[] = [];
  const picks: PickRecord[] = [];
  let point = 0;
  // A menu that comes back after each pick (the Tower's vending machine) would loop forever on the
  // default first option: once the same menu has been offered LOOP_LIMIT times, take its last option
  // (the way out), and past CHOICE_CAP choices in one run, give up with an error.
  const menus = new Map<string, number>();
  let choices = 0;
  const next = (width: number, menu?: string) => {
    if (++choices > CHOICE_CAP) throw new Error(`more than ${CHOICE_CAP} choices in one run: a choice loop`);
    const seen = menu ? (menus.get(menu) ?? 0) + 1 : 0;
    if (menu) menus.set(menu, seen);
    const i =
      seen > LOOP_LIMIT && script[point] === undefined ? width - 1 : Math.min(script[point] ?? 0, width - 1);
    widths.push(width);
    taken.push(i);
    point++;
    return i;
  };
  // The shop policy needs the session, which needs the presenter: break the cycle with a box.
  const box: { session?: Session } = {};
  const presenter = new ScriptedPresenter({
    choose: opts => {
      const i = next(opts.length, opts.map(o => o.key).join(','));
      offered.push(...opts.map(o => o.key));
      chosen.push(opts[i]!.key);
      return opts[i]!.key;
    },
    confirm: () => next(2) === 0,
    sheet: req => {
      if (req.kind !== 'shop') return;
      const g = box.session!.game;
      const problems: string[] = [];
      for (const e of req.stock) {
        if (e.when === false) continue;
        const row = shopRow(g, e, g.district);
        if (!Number.isFinite(row.price) || row.price < 0) problems.push(`${e.id} costs ${row.price}`);
        if (row.canBuy) buy(g, e.id, row.price);
      }
      if (!req.noSell) {
        const s = sellables(g)[0];
        if (s) sell(g, s.id);
      }
      shops.push({ req, problems });
    },
  });
  const mode = spec.battle ?? 'win';
  const savedSteps: string[] = [];
  const storage = memorySaveStorage();
  const write = storage.write.bind(storage);
  storage.write = raw => {
    const saved = decodeSave(raw);
    if (typeof saved !== 'string') savedSteps.push(`${saved.game.story.act}.${saved.game.story.step}`);
    return write(raw);
  };
  const session = (box.session = new Session({
    presenter,
    storage,
    seed: () => 1,
    onError: e => errors.push(e),
    battle: async (_spec, opts) => {
      if (mode === 'cut' && !opts.boss) throw new SceneInterrupt('cut');
      if (mode === 'cut') return 'lose';
      return mode;
    },
  }));
  session.store.game = plain(state);
  session.rng = scriptedRng(spec.rng ?? [0.5], picks);
  if (spec.place) session.route = { kind: 'place', id: spec.place };
  const before = plain(state);
  const result =
    'place' in what
      ? ((await session.chooseOption(what.place, what.key)) ?? { status: 'failed', error: 'no such option' })
      : await session.run(what.scene, what.name);
  const saveOk = typeof decodeSave(session.serialize()) !== 'string';
  return {
    result,
    errors,
    transcript: presenter.transcript,
    widths,
    taken,
    offered,
    chosen,
    before,
    after: plain(session.game),
    picks,
    shops,
    saveOk,
    savedSteps,
  };
}

/* ------------------------------------------------------------------ */
/* Every branch                                                         */
/* ------------------------------------------------------------------ */

/** Most choice paths tried per scene, state and random stream. */
export const PATH_CAP = 16;

/** The random streams each scene is explored under: middle, low and high (pick, chance and roll ends). */
export const RNG_STREAMS: readonly (readonly number[])[] = [[0.5], [0], [0.99]];

/**
 * Run a scene down every path through its choices (breadth first, up to PATH_CAP), under each of
 * RNG_STREAMS (a branch that only opens on a high roll still gets its choices explored), then once
 * more with fights fled.
 */
export async function explore(
  state: GameState,
  what: Parameters<typeof runOnce>[1],
  place?: PlaceId,
): Promise<{ spec: RunSpec; out: RunOutcome }[]> {
  const runs: { spec: RunSpec; out: RunOutcome }[] = [];
  for (const rng of RNG_STREAMS) {
    const queue: number[][] = [[]];
    let n = 0;
    while (queue.length && n++ < PATH_CAP) {
      const script = queue.shift()!;
      const spec: RunSpec = { script, rng, place };
      const out = await runOnce(state, what, spec);
      runs.push({ spec, out });
      for (let i = script.length; i < out.widths.length; i++)
        for (let alt = 1; alt < out.widths[i]!; alt++) queue.push([...out.taken.slice(0, i), alt]);
    }
  }
  const fled: RunSpec = { battle: 'fled', place };
  runs.push({ spec: fled, out: await runOnce(state, what, fled) });
  return runs;
}

/* ------------------------------------------------------------------ */
/* Checks                                                               */
/* ------------------------------------------------------------------ */

/** Text that means a template or lookup went wrong. */
const BROKEN = /undefined|NaN|Infinity|\[object |\$\{/;
const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

/** Problems with one piece of player-visible text. */
export function textProblem(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;
  const m = BROKEN.exec(text);
  if (m) return `broken text (${m[0]}): ${text}`;
  for (const l of text.matchAll(LINK)) {
    const key = l[1]!.trim().toLowerCase();
    if (!(key in GLOSSARY) && !ALLOWED_UNLINKED[key]) return `[[${l[1]}]] names no glossary entry: ${text}`;
  }
  return null;
}

/** Every piece of text in a transcript. */
export function transcriptText(t: readonly TranscriptEntry[]): string[] {
  return t.flatMap(e => {
    switch (e.t) {
      case 'title':
        return e.text ? [e.text] : [];
      case 'line':
        return [e.text, ...(e.who ? [e.who] : [])];
      case 'prompt':
      case 'toast':
        return [e.text];
      case 'choose':
        return e.options;
      case 'confirm':
        return [e.title];
      case 'sheet':
        return e.req.kind === 'shop' ? [e.req.title] : [];
      default:
        return [];
    }
  });
}

/** What a run problem looks like in a failure message. */
export function describeRun(where: string, spec: RunSpec): string {
  const bits = [where];
  if (spec.script?.length) bits.push(`choices=[${spec.script.join(',')}]`);
  if (spec.rng) bits.push(`rng=[${spec.rng.join(',')}]`);
  if (spec.battle && spec.battle !== 'win') bits.push(`fights=${spec.battle}`);
  return bits.join(' ');
}

/** Everything wrong with one run. */
export function runProblems(
  where: string,
  spec: RunSpec,
  out: RunOutcome,
  allow: { cut?: boolean } = {},
): string[] {
  const at = describeRun(where, spec);
  const problems: string[] = [];
  const ok = out.result.status === 'done' || (allow.cut && out.result.status === 'interrupted');
  if (!ok) problems.push(`${at}: ended ${out.result.status}`);
  for (const e of out.errors)
    problems.push(`${at}: threw ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  for (const text of transcriptText(out.transcript)) {
    const p = textProblem(text);
    if (p) problems.push(`${at}: ${p}`);
  }
  for (const s of out.shops) for (const p of s.problems) problems.push(`${at}: shop ${s.req.title}: ${p}`);
  const g = out.after;
  for (const [k, v] of Object.entries({
    doubloons: g.doubloons,
    hp: g.hp,
    fp: g.fp,
    xp: g.xp,
    level: g.level,
    day: g.day,
  }))
    if (!Number.isFinite(v)) problems.push(`${at}: ${k} is ${v}`);
  if (g.doubloons < 0) problems.push(`${at}: doubloons went negative (${g.doubloons})`);
  if (!out.saveOk) problems.push(`${at}: the save no longer loads`);
  return problems;
}

/* ------------------------------------------------------------------ */
/* What can be obtained                                                 */
/* ------------------------------------------------------------------ */

/** An item, a gear piece (instruments by tier: `inst:<tier>`) or a sheet of music. */
export type ObtainableKey = string;

/** Instruments are stocked per class, so count them by tier. */
export function obtainableKey(id: string): ObtainableKey {
  if (id in GEAR && GEAR[id as keyof typeof GEAR].slot === 'instrument')
    return `inst:${id.split('_').at(-1)}`;
  return id;
}

/** Items, gear, sheets and key items the save gained during a run. */
export function gains(before: GameState, after: GameState): Set<ObtainableKey> {
  const out = new Set<ObtainableKey>();
  for (const [id, n] of Object.entries(after.bag))
    if ((n ?? 0) > (before.bag[id as ItemId] ?? 0)) out.add(id);
  const gear = (g: GameState) => [...g.gearBag, ...Object.values(g.gear).filter((x): x is string => !!x)];
  const had = new Set(gear(before));
  for (const id of gear(after)) if (!had.has(id)) out.add(obtainableKey(id));
  for (const id of after.sheet) if (!before.sheet.includes(id)) out.add(id);
  for (const id of after.keyItems) if (!before.keyItems.includes(id)) out.add(id);
  return out;
}

/** Everything a run makes obtainable: gains, stocked shop rows, and whole random pools that produced a gain. */
export function obtainedBy(out: RunOutcome): Set<ObtainableKey> {
  const got = gains(out.before, out.after);
  for (const s of out.shops) for (const e of s.req.stock) if (e.when !== false) got.add(obtainableKey(e.id));
  for (const p of out.picks) {
    const v = p.pool[p.index];
    if (typeof v === 'string' && got.has(obtainableKey(v)))
      for (const x of p.pool)
        if (typeof x === 'string' && (x in ITEMS || x in GEAR)) got.add(obtainableKey(x));
  }
  return got;
}
