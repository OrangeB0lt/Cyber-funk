/**
 * The whole game, played headlessly with real battles: new game → prologue → every district's story
 * → its boss → the second line → the Tower → the ending, down every branch of the big boss choices.
 *
 * The scripted player follows the "!" hints the way a person would: the hinted option at the step's
 * hint place, street fights for steps that count wins, kills or drops, a few levels of grinding
 * before a boss. It rests between fights (a stand-in for the club; balance is the sim's job).
 */
import { describe, expect, it } from 'vitest';
import { Session } from '@app/session';
import { memorySaveStorage } from '@app/save/storage';
import { ScriptedPresenter, type ScriptPolicy } from '@app/testing/scriptedPresenter';
import { decodeSave } from '@app/save/format';
import { bossStep } from '@app/devStates';
import { BOSS_IDS, type BossId } from '@core/ids/enemies';
import type { DistrictId, PlaceId } from '@core/ids/world';
import type { GameState, StepDef } from '@core/types';
import type { StoryCard } from '@narrative/types';
import { ACTS, BOSS_SCENES, BOSSES, DISTRICTS, PLACES } from '@content/index';
import { defaultSettings, storyIs } from '@engine/index';

/** The big boss choices: the keys of each branch, in the order they're played. */
const CHOICE_BOSSES: Partial<Record<BossId, readonly string[]>> = {
  vox_perfecta: ['reprogram', 'shutdown'],
  mr_ledger: ['burn', 'keep'],
  rougarou: ['spare', 'finish'],
};

/** What each branch must leave behind. */
const CONSEQUENCES: Record<string, (s: Session) => string | null> = {
  'vox_perfecta=reprogram': s =>
    s.game.choices.vox === 'reprogrammed' ? null : `vox is ${s.game.choices.vox}`,
  'vox_perfecta=shutdown': s =>
    s.game.choices.vox !== 'shutdown'
      ? `vox is ${s.game.choices.vox}`
      : s.game.gearBag.includes('mod_pitch')
        ? null
        : 'no Perfect Pitch Chip',
  'mr_ledger=burn': s =>
    s.game.choices.contracts === 'burned' ? null : `contracts ${s.game.choices.contracts}`,
  'mr_ledger=keep': s =>
    s.game.choices.contracts === 'kept' ? null : `contracts ${s.game.choices.contracts}`,
  'rougarou=spare': s => (s.game.choices.lucien === 'spared' ? null : `lucien ${s.game.choices.lucien}`),
  'rougarou=finish': s =>
    s.game.choices.lucien !== 'finished'
      ? `lucien ${s.game.choices.lucien}`
      : s.game.gearBag.includes('ch_fang') || Object.values(s.game.gear).includes('ch_fang')
        ? null
        : 'no Chrome Fang',
};

/** Each branch's line in the epilogue: [card title, how its text starts]. */
const EPILOGUE: Record<string, [string, string]> = {
  'vox_perfecta=reprogram': ['Vox Perfecta', 'Sings three nights a week'],
  'vox_perfecta=shutdown': ['Vox Perfecta', 'The main stage on Bourbon went dark'],
  'mr_ledger=burn': ['Storyville', 'Free. Madame Céleste marched'],
  'mr_ledger=keep': ['Storyville', 'Still runs on your paper'],
  'rougarou=spare': ['Lucien', 'Runs the Chrome Wolves'],
  'rougarou=finish': ['Lucien', 'The pack scattered'],
};

/** The epilogue cards the player saw last. */
function epilogueOf(p: Player): StoryCard[] {
  const shown = p.presenter.transcript.filter(e => e.t === 'cards' && e.style === 'epilogue');
  const last = shown.at(-1);
  return last && last.t === 'cards' ? last.items : [];
}

/**
 * New Game+ from a finished game: the club's March again → New Game+ → yes. Returns the problems
 * found, checking the New Game+ save as it was written (before the prologue's fights add XP) and
 * that the prologue then plays.
 */
