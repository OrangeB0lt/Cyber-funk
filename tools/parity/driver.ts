/**
 * The shared parity driver. It generates a seeded corpus of fights and plays each one against an
 * EngineAdapter (legacy vm or TypeScript), recording a trace that the parity test compares exactly.
 *
 * Design rules (see docs/adr/0003-determinism-and-parity.md):
 * - Fight setups come from a *spec* rng that is independent of the engine, so both engines start
 *   from identical inputs.
 * - The player policy draws from its own *policy* rng and only reads observable battle state, so as
 *   long as the engines agree, the policy makes identical choices on both sides.
 * - The engine draws from its own stream; every event is stamped with the draw count at the moment it
 *   was pushed, so the first divergence is pinpointed to an exact draw.
 * - Actor ids are never compared (legacy ids come from a global counter). They are mapped to roles:
 *   P (player), E<index in b.enemies>, A:<bandmate> (assist helpers).
 *
 * Deleted at cutover together with legacy/.
 */
import { createRng, type Rng } from '@core/rng';

/* ------------------------------------------------------------------ */
/* Specs                                                                */
/* ------------------------------------------------------------------ */

export type TimingId = 'one' | 'pocket' | 'loose' | 'clams';

export interface StateSpec {
  cls: string;
  roots: string;
  level: number;
  gear: { instrument: string; threads: string | null; charm: string | null; mod: string | null };
  sheet: string[];
  bandActive: string[];
  bandRecruited: string[];
  bag: Record<string, number>;
  difficulty: 'local' | 'tourist' | 'grand';
  ngPlus: number;
  nextFight: { groove?: number; mojo?: number; hyped?: boolean; pocket?: boolean; status?: string } | null;
  mealBuff: { fights: number; chops: number; grit: number } | null;
  dreamBuff: { fights: number } | null;
  inTower: boolean;
  secondLineSize: number;
  perm: Record<string, number>;
  hpFrac: number;
  fpFrac: number;
  doubloons: number;
  /** Legacy main-quest position (act id + step index). Drives quest drops in battleRewards. */
  story: { act: string; step: number };
  /** Story outcomes that decide second-line membership. */
  progress: { gusFreed: boolean; contracts?: string; vox?: string; lucien?: string; questsDone: string[] };
}

export interface EnemySpec {
  id: string;
  /** Omitted → the engine rolls a level in the enemy's range (an rng draw). */
  level?: number;
}

export interface FightSpec {
  index: number;
  kind: string;
  state: StateSpec;
  enemies: EnemySpec[];
  battle: { boss?: string; clickPhase?: boolean; noFlee?: boolean; ambush?: boolean };
  engineSeed: number;
  policySeed: number;
}

/** Content facts the corpus generator needs. Read from the legacy tables (ids are identical). */
export interface ContentFacts {
  classes: { id: string; skills: string[] }[];
  roots: string[];
  districts: { id: string; lvl: [number, number]; groups: [number, number]; pool: string[]; elite: string }[];
  enemies: { id: string; lvl: [number, number]; rival: boolean }[];
  bosses: { id: string; lvl: number }[];
  battleItems: string[];
  gearBySlot: Record<'threads' | 'charm' | 'mod', string[]>;
  instrumentTiers: string[];
  sheet: string[];
  bandmates: string[];
  statuses: string[];
  acts: string[];
  stepsPerAct: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Adapter                                                              */
/* ------------------------------------------------------------------ */

/** A player intent in the legacy action shape (both engines accept it). */
export interface Intent {
  type: 'riff' | 'play' | 'solo' | 'vamp' | 'bag' | 'split' | 'blues';
  targetId?: string;
  skillId?: string;
  itemId?: string;
  accuracy?: number;
}

/** Battle objects are engine-specific; the driver reads them only through the adapter. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Opaque = any;

export interface EngineAdapter {
  readonly name: string;
  seed(n: number): void;
  draws(): number;
  buildState(spec: StateSpec): Opaque;
  makeEnemy(state: Opaque, e: EnemySpec): Opaque;
  createBattle(state: Opaque, enemies: Opaque[], opts: FightSpec['battle']): Opaque;
  runUntilPlayer(b: Opaque): boolean;
  playerAction(b: Opaque, intent: Intent, timing: TimingId | null): void;
  battleRewards(b: Opaque): unknown;
  applyBattleResult(b: Opaque): void;
  gainXp(state: Opaque, n: number): unknown;
  /** The live events array. The driver stamps pushes and drains it. */
  events(b: Opaque): unknown[];
  /** Event → comparable record. `role` maps an actor id to P / E<i> / A:<bandmate>. */
  normalizeEvent(e: Opaque, role: (id: string) => string): Record<string, unknown>;
  view(b: Opaque): BattleView;
  projectState(state: Opaque): Record<string, unknown>;
  skill(id: string): { fp: number; once: boolean; damaging: boolean };
  /** Out-of-battle rules sampled by the misc section. */
  misc(state: Opaque): Record<string, unknown>;
  priceFor(state: Opaque, base: number, district: string): number;
}

