/**
 * The crawler: for every district, build saves at every step of its story, in four states of play,
 * and press every option at every place down every branch of its
 * choices. Then check, across the whole crawl, that every quest can be finished, every story step
 * reached, every choice taken and every item obtained.
 *
 * This is the test the empty French Quarter would have failed first: "every place offers something".
 * Nothing here needs editing for new content: a new place, option or quest is crawled automatically.
 *
 * Fights are stubbed (the engine's own tests cover combat); scenes, saves and text are real.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_IDS, ROOTS_IDS } from '@core/ids/characters';
import {
  CHARM_IDS,
  INSTRUMENT_TIER_IDS,
  ITEM_IDS,
  MOD_IDS,
  SHEET_MUSIC_IDS,
  THREADS_IDS,
} from '@core/ids/items';
import { ACT_ORDER, ACT_STEPS } from '@core/ids/story';
import { DISTRICT_IDS, PLACE_IDS, QUEST_IDS, type DistrictId } from '@core/ids/world';
import type { StepDef } from '@core/types';
import {
  ACTS,
  DISTRICTS,
  LOOT,
  PLACE_SCENES,
  PLACES,
  QUEST_DROPS,
  STREET_EVENTS,
  hitTheStreets,
  prologue,
  runEvent,
  trackBounty,
  travel,
} from '@content/index';
import { SHOPKEEPERS } from '@content/sprites';
import { newGame, priceFor, storyIs, storyReached } from '@engine/index';
import type { PlaceHelpers } from '@narrative/define';
import type { GameState } from '@core/types';
import {
  buildState,
  districtStates,
  explore,
  obtainableKey,
  obtainedBy,
  runOnce,
  runProblems,
  textProblem,
  type ObtainableKey,
  type RunOutcome,
  type RunSpec,
} from './support/crawl';

const PORTED = DISTRICT_IDS;

/* ------------------------------------------------------------------ */
/* What the whole crawl saw (read by the coverage checks at the end)    */
/* ------------------------------------------------------------------ */

const seen = {
  questsDone: new Set<string>(),
  steps: new Set<string>(),
  offered: new Set<string>(),
  chosen: new Set<string>(),
  optionKeys: new Set<string>(),
  obtainable: new Set<ObtainableKey>(),
  shopsWithoutKeeper: new Set<string>(),
  keepers: new Set<string>(),
};

/**
 * Record what one run did. `scope` names the scene, so choice keys are compared per scene; runs that
 * don't explore their choices pass `choices: false`.
 */
function record(scope: string, out: RunOutcome, choices = true): void {
  for (const q of QUEST_IDS)
    if (out.before.quests[q] !== 'done' && out.after.quests[q] === 'done') seen.questsDone.add(q);
  // Every step the run ended on or saved at (a long scene, like the Tower, passes through several).
  const from = `${out.before.story.act}.${out.before.story.step}`;
  for (const s of [...out.savedSteps, `${out.after.story.act}.${out.after.story.step}`])
    if (s !== from) seen.steps.add(s);
  if (choices) for (const k of out.offered) seen.offered.add(`${scope}|${k}`);
  for (const k of out.chosen) seen.chosen.add(`${scope}|${k}`);
  for (const x of obtainedBy(out)) seen.obtainable.add(x);
  for (const s of out.shops) {
    if (!s.req.keeper) seen.shopsWithoutKeeper.add(s.req.title);
    else seen.keepers.add(s.req.keeper);
  }
}

/** Run every branch of a scene and collect problems. */
async function crawl(
  problems: string[],
  state: { label: string; game: GameState },
  what: Parameters<typeof runOnce>[1],
  scope: string,
  place?: Parameters<typeof explore>[2],
): Promise<void> {
  for (const { spec, out } of await explore(state.game, what, place)) {
    problems.push(...runProblems(`${state.label} ${scope}`, spec, out));
    record(scope, out);
  }
}

/** The read-only helpers a place's options see (as Session.placeHelpers builds them). */
function helpers(g: GameState): PlaceHelpers {
  return {
    price: (base, district) => priceFor(g, base, district ?? g.district),
    is: p => storyIs(g, p),
    reached: p => storyReached(g, p),
  };
}