async function newGamePlusFrom(where: string, save: string): Promise<string[]> {
  const problems: string[] = [];
  const q = player(17, save, ['ngplus']);
  const old = q.session.game;
  const written: GameState[] = [];
  const storage = q.session.deps.storage;
  const write = storage.write.bind(storage);
  storage.write = raw => {
    const r = decodeSave(raw);
    if (typeof r !== 'string' && r.game.ngPlus === 1) written.push(r.game);
    return write(raw);
  };
  const before = JSON.parse(JSON.stringify(old)) as GameState;
  q.session.enterPlace('club');
  await act(q, `${where}: club:ngplus`, () => q.session.chooseOption('club', 'ngplus'));
  const ns = written[0];
  if (!ns) return [`${where}: New Game+ never saved`];
  const carried = [
    'level',
    'xp',
    'gear',
    'gearBag',
    'sheet',
    'perm',
    'blessings',
    'bag',
    'lexicon',
    'day',
  ] as const;
  for (const k of carried)
    if (JSON.stringify(ns[k]) !== JSON.stringify(before[k]))
      problems.push(`${where}: NG+ ${k} not carried over`);
  if (ns.doubloons !== Math.round(before.doubloons * 0.5))
    problems.push(`${where}: NG+ doubloons ${ns.doubloons}, expected half of ${before.doubloons}`);
  if (Object.values(ns.book).some(e => !e?.seen)) problems.push(`${where}: NG+ book entries not all seen`);
  const fresh = {
    ngPlus: 1,
    story: { act: 'treme', step: 'meet_roux' },
    secondLine: null,
    flags: {},
    // Every counter starts over except the endings reached, which spans cycles.
    counters: { endingCount: before.counters.endingCount },
    notes: [],
    quests: {},
    bossesDefeated: [],
    choices: {},
  };
  for (const [k, v] of Object.entries(fresh))
    if (JSON.stringify(ns[k as keyof GameState]) !== JSON.stringify(v))
      problems.push(`${where}: NG+ ${k} is ${JSON.stringify(ns[k as keyof GameState])}`);
  // Then the prologue plays through, at ngPlus 1.
  const g = q.session.game;
  if (!q.presenter.lines().some(l => l.startsWith('The city resets like a tape rewound. Enemies are 30%')))
    problems.push(`${where}: no New Game+ narration`);
  if (!q.presenter.lines().some(l => l.startsWith('NEON ORLEANS, 2084')))
    problems.push(`${where}: no prologue`);
  if (g.ngPlus !== 1 || g.story.act !== 'treme' || g.story.step !== 'win_street_fights')
    problems.push(`${where}: after NG+ the story is ${g.story.act}.${g.story.step} (ngPlus ${g.ngPlus})`);
  const reloaded = new Session({ presenter: new ScriptedPresenter(), storage: memorySaveStorage() });
  if (reloaded.load(q.session.serialize()) !== null) problems.push(`${where}: the NG+ save doesn't load`);
  return problems;
}

/** Steps the hints don't point at. */
const STEP_FALLBACK: Partial<Record<string, (s: Session) => Promise<unknown>>> = {
  'treme.meet_roux': s => s.chooseOption('kitchen', 'talk')!,
  'bayou.take_airboat': s => s.travel('bayou'),
};

/** Most actions (options, fights, trips) one playthrough may take. */
const MAX_ACTIONS = 3000;

/**
 * Choices the player always makes when offered: go up from the Studio Floor's vending machine (its
 * menu comes back after every other pick), and keep playing at the credits (New Game+ is tested
 * on its own).
 */
const ALWAYS = ['up', 'stay'];

/** Tries at a step's hinted options before giving up (a Tower defeat sends you back to the club). */
const ATTEMPTS = 6;

interface Player {
  session: Session;
  presenter: ScriptedPresenter;
  /** Choice keys to take whenever offered. */
  prefer: Set<string>;
  /** Actions taken so far. */
  actions: number;
}