/** The observable parts of a battle (field names follow the legacy battle object). */
export interface BattleView {
  over: boolean;
  result: string | null;
  round: number;
  idx: number;
  order: string[];
  waiting: boolean;
  bluesFree: boolean;
  clickPhase: boolean;
  noFlee: boolean;
  lastPlayerSkill: string | null;
  stolen: number;
  discoveries: string[];
  summonCount: number;
  player: ActorView;
  enemies: ActorView[];
}

export interface ActorView {
  id: string;
  defId: string;
  alive: boolean;
  hp: number;
  maxHp: number;
  fp: number;
  maxFp: number;
  groove: number;
  beat: number;
  boss: boolean;
  elite: boolean;
  stats: Record<string, number>;
  statuses: { id: string; turns: number; fresh: boolean }[];
  guard: unknown;
  charged: string | null;
  nextTone: string | null;
  flags: Record<string, unknown>;
  chopsStack: number;
  extraActions: number;
  dodgeBonus: number;
  shield: unknown;
  turnCount: number;
  onceUsed: Record<string, unknown>;
  skills: string[];
}

/* ------------------------------------------------------------------ */
/* Corpus                                                               */
/* ------------------------------------------------------------------ */

const DIFFICULTIES = ['local', 'local', 'local', 'tourist', 'grand'] as const;

function subset<T>(rng: Rng, items: readonly T[], p: number): T[] {
  return items.filter(() => rng.next() < p);
}

function randomState(rng: Rng, f: ContentFacts, cls: string, level: number): StateSpec {
  const tier = f.instrumentTiers[rng.int(0, f.instrumentTiers.length - 1)]!;
  const maybe = (slot: 'threads' | 'charm' | 'mod') =>
    rng.chance(0.6) ? rng.pick(f.gearBySlot[slot]) : null;
  const band = subset(rng, f.bandmates, 0.35).slice(0, 2);
  const bag: Record<string, number> = {};
  for (const id of subset(rng, f.battleItems, 0.3)) bag[id] = rng.int(1, 3);
  if (rng.chance(0.15)) bag.grisgris = 1;
  const nfRoll = rng.next();
  const nextFight =
    nfRoll < 0.6
      ? null
      : {
          groove: rng.chance(0.5) ? rng.int(10, 60) : undefined,
          mojo: rng.chance(0.3) ? rng.int(-3, 4) : undefined,
          hyped: rng.chance(0.3) || undefined,
          pocket: rng.chance(0.3) || undefined,
          status: rng.chance(0.3) ? rng.pick(f.statuses) : undefined,
        };
  const act = rng.pick(f.acts);
  return {
    cls,
    roots: rng.pick(f.roots),
    level,
    gear: {
      instrument: `inst_${cls}_${tier}`,
      threads: maybe('threads'),
      charm: maybe('charm'),
      mod: maybe('mod'),
    },
    sheet: subset(rng, f.sheet, 0.3),
    bandActive: band,
    bandRecruited: [...new Set([...band, ...subset(rng, f.bandmates, 0.3)])],
    bag,
    difficulty: rng.pick(DIFFICULTIES),
    ngPlus: rng.chance(0.8) ? 0 : rng.int(1, 2),
    nextFight,
    mealBuff: rng.chance(0.2) ? { fights: rng.int(1, 3), chops: 0.1, grit: rng.chance(0.5) ? 0.1 : 0 } : null,
    dreamBuff: rng.chance(0.15) ? { fights: rng.int(1, 2) } : null,
    inTower: rng.chance(0.15),
    secondLineSize: rng.chance(0.5) ? rng.int(0, 14) : 0,
    perm: rng.chance(0.3) ? { mojo: rng.int(0, 2), grit: rng.int(0, 1) } : {},
    hpFrac: rng.chance(0.7) ? 1 : 0.3 + rng.next() * 0.7,
    fpFrac: rng.chance(0.7) ? 1 : rng.next(),
    doubloons: rng.int(0, 400),
    story: { act, step: rng.int(0, Math.max(0, (f.stepsPerAct[act] ?? 1) - 1)) },
    progress: {
      gusFreed: rng.chance(0.5),
      contracts: rng.chance(0.6) ? rng.pick(['burned', 'kept']) : undefined,
      vox: rng.chance(0.6) ? rng.pick(['reprogrammed', 'shutdown']) : undefined,
      lucien: rng.chance(0.6) ? rng.pick(['spared', 'finished']) : undefined,
      questsDone: subset(rng, ['lost_eye', 'herbs', 'haints', 'rolls', 'horn', 'cutting'], 0.5),
    },
  };
}

