/**
 * Transcript oracle: ported scenes show the player exactly what v1 showed and leave the save in the
 * same state. v1 runs in jsdom with its UI functions replaced by recorders; both sides use a constant
 * random value (so every pick/chance lands the same way) and scripted fights. The cases and the 2.0
 * side live in tests/integration/support/transcriptCases.ts (they outlive this file).
 *
 * Intended deviations go in ALLOWED_DEVIATIONS with a reason. See docs/adr/0003.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { storyFromIndex } from '@engine/index';
import {
  cases,
  settings,
  strip,
  runTs,
  type CaseState,
  type Entry,
  type Fight,
} from '../../tests/integration/support/transcriptCases';
import { firstDifference } from '../engine/driver';
import { loadLegacyDom } from './legacyDom';

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ------------------------------------------------------------------ */
/* v1 side                                                              */
/* ------------------------------------------------------------------ */

const dom = loadLegacyDom();
const w = dom.w;
afterAll(() => dom.close());
let legacyLog: Entry[] = [];
let legacyPick = 0;
/** Choice indexes still to pick, in order (then legacyPick). */
let legacyPicks: number[] = [];
/** The fights the v1 side still has to play this case, and its answer to confirm dialogs. */
let legacyFights: Fight[] = [];
let legacyConfirm = true;
/** The text of v1's crawfish-race <pre>, captured when the result is narrated. */
let legacyRace: string | null = null;

/** v1 card blocks already recorded (the roster, the epilogue, the credits are HTML in #story). */
const seenBlocks = new WeakSet<object>();

/** Text with each <br> as a line break. */
function brText(el: any): string {
  const c = el.cloneNode(true);
  c.querySelectorAll('br').forEach((br: any) => br.replaceWith('\n'));
  return (c.textContent ?? '').trim();
}

/**
 * Record any v1 card block that appeared since the last entry. v1 inserts them as HTML, and the next
 * storyScreen wipes them, so they're read before every recorded entry (which keeps v1's order: the
 * epilogue comes before the +500 XP toast) and once at the end of a case.
 */
function flushBlocks() {
  for (const el of w.document.querySelectorAll('#story > .roster, #story > .epilogue, #story > .credits')) {
    if (seenBlocks.has(el)) continue;
    seenBlocks.add(el);
    if (el.classList.contains('credits')) {
      const items: { title?: string; text: string; dim?: boolean }[] = [
        { title: el.querySelector('h2').textContent, text: el.querySelector(':scope > .dim').textContent },
      ];
      for (const p of el.querySelectorAll('p'))
        items.push({ text: brText(p), ...(p.classList.contains('dim') ? { dim: true } : {}) });
      legacyLog.push({ t: 'cards', style: 'credits', items });
    } else {
      const roster = el.classList.contains('roster');
      const rows = [...el.querySelectorAll(roster ? '.roster-row' : '.card')];
      legacyLog.push({
        t: 'cards',
        style: roster ? 'roster' : 'epilogue',
        items: rows.map((r: any) => ({
          title: r.querySelector('b').textContent,
          text: r.querySelector('.small').textContent,
        })),
      });
    }
  }
}

function installRecorders() {
  const rec = (e: Entry) => {
    flushBlocks();
    legacyLog.push(e);
  };
  const origStory = w.storyScreen;
  w.storyScreen = (title?: string) => {
    rec({ t: 'title', text: title || null });
    origStory(title);
  };
  w.line = async (who: string | null, text: string) => {
    // The race's <pre> is gone once v1 redraws the place, so read it when the result is narrated.
    const pre = w.document.querySelector('#story pre.race');
    if (pre) legacyRace = pre.textContent ?? '';
    rec({ t: 'line', who: who || null, text });
  };
  const choose = async (options: any[], prompt?: string) => {
    const opts = options.filter(o => o && (o.cond === undefined || o.cond));
    if (prompt) rec({ t: 'prompt', text: prompt });
    const o = opts[(legacyPicks.length ? legacyPicks.shift()! : legacyPick) % opts.length];
    rec({ t: 'choose', options: opts.map(x => strip(x.label)), picked: strip(o.label) });
    return options.indexOf(o);
  };
  w.choose = choose;
  dom.evaluate<any>('G').choose = choose;
  w.toast = (text: string) => rec({ t: 'toast', text });
  w.confirmBox = async (title: string) => {
    rec({ t: 'confirm', title });
    return legacyConfirm;
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
  const FlowAbort = dom.evaluate<any>('FlowAbort');
  w.runBattle = async (_enemies: unknown, opts: any) => {
    rec({ t: 'fight', context: opts?.context || 'street' });
    const r = legacyFights.shift() ?? 'win';
    // v1's street loss: runBattle throws, and safeFlow wakes you at the club (the runner does that).
    if (r === 'cut') throw new FlowAbort('cut');
    return r;
  };
  // No real waiting: the crawfish race sleeps between frames, the auto-rhythm bar holds its grade.
  w.sleep = async () => {};
  w.CF.UI.turbo = true;
}
installRecorders();

/** The crawfish race's track as v1 last drew it (its <pre class="race"> in the story). */
function legacyBoard(): Entry[] {
  const text = legacyRace;
  legacyRace = null;
  return text === null ? [] : [{ t: 'board', text }];
}

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
  // v1's Tower bosses keep their intros in their own flags.
  for (const b of st.intros ?? [])
    S.flags[b === 'conductor' ? 'conductorPre' : b === 'the_click' ? 'clickPre' : 'bosspre_' + b] = true;
  Object.assign(S.counters, st.counters ?? {});
  if (st.day !== undefined) S.day = st.day;
  if (st.sitInDay !== undefined) S.sitInDay = st.sitInDay;
  for (const [k, v] of Object.entries(st.choices ?? {})) S.flags[k] = v;
  if (st.blessings !== undefined) S.blessings = st.blessings;
  S.band.recruited = [...(st.recruited ?? [])];
  S.keyItems = [...(st.keyItems ?? [])];
  S.sheet = [...(st.sheet ?? [])];
  if (st.secondLine) {
    const all = dom.evaluate<any[]>('SECOND_LINE');
    S.secondLine = st.secondLine.map(id => {
      const m = all.find(x => x.id === id);
      return { id: m.id, name: m.name, line: m.line };
    });
  }
  if (st.ngPlus) S.ngPlus = st.ngPlus;
  if (st.tower) Object.assign(S, { towerFloor: st.tower.floor, towerFight: st.tower.fight });
  if (st.inTower) S.inTower = true;
  if (st.lexicon) S.lexicon = [...st.lexicon];
  if (st.book) S.book = JSON.parse(JSON.stringify(st.book));
  if (st.hp !== undefined) S.hp = st.hp;
  w.CF.S = S;
  return S;
}