function player(seed: number, save?: string, prefer: Iterable<string> = []): Player {
  const pref = new Set([...ALWAYS, ...prefer]);
  const policy: ScriptPolicy = {
    choose: opts => opts.find(o => pref.has(o.key))?.key ?? opts.find(o => o.hint)?.key ?? opts[0]!.key,
  };
  const presenter = new ScriptedPresenter(policy);
  const session = new Session({ presenter, storage: memorySaveStorage(), seed: () => seed });
  if (save) expect(session.load(save)).toBeNull();
  else
    session.newGame('Dawlin', 'creole', 'trumpet', {
      ...defaultSettings(),
      rhythm: 'auto',
      textSpeed: 'instant',
    });
  return { session, presenter, prefer: pref, actions: 0 };
}

/** The last few lines the player saw, for failure messages. */
function tail(p: Player): string {
  return p.presenter.lines().slice(-12).join('\n  ');
}

async function act(p: Player, what: string, run: () => Promise<unknown> | null): Promise<void> {
  if (++p.actions > MAX_ACTIONS)
    throw new Error(`more than ${MAX_ACTIONS} actions; last: ${what}\n  ${tail(p)}`);
  const r = (await run()) as { status?: string } | null;
  if (!r) throw new Error(`${what}: not available\n  ${tail(p)}`);
  if (r.status === 'failed' || r.status === 'busy')
    throw new Error(`${what}: ${r.status} ${String((r as { error?: unknown }).error ?? '')}\n  ${tail(p)}`);
}

async function goTo(p: Player, d: DistrictId): Promise<void> {
  if (p.session.game.district !== d) await act(p, `travel to ${d}`, () => p.session.travel(d));
}

/** Rest (between fights; the club's free rest, wherever the player is). */
async function rest(p: Player): Promise<void> {
  await act(p, 'rest', () => p.session.run(async s => s.rest(), 'rest'));
}

/** Fight on the streets of `d` until `done()` holds. */
async function grind(p: Player, d: DistrictId, done: () => boolean, label: string, max = 150): Promise<void> {
  for (let i = 0; i < max && !done(); i++) {
    await goTo(p, d);
    if (p.session.game.hp < p.session.game.level * 6) await rest(p);
    await act(p, `streets of ${d}`, () => p.session.hitTheStreets());
  }
  if (!done()) throw new Error(`${label}: still not done after ${max} street visits\n  ${tail(p)}`);
}

/** The boss fought at the current step, if any. */
function bossHere(p: Player): BossId | null {
  return (
    BOSS_IDS.find(b => storyIs(p.session.game, bossStep(b)) && !p.session.game.bossesDefeated.includes(b)) ??
    null
  );
}

type Stop = { kind: 'end' } | { kind: 'choice'; boss: BossId };

/**
 * Play until the ending, or (if `stopBefore` says so) just before a boss whose
 * choice the caller wants to fork on.
 */
async function drive(p: Player, stopBefore: (b: BossId) => boolean): Promise<Stop> {
  const s = p.session;
  for (;;) {
    const g = s.game;
    const { act: a, step } = g.story;
    if (a === 'done') return { kind: 'end' };
    const key = `${a}.${step}`;
    const def = (ACTS[a] as Record<string, StepDef>)[step]!;
    const district = (a in DISTRICTS ? a : 'tower') as DistrictId;
    const moved = () => g.story.act !== a || g.story.step !== step;

    if (def.progress) {
      await grind(p, def.progress.kind === 'streetWins' ? def.progress.district : district, moved, key);
      continue;
    }
    const boss = bossHere(p);
    if (boss && stopBefore(boss)) return { kind: 'choice', boss };
    // Be ready for what's next: the district's top level, or the boss's.
    const want = Math.min(15, Math.max(DISTRICTS[district].levels[1], boss ? BOSSES[boss].level + 1 : 0));
    if (g.level < want) await grind(p, district, () => g.level >= want, `${key}: reaching level ${want}`);
    await rest(p);

    const fallback = STEP_FALLBACK[key];
    if (fallback) {
      await act(p, key, () => fallback(s));
      if (!moved()) throw new Error(`${key}: the fallback didn't move the story\n  ${tail(p)}`);
      continue;
    }
    // The hinted option at the hint place, then any hinted option anywhere unlocked.
    const places: PlaceId[] = [
      ...(def.hintPlace ? [def.hintPlace] : []),
      ...g.unlocked.flatMap(d => DISTRICTS[d].places),
    ];
    let progressed = false;
    for (let attempt = 0; attempt < ATTEMPTS && !progressed; attempt++)
      for (const [i, place] of [...new Set(places)].entries()) {
        // Hinted options first; at the step's own hint place, then everything else there too (v1
        // doesn't highlight every story option: Céleste's Whispers move Storyville on unmarked).
        const all = s.placeOptions(place);
        const hinted = all.filter(o => o.hint || o.key === 'boss');
        const opts = i === 0 && def.hintPlace ? [...hinted, ...all.filter(o => !hinted.includes(o))] : hinted;
        for (const o of opts) {
          await goTo(p, PLACES[place].district);
          s.enterPlace(place);
          await act(p, `${key}: ${place}:${o.key}`, () => s.chooseOption(place, o.key));
          if (moved()) {
            progressed = true;
            break;
          }
          await rest(p);
        }
        if (progressed) break;
      }
    if (!progressed) throw new Error(`${key}: no hinted option moves the story on\n  ${tail(p)}`);
  }
}