/** Build `count` fight specs from a seed. Pure: the same seed always yields the same corpus. */
export function generateCorpus(f: ContentFacts, seed: number, count: number): FightSpec[] {
  const rng = createRng(seed);
  const specs: FightSpec[] = [];
  const nonRivals = f.enemies.filter(e => !e.rival);
  const rivals = f.enemies.filter(e => e.rival);
  for (let index = 0; index < count; index++) {
    const roll = rng.next();
    const cls = rng.pick(f.classes).id;
    let spec: Omit<FightSpec, 'index' | 'engineSeed' | 'policySeed'>;
    if (roll < 0.5) {
      const d = rng.pick(f.districts);
      const level = rng.int(d.lvl[0], Math.min(15, d.lvl[1] + 1));
      const n = rng.int(d.groups[0], d.groups[1]);
      const enemies: EnemySpec[] = [];
      for (let k = 0; k < n; k++) {
        const id = rng.chance(0.1) ? d.elite : rng.pick(d.pool);
        enemies.push(rng.chance(0.3) ? { id } : { id, level: rng.int(Math.max(1, level - 1), level + 1) });
      }
      spec = {
        kind: `street:${d.id}`,
        state: randomState(rng, f, cls, level),
        enemies,
        battle: { noFlee: rng.chance(0.3), ambush: rng.chance(0.15) },
      };
    } else if (roll < 0.85) {
      const boss = rng.pick(f.bosses);
      const level = Math.max(1, Math.min(15, boss.lvl + rng.int(-1, 2)));
      const state = randomState(rng, f, cls, level);
      const click = boss.id === 'the_click';
      if (click) {
        state.inTower = true;
        state.secondLineSize = rng.int(0, 14);
      }
      spec = {
        kind: `boss:${boss.id}`,
        state,
        enemies: [rng.chance(0.9) ? { id: boss.id, level: boss.lvl } : { id: boss.id }],
        battle: { boss: boss.id, noFlee: true, clickPhase: click && rng.chance(0.85) },
      };
    } else if (roll < 0.92) {
      const level = rng.int(3, 7);
      const n = rng.int(1, 2);
      spec = {
        kind: 'rival',
        state: randomState(rng, f, cls, level),
        enemies: Array.from({ length: n }, () => ({ id: rng.pick(rivals).id })),
        battle: { noFlee: true },
      };
    } else {
      // Quest-drop setups: the act/step and enemy that trigger ledger pages and crypt keys.
      const ledger = rng.chance(0.5);
      const level = ledger ? rng.int(5, 8) : rng.int(9, 12);
      const state = randomState(rng, f, cls, level);
      state.story = rng.chance(0.85) ? { act: ledger ? 'storyville' : 'cemetery', step: 1 } : state.story;
      const item = ledger ? 'ledgerpage' : 'cryptkey';
      if (rng.chance(0.5)) state.bag[item] = rng.int(0, 3);
      const pool = ledger ? ['enforcer'] : ['data_wraith', 'haint'];
      spec = {
        kind: `drops:${item}`,
        state,
        enemies: Array.from({ length: rng.int(1, 3) }, () => ({
          id: rng.chance(0.8) ? rng.pick(pool) : rng.pick(nonRivals).id,
        })),
        battle: {},
      };
    }
    specs.push({ ...spec, index, engineSeed: rng.int(1, 2 ** 31 - 1), policySeed: rng.int(1, 2 ** 31 - 1) });
  }
  return specs;
}