/** v1 and 2.0 saves, projected onto the same shape. */
function legacyView(S: any) {
  const flags = Object.keys(S.flags)
    .filter(
      k =>
        S.flags[k] &&
        !/^(intro_|boss_|bosspre_)/.test(k) &&
        // boudinGiven: a v1 counter nothing reads (known-issues "Dead fields and flags"); not ported.
        // conductorPre/clickPre are the Tower bosses' intros (2.0: bossIntros); endingCount is a
        // number (2.0: counters).
        ![
          'vox',
          'contracts',
          'lucien',
          'tremeStepToast',
          'pupToast',
          'boudinGiven',
          'conductorPre',
          'clickPre',
          'endingCount',
        ].includes(k),
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
    intros: [
      ...Object.keys(S.flags)
        .filter(k => k.startsWith('bosspre_'))
        .map(k => k.slice(8)),
      ...(S.flags.conductorPre ? ['conductor'] : []),
      ...(S.flags.clickPre ? ['the_click'] : []),
    ].sort(),
    districtIntros: Object.keys(S.flags)
      .filter(k => k.startsWith('intro_'))
      .map(k => k.slice(6))
      .sort(),
    choices: { vox: S.flags.vox, contracts: S.flags.contracts, lucien: S.flags.lucien },
    nextFight: S.nextFight,
    mealBuff: S.mealBuff,
    dreamBuff: S.dreamBuff,
    sheet: S.sheet,
    blessings: S.blessings,
    sitInDay: S.sitInDay,
    day: S.day,
    hp: S.hp,
    fp: S.fp,
    level: S.level,
    xp: S.xp,
    district: S.district,
    unlocked: S.unlocked,
    counters: { ...S.counters, ...(S.flags.endingCount ? { endingCount: S.flags.endingCount } : {}) },
    perm: S.perm,
    book: Object.fromEntries(
      Object.entries(S.book).map(([k, v]: [string, any]) => [k, { hint: !!v.hint, seen: !!v.seen }]),
    ),
    towerFloor: S.towerFloor ?? 0,
    towerFight: S.towerFight ?? 0,
    inTower: S.inTower,
    ngPlus: S.ngPlus,
    secondLine: S.secondLine ? S.secondLine.map((m: any) => ({ id: m.id, name: m.name })) : null,
    lexicon: S.lexicon,
    settings: S.settings,
  };
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
        // v1 first (its page's state), then 2.0 (to learn place-option labels for the v1 lookup).
        legacyLog = [];
        legacyPick = c.pick ?? 0;
        legacyPicks = [...(c.picks ?? [])];
        legacyFights = [...(c.fights ?? [])];
        legacyConfirm = c.confirm ?? true;
        dom.setRandom(() => rnd);
        setupLegacy(c.state);
        const mine = await runTs(c, rnd);
        try {
          await c.legacy({ w, rec: e => legacyLog.push(e) });
        } catch (e: any) {
          // v1's safeFlow: a street loss wakes you up at the club.
          if (!e?.flowAbort) throw e;
          await w.wakeUpAtClub();
        }
        await new Promise(r => setTimeout(r, 0));
        flushBlocks();
        legacyLog.push(...legacyBoard());

        const d = firstDifference(legacyLog, mine.entries);
        if (d) {
          expect.fail(
            `${c.name}: transcript differs at ${d}\n v1:  ${JSON.stringify(legacyLog.slice(0, 40))}\n 2.0: ${JSON.stringify(mine.entries.slice(0, 40))}`,
          );
        }
        if (!c.transcriptOnly) {
          // Read v1's save after the run: New Game+ replaces the save object.
          const sd = firstDifference(legacyView(w.CF.S), mine.view);
          if (sd) expect.fail(`${c.name}: save differs at ${sd}`);
        }
      });
    }
  }

  it('the v1 page logged no errors', () => {
    expect(dom.errors).toEqual([]);
  });
});