interface Leaf {
  /** The branch taken at each choice boss, as `boss=key`. */
  path: string[];
  p: Player;
}

/** Play every branch of the choices that exist so far. */
async function playAll(seed: number): Promise<Leaf[]> {
  const leaves: Leaf[] = [];
  const go = async (p: Player, path: string[], picked: Set<BossId>): Promise<void> => {
    const stop = await drive(p, b => !!CHOICE_BOSSES[b] && !!BOSS_SCENES[b] && !picked.has(b));
    if (stop.kind === 'end') {
      leaves.push({ path, p });
      return;
    }
    const save = p.session.serialize()!;
    for (const choice of CHOICE_BOSSES[stop.boss]!) {
      const q = player(seed, save, [...p.prefer, choice]);
      q.actions = p.actions;
      await go(q, [...path, `${stop.boss}=${choice}`], new Set([...picked, stop.boss]));
    }
  };
  const p = player(seed);
  await act(p, 'prologue', () => p.session.startPrologue());
  await go(p, [], new Set());
  return leaves;
}

describe('playthrough', () => {
  it('plays from a new game to the ending down every branch of the boss choices, then New Game+', async () => {
    const leaves = await playAll(17);
    const choiceBosses = BOSS_IDS.filter(b => CHOICE_BOSSES[b]);
    expect(leaves).toHaveLength(2 ** choiceBosses.length);
    const problems: string[] = [];
    for (const { path, p } of leaves) {
      const g = p.session.game;
      const where = path.join(' ') || 'the only path';
      if (g.story.act !== 'done') problems.push(`${where}: stopped at ${g.story.act}.${g.story.step}`);
      for (const b of BOSS_IDS) if (!g.bossesDefeated.includes(b)) problems.push(`${where}: never beat ${b}`);
      const notes = BOSS_IDS.filter(b => BOSSES[b].note).length;
      if (g.notes.length !== notes)
        problems.push(`${where}: ${g.notes.length} Blue Notes, expected ${notes}`);
      for (const step of path) {
        const why = CONSEQUENCES[step]?.(p.session);
        if (why) problems.push(`${where}: ${step}: ${why}`);
        // The epilogue tells this branch's story.
        const [title, starts] = EPILOGUE[step]!;
        const card = epilogueOf(p).find(c => c.title === title);
        if (!card?.text.startsWith(starts)) problems.push(`${where}: ${step}: epilogue says ${card?.text}`);
      }
      const line = epilogueOf(p).find(c => c.title === 'The Second Line');
      if (
        line?.text !==
        `${g.secondLine?.length} strong on the night the Click broke. Everyone in it got a hat.`
      )
        problems.push(`${where}: the second line card says ${line?.text}`);
      problems.push(...(await newGamePlusFrom(where, p.session.serialize()!)));
      // The final save loads back.
      const reloaded = new Session({ presenter: new ScriptedPresenter(), storage: memorySaveStorage() });
      if (reloaded.load(p.session.serialize()) !== null) problems.push(`${where}: the save doesn't load`);
    }
    expect(problems).toEqual([]);
  });
});