/* ------------------------------------------------------------------ */
/* Per district                                                         */
/* ------------------------------------------------------------------ */

describe.each(PORTED)('%s', d => {
  const states = districtStates(d);

  it('every place offers something to do, in every state', () => {
    const problems: string[] = [];
    for (const st of states)
      for (const p of DISTRICTS[d].places) {
        const scenes = PLACE_SCENES[p];
        const opts = scenes?.options(st.game, helpers(st.game)) ?? [];
        if (!opts.length) problems.push(`${st.label}: ${p} (${PLACES[p].name}) has nothing to do`);
        const keys = opts.map(o => o.key);
        if (new Set(keys).size !== keys.length)
          problems.push(`${st.label}: ${p} repeats an option key: ${keys}`);
        const intro = scenes?.intro?.(st.game, helpers(st.game));
        for (const t of [PLACES[p].desc, intro?.text, ...opts.flatMap(o => [o.label, o.sub])]) {
          const tp = textProblem(t);
          if (tp) problems.push(`${st.label}: ${p}: ${tp}`);
        }
      }
    expect(problems).toEqual([]);
  });

  it('every option runs cleanly down every branch, in every state', async () => {
    const problems: string[] = [];
    for (const st of states)
      for (const p of DISTRICTS[d].places)
        for (const o of PLACE_SCENES[p]?.options(st.game, helpers(st.game)) ?? []) {
          seen.optionKeys.add(`${d}|${o.key}`);
          await crawl(problems, st, { place: p, key: o.key }, `${p}:${o.key}`, p);
        }
    expect(problems).toEqual([]);
  });

  it('arriving, hitting the streets, the bounty and a street defeat all run cleanly', async () => {
    const problems: string[] = [];
    const check = async (label: string, what: Parameters<typeof runOnce>[1], g: GameState, spec: RunSpec) => {
      const out = await runOnce(g, what, spec);
      problems.push(...runProblems(label, spec, out, { cut: spec.battle === 'cut' }));
      record(label, out, false);
      return out;
    };
    const first = buildState(d, { act: d, step: ACT_STEPS[d][0] } as never, 'busy', 0).game;

    // Arriving for the first time: the district's intro, then its arrival scene.
    const away: GameState = { ...structuredClone(first), district: d === 'treme' ? 'quarter' : 'treme' };
    away.unlocked = [...new Set([...away.unlocked, 'treme', 'quarter'] as DistrictId[])];
    away.districtIntros = away.unlocked.filter(x => x !== d);
    const arrived = await check(`${d} travel`, { scene: travel(d), name: 'travel' }, away, {});
    if (arrived.after.district !== d) problems.push(`${d} travel: ended in ${arrived.after.district}`);
    if (!arrived.after.districtIntros.includes(d)) problems.push(`${d} travel: the intro never played`);

    // Hit the Streets: a fight, an event, Doubloons found, an item found, the elite, the Praline Lady.
    for (const rng of [[0.1], [0.7], [0.85, 0.1, 0.5], [0.85, 0.9, 0.5], [0.97, 0.1], [0.97, 0.9, 0.5]])
      await check(`${d} streets`, { scene: hitTheStreets, name: 'streets' }, first, { rng });
    await check(`${d} bounty`, { scene: trackBounty, name: 'bounty' }, first, {});

    // Losing a street fight: back to the club in Tremé, where Mama Roux patches you up.
    const cut = await check(`${d} defeat`, { scene: hitTheStreets, name: 'streets' }, first, {
      rng: [0.1],
      battle: 'cut',
    });
    if (cut.result.status !== 'interrupted')
      problems.push(`${d} defeat: ended ${cut.result.status}, not interrupted`);
    if (cut.after.district !== 'treme') problems.push(`${d} defeat: woke up in ${cut.after.district}`);
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Story and street events (already ported everywhere)                  */
/* ------------------------------------------------------------------ */

describe('story', () => {
  it('the prologue runs cleanly down every branch, for every class and roots', async () => {
    const problems: string[] = [];
    for (const [i, cls] of CLASS_IDS.entries()) {
      const g = newGame('Crawler', ROOTS_IDS[i % ROOTS_IDS.length]!, cls, {
        ...newGame('x', 'yat', 'trumpet').settings,
        rhythm: 'auto',
        textSpeed: 'instant',
      });
      await crawl(
        problems,
        { label: `new ${cls}`, game: g },
        { scene: prologue, name: 'prologue' },
        'prologue',
      );
    }
    expect(problems).toEqual([]);
  });
});

describe('street events', () => {
  it('every street event runs cleanly down every branch, broke, mid-quest and flush', async () => {
    const problems: string[] = [];
    for (const ev of STREET_EVENTS) {
      const d = ev.districts?.[0] ?? 'treme';
      for (const profile of ['fresh', 'started', 'busy'] as const) {
        const st = buildState(d, { act: d, step: ACT_STEPS[d as 'treme'][0] } as never, profile, 1);
        await crawl(
          problems,
          st,
          { scene: s => runEvent(s, ev.id), name: `event:${ev.id}` },
          `event:${ev.id}`,
        );
      }
    }
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Coverage across the whole crawl                                      */
/* ------------------------------------------------------------------ */

/** Never obtainable, on purpose. */
const NEVER: Partial<Record<ObtainableKey, string>> = {};

describe('coverage', () => {
  it('every quest can be finished', () => {
    const missing = QUEST_IDS.filter(q => !seen.questsDone.has(q));
    expect(missing).toEqual([]);
  });

  it('every story step can be reached', () => {
    const missing: string[] = [];
    for (const act of ACT_ORDER) {
      const steps = ACT_STEPS[act] as readonly string[];
      for (const [i, step] of steps.entries()) {
        const prev = i > 0 ? (ACTS[act] as Record<string, StepDef>)[steps[i - 1]!] : undefined;
        const start = act === 'treme' && i === 0; // where every new game begins
        // A step after one with a progress goal is reached automatically after battles (engine tests).
        if (!start && !prev?.progress && !seen.steps.has(`${act}.${step}`)) missing.push(`${act}.${step}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every choice offered is taken somewhere', () => {
    expect([...seen.offered].filter(k => !seen.chosen.has(k))).toEqual([]);
  });

  it("every option written in a district's scenes is offered in some state", () => {
    const missing: string[] = [];
    for (const d of PORTED) {
      const dir = path.resolve('src/content/districts', d);
      for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.scene.ts'))) {
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        for (const m of src.matchAll(/\bkey: '([a-z0-9_]+)'/g))
          if (!seen.optionKeys.has(`${d}|${m[1]}`)) missing.push(`${d}/${f}: option ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('every shop has a keeper, and every shopkeeper runs a shop', () => {
    expect([...seen.shopsWithoutKeeper]).toEqual([]);
    const idle = Object.entries(SHOPKEEPERS)
      .map(([id]) => id)
      .filter(id => !seen.keepers.has(id));
    expect(idle).toEqual([]);
  });

  it('every item, gear piece, instrument tier and sheet of music can be obtained', () => {
    const all: ObtainableKey[] = [
      ...ITEM_IDS,
      ...THREADS_IDS,
      ...CHARM_IDS,
      ...MOD_IDS,
      ...INSTRUMENT_TIER_IDS.map(t => `inst:${t}`),
      ...SHEET_MUSIC_IDS,
    ];
    const got = new Set(seen.obtainable);
    for (const roots of ROOTS_IDS)
      for (const cls of CLASS_IDS) {
        const g = newGame('x', roots, cls);
        for (const id of Object.keys(g.bag)) got.add(id);
        for (const id of [...g.gearBag, ...Object.values(g.gear)]) if (id) got.add(obtainableKey(id));
      }
    for (const id of [...LOOT.common, LOOT.rare, ...QUEST_DROPS.map(r => r.item)]) got.add(id);
    const missing = all.filter(k => !got.has(k) && !NEVER[k]);
    expect(missing).toEqual([]);
  });

  it('crawls every place of every district', () => {
    const places = PLACE_IDS;
    expect(places.filter(p => !PLACE_SCENES[p])).toEqual([]);
  });
});