/* ------------------------------------------------------------------ */
/* Running a fight                                                      */
/* ------------------------------------------------------------------ */

const TIMINGS: TimingId[] = ['one', 'pocket', 'loose', 'clams'];

/** A seeded, mostly-random player that also sends illegal intents to exercise every rejection branch. */
function chooseIntent(rng: Rng, a: EngineAdapter, v: BattleView, bag: Record<string, number>): Intent {
  const living = v.enemies.filter(e => e.alive);
  const target = () => (rng.chance(0.9) && living.length ? rng.pick(living).id : undefined);
  const click = v.enemies.find(e => e.defId === 'the_click');
  if (click && click.alive && click.statuses.some(s => s.id === 'silence') && rng.chance(0.6))
    return { type: 'blues', accuracy: Math.round(rng.next() * 100) / 100 };
  const roll = rng.next();
  if (roll < 0.3) return { type: 'riff', targetId: target() };
  if (roll < 0.65) {
    const skills = v.player.skills;
    if (!skills.length) return { type: 'riff', targetId: target() };
    const affordable = skills.filter(id => a.skill(id).fp <= v.player.fp);
    const pool = affordable.length && rng.chance(0.9) ? affordable : skills;
    return { type: 'play', skillId: rng.pick(pool), targetId: target() };
  }
  if (roll < 0.75) return { type: 'solo', targetId: target() };
  if (roll < 0.83) return { type: 'vamp' };
  if (roll < 0.93) {
    const owned = Object.keys(bag).filter(
      id => (bag[id] ?? 0) > 0 && id !== 'grisgris' && id !== 'ledgerpage' && id !== 'cryptkey',
    );
    if (owned.length && rng.chance(0.9)) return { type: 'bag', itemId: rng.pick(owned) };
    return { type: 'bag', itemId: rng.pick(['beignet', 'smoke', 'gumbo']) };
  }
  if (roll < 0.97) return { type: 'split' };
  return { type: 'blues', accuracy: rng.next() };
}

function needsTiming(a: EngineAdapter, intent: Intent): boolean {
  return (
    intent.type === 'riff' ||
    intent.type === 'solo' ||
    (intent.type === 'play' && a.skill(intent.skillId!).damaging)
  );
}

export interface FightTrace {
  index: number;
  kind: string;
  events: Record<string, unknown>[];
  checkpoints: unknown[];
  end: Record<string, unknown>;
}

function roleMapper(v: BattleView): (id: string) => string {
  const roles = new Map<string, string>([[v.player.id, 'P']]);
  v.enemies.forEach((e, i) => roles.set(e.id, `E${i}`));
  return id => roles.get(id) ?? `?${id}`;
}

function checkpoint(a: EngineAdapter, b: Opaque, draws: number) {
  const v = a.view(b);
  const role = roleMapper(v);
  const actor = (x: ActorView) => ({
    defId: x.defId,
    alive: x.alive,
    hp: x.hp,
    maxHp: x.maxHp,
    fp: x.fp,
    maxFp: x.maxFp,
    groove: x.groove,
    beat: x.beat,
    stats: x.stats,
    statuses: x.statuses.map(s => [s.id, s.turns, !!s.fresh]),
    guard: x.guard,
    charged: x.charged,
    nextTone: x.nextTone ?? null,
    flags: x.flags,
    chopsStack: x.chopsStack,
    extraActions: x.extraActions,
    dodgeBonus: x.dodgeBonus,
    shield: x.shield ?? null,
    turnCount: x.turnCount,
    onceUsed: x.onceUsed,
    skills: x.skills,
  });
  return {
    draws,
    round: v.round,
    idx: v.idx,
    order: v.order.map(role),
    over: v.over,
    result: v.result,
    waiting: v.waiting,
    bluesFree: v.bluesFree,
    lastPlayerSkill: v.lastPlayerSkill,
    stolen: v.stolen,
    summonCount: v.summonCount,
    player: actor(v.player),
    enemies: v.enemies.map(actor),
  };
}

/** Play one fight and record its trace. */
export function runFight(a: EngineAdapter, spec: FightSpec, maxActions = 60): FightTrace {
  a.seed(spec.engineSeed);
  const policy = createRng(spec.policySeed);
  const state = a.buildState(spec.state);
  const enemies = spec.enemies.map(e => a.makeEnemy(state, e));
  const b = a.createBattle(state, enemies, spec.battle);

  // Stamp each event with the engine draw count when it is pushed.
  const live = a.events(b);
  const stamps: number[] = live.map(() => a.draws());
  const push = live.push.bind(live);
  live.push = (...items: unknown[]) => {
    for (let i = 0; i < items.length; i++) stamps.push(a.draws());
    return push(...items);
  };

  const events: Record<string, unknown>[] = [];
  let lastAssist = '';
  const drain = () => {
    const v = a.view(b);
    const base = roleMapper(v);
    const role = (id: string) => {
      const r = base(id);
      return r.startsWith('?') ? `A:${lastAssist}` : r;
    };
    while (live.length) {
      const e = live.shift();
      const draw = stamps.shift();
      const n = a.normalizeEvent(e, role);
      if (n.t === 'assist') lastAssist = String(n.who);
      events.push({ ...n, draw });
    }
  };

  const checkpoints: unknown[] = [];
  drain();
  let actions = 0;
  while (actions++ < maxActions) {
    const waiting = a.runUntilPlayer(b);
    drain();
    checkpoints.push(checkpoint(a, b, a.draws()));
    if (a.view(b).over || !waiting) break;
    const v = a.view(b);
    const intent = chooseIntent(policy, a, v, a.projectState(state).bag as Record<string, number>);
    const timing = needsTiming(a, intent) ? (policy.chance(0.05) ? null : policy.pick(TIMINGS)) : null;
    a.playerAction(b, intent, timing);
    drain();
  }
  const v = a.view(b);
  const end: Record<string, unknown> = {
    result: v.result,
    round: v.round,
    stolen: v.stolen,
    discoveries: v.discoveries,
  };
  if (v.result === 'win') end.rewards = a.battleRewards(b);
  a.applyBattleResult(b);
  if (v.result === 'win') end.levelUps = a.gainXp(state, (end.rewards as { xp: number }).xp);
  end.state = a.projectState(state);
  end.draws = a.draws();
  return { index: spec.index, kind: spec.kind, events, checkpoints, end };
}

/** Out-of-battle rules (stats, prices, unlocks) on random states. */
export function runMisc(a: EngineAdapter, f: ContentFacts, seed: number, count: number): unknown[] {
  const rng = createRng(seed);
  const out: unknown[] = [];
  for (let i = 0; i < count; i++) {
    const cls = rng.pick(f.classes).id;
    const spec = randomState(rng, f, cls, rng.int(1, 15));
    const state = a.buildState(spec);
    const prices = f.districts.map(d => [10, 25, 99, 350].map(p => a.priceFor(state, p, d.id)));
    out.push({
      misc: a.misc(state),
      prices,
      xp: a.gainXp(state, rng.int(0, 4000)),
      state: a.projectState(state),
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Comparison                                                           */
/* ------------------------------------------------------------------ */

/** First path at which two JSON-like values differ, or null when equal. */
export function firstDifference(x: unknown, y: unknown, path = ''): string | null {
  if (Object.is(x, y)) return null;
  if (typeof x !== typeof y || x === null || y === null || typeof x !== 'object') {
    return `${path || '<root>'}: ${JSON.stringify(x)} !== ${JSON.stringify(y)}`;
  }
  if (Array.isArray(x) !== Array.isArray(y)) return `${path}: array vs object`;
  const xo = x as Record<string, unknown>;
  const yo = y as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(xo), ...Object.keys(yo)])];
  for (const k of keys) {
    const d = firstDifference(xo[k], yo[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}
