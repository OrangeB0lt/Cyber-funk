/**
 * Headless balance sim: every class against every district's streets and every boss, played by a
 * simple scripted player. Deterministic for a seed, so a balance change shows up as an exact diff.
 *
 *   npm run sim                      # seed 1, text table
 *   npm run sim -- --seed 7          # another seed
 *   npm run sim -- --json            # machine-readable rows, for diffing two runs
 *   npm run sim:baseline             # rewrite tests/fixtures/sim (tools/simBaseline.ts)
 *
 * The scripted player, loadouts and output format match v1's sim (legacy/sim/sim.js) exactly; the
 * baseline in tests/fixtures/sim was written while they were byte-identical. A change to balance,
 * the player or the output rewrites the baseline in the same commit, and the diff is the review.
 */
import { pathToFileURL } from 'node:url';
import { hasStatus, livingEnemies } from '@core/helpers';
import { CLASS_IDS, type ClassId } from '@core/ids/characters';
import type { EnemyId, OpponentId } from '@core/ids/enemies';
import { createRng, type Rng } from '@core/rng';
import type { Battle, GameState, PlayerIntent, SkillDef, TimingResult } from '@core/types';
import { BOSSES, DISTRICTS, ENEMIES, SKILLS, TIMING } from '@content/data';
import {
  addItem,
  applyBattleResult,
  countItem,
  createBattle,
  fullRest,
  makeEnemy,
  newGame,
  playerAction,
  playerCanSolo,
  runUntilPlayer,
} from '@engine/index';

/** Gear a player would reasonably own at level L. */
export function loadout(s: GameState, L: number): void {
  const cls = s.cls;
  s.level = L;
  s.gear.instrument = `inst_${cls}_${L >= 11 ? 'chrome' : L >= 7 ? 'neon' : L >= 3 ? 'street' : 'pawnshop'}`;
  s.gear.threads =
    L >= 11 ? 'thr_kevlar' : L >= 8 ? 'thr_duster' : L >= 4 ? 'thr_secondline' : L >= 2 ? 'thr_thrift' : null;
  s.gear.charm = L >= 5 ? 'ch_gator' : null;
  s.gear.mod = L >= 7 ? 'mod_jaw' : null;
  if (L >= 13) s.gear.instrument = `inst_${cls}_legend`;
  fullRest(s);
}

export interface FightOpts {
  items: number;
  used: number;
  beads?: number;
  boss?: OpponentId;
}

const TONE_ITEM = { HOT: 'cayenne', LOW: 'subtape', BLUE: 'indigo', FUNK: 'discobead' } as const;

/** A decent, simple player: heal when low, brace for telegraphs, exploit weaknesses, solo when ready. */
export function chooseAction(rng: Rng, b: Battle, s: GameState, opts: FightOpts): PlayerIntent {
  const p = b.player;
  const foes = livingEnemies(b);
  const target = foes.sort((a, c) => a.hp - c.hp)[0]!;
  if (p.hp < p.maxHp * (opts.boss ? 0.5 : 0.4) && opts.items > 0) {
    const it = countItem(s, 'gumbo') ? 'gumbo' : countItem(s, 'poboy') ? 'poboy' : null;
    if (it) {
      opts.items--;
      opts.used++;
      return { type: 'bag', itemId: it };
    }
  }
  if (foes.some(e => e.charged)) return { type: 'vamp' };
  const weakItem = target.weak && target.weak !== 'SWEET' ? TONE_ITEM[target.weak] : undefined;
  if (
    !p.nextTone &&
    target.weak &&
    target.resist === p.tone &&
    weakItem &&
    countItem(s, weakItem) &&
    p.fp >= 8
  ) {
    opts.beads = (opts.beads || 0) + 1;
    return { type: 'bag', itemId: weakItem };
  }
  if (playerCanSolo(b)) return { type: 'solo', targetId: target.id };
  if (!hasStatus(p, 'muted')) {
    const skills = p.skills
      .map(id => SKILLS[id])
      .filter(sk => sk.fp <= p.fp && !(sk.once && p.onceUsed[sk.id]));
    const heal = skills.find(sk => sk.effects.some(f => f.kind === 'heal' && (f.pct || 0) >= 0.25));
    if (heal && p.hp < p.maxHp * 0.45) return { type: 'play', skillId: heal.id, targetId: target.id };
    const dmg = skills.filter(sk => sk.effects.some(f => f.kind === 'dmg'));
    const expected = (sk: SkillDef) => {
      let t = 0;
      sk.effects.forEach(f => {
        if (f.kind !== 'dmg') return;
        const m = typeof f.mult === 'function' ? 1.8 : (f.mult as number);
        const hits = Array.isArray(f.hits) ? 10 : (f.hits as number) || 1;
        let tm = 1;
        const tone = f.tone || p.tone;
        if (target.weak === tone) tm = 1.5;
        else if (target.resist === tone && !f.ignoreResist) tm = 0.5;
        t += m * hits * tm * (f.target === 'all' ? foes.length : 1);
      });
      return t;
    };
    if (dmg.length) {
      dmg.sort((a, c) => expected(c) - expected(a));
      const best = dmg[0]!;
      const riffExp = target.weak === p.tone ? 1.5 : target.resist === p.tone ? 0.5 : 1;
      if (expected(best) > riffExp * 1.15 && p.fp - best.fp >= 0)
        return { type: 'play', skillId: best.id, targetId: target.id };
    }
    const buff = skills.find(
      sk =>
        !sk.effects.some(f => f.kind === 'dmg') &&
        sk.effects.some(f => f.kind === 'status' && f.target === 'self' && f.id === 'hyped'),
    );
    if (buff && !hasStatus(p, 'hyped') && b.round <= 2)
      return { type: 'play', skillId: buff.id, targetId: target.id };
  }
  if (p.fp < 6 && b.round > 1 && rng.next() < 0.3) return { type: 'vamp' };
  return { type: 'riff', targetId: target.id };
}

/** A decent human's timing: 35% ONE, 40% pocket, 20% loose, 5% clams. */
export function timingRoll(rng: Rng): TimingResult {
  const r = rng.next();
  return r < 0.35 ? TIMING.one : r < 0.75 ? TIMING.pocket : r < 0.95 ? TIMING.loose : TIMING.clams;
}

export function needsTiming(act: PlayerIntent): boolean {
  return (
    act.type === 'riff' ||
    act.type === 'solo' ||
    (act.type === 'play' && SKILLS[act.skillId].effects.some(f => f.kind === 'dmg'))
  );
}

interface FightResult {
  result: Battle['result'];
  rounds: number;
  lost?: number;
  used: number;
  beads?: number;
  hpLeft: number;
}

function runFight(
  rng: Rng,
  s: GameState,
  enemyDefs: { id: OpponentId; level: number }[],
  partial: Partial<FightOpts> = {},
): FightResult {
  const opts: FightOpts = Object.assign({ items: 0, used: 0 }, partial);
  const enemies = enemyDefs.map(d => makeEnemy(rng, s, d.id, d.level));
  const b = createBattle(rng, s, enemies, {
    boss: opts.boss && opts.boss in BOSSES ? (opts.boss as keyof typeof BOSSES) : undefined,
    noFlee: true,
  });
  const hp0 = b.player.hp;
  let guard = 0;
  while (!b.over && guard++ < 80) {
    const waiting = runUntilPlayer(b);
    if (b.over) break;
    if (!waiting) break;
    const act = chooseAction(rng, b, s, opts);
    if (act.type === 'blues') playerAction(b, act, null);
    else playerAction(b, act, needsTiming(act) ? timingRoll(rng) : null);
  }
  const lost = (hp0 - Math.max(0, b.player.hp)) / b.player.maxHp;
  applyBattleResult(b);
  return {
    result: b.result,
    rounds: b.round,
    lost,
    used: opts.used,
    beads: opts.beads || 0,
    hpLeft: b.player.hp / b.player.maxHp,
  };
}

/** The finale: break Perfect Silence with the Blues, build Groove behind it, then fight normally. */
function runClick(rng: Rng, s: GameState): FightResult {
  const opts: FightOpts = { items: 3, used: 0 };
  const enemies = [makeEnemy(rng, s, 'the_click', 15)];
  const b = createBattle(rng, s, enemies, { boss: 'the_click', clickPhase: true, noFlee: true });
  let guard = 0;
  while (!b.over && guard++ < 80) {
    const waiting = runUntilPlayer(b);
    if (b.over || !waiting) break;
    const click = b.enemies[0]!;
    if (hasStatus(click, 'silence') && (b.bluesFree || b.player.groove >= 100)) {
      playerAction(b, { type: 'blues', accuracy: 0.7 }, null);
      continue;
    }
    if (hasStatus(click, 'silence')) {
      const act: PlayerIntent =
        b.player.hp < b.player.maxHp * 0.35 && opts.items > 0 && countItem(s, 'gumbo')
          ? { type: 'bag', itemId: 'gumbo' }
          : { type: 'riff', targetId: click.id };
      if (act.type === 'bag') {
        opts.items--;
        opts.used++;
      }
      playerAction(b, act, act.type === 'riff' ? timingRoll(rng) : null);
      continue;
    }
    const act = chooseAction(rng, b, s, opts);
    playerAction(b, act, needsTiming(act) ? timingRoll(rng) : null);
  }
  return { result: b.result, rounds: b.round, used: opts.used, hpLeft: b.player.hp / b.player.maxHp };
}

const pct = (x: number) => Math.round(x * 100) + '%';
const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;

/** One row of results, for --json. */
export interface SimRow {
  cls: ClassId;
  kind: 'street' | 'boss';
  vs: string;
  level: number;
  win: number;
  rounds: number;
  hpLost?: number;
  items?: number;
  hpLeft?: number;
}

/** Run the full sim grid. Returns the v1-format text table and structured rows. */
export function runSim(seed: number): { text: string; rows: SimRow[] } {
  const rng = createRng(seed);
  const districts = Object.values(DISTRICTS);
  const N = 60;
  const out: string[] = [];
  const rows: SimRow[] = [];
  for (const cls of CLASS_IDS) {
    out.push(`\n=== ${cls.toUpperCase()} ===`);
    for (const d of districts) {
      const L = d.levels[0] + 1;
      const res: FightResult[] = [];
      for (let i = 0; i < N; i++) {
        const s = newGame('Sim', 'yat', cls);
        loadout(s, L);
        s.band.active = L >= 5 ? ['sugar'] : [];
        if (L >= 7) s.band.active.push('static');
        const n = Math.max(d.groups[0], Math.min(d.groups[1], Math.round((d.groups[0] + d.groups[1]) / 2)));
        const defs: { id: EnemyId; level: number }[] = [];
        for (let k = 0; k < n; k++) {
          const id = rng.pick(d.pool);
          const ed = ENEMIES[id];
          defs.push({ id, level: Math.max(ed.levels[0], Math.min(ed.levels[1], L)) });
        }
        res.push(runFight(rng, s, defs));
      }
      const wins = res.filter(r => r.result === 'win');
      out.push(
        `${d.id.padEnd(10)} L${L} n=${districts.indexOf(d)}: win ${pct(wins.length / N)} rounds ${avg(wins.map(r => r.rounds)).toFixed(1)} hpLost ${pct(avg(wins.map(r => r.lost!)))}`,
      );
      rows.push({
        cls,
        kind: 'street',
        vs: d.id,
        level: L,
        win: wins.length / N,
        rounds: avg(wins.map(r => r.rounds)),
        hpLost: avg(wins.map(r => r.lost!)),
      });
    }
    for (const bd of Object.values(BOSSES)) {
      const res: FightResult[] = [];
      for (let i = 0; i < 40; i++) {
        const s = newGame('Sim', 'yat', cls);
        loadout(s, bd.level);
        s.band.active = bd.level >= 5 ? ['sugar'] : [];
        if (bd.level >= 7) s.band.active.push('static');
        addItem(s, 'gumbo', 3);
        addItem(s, 'poboy', 3);
        (['cayenne', 'subtape', 'indigo', 'discobead'] as const).forEach(i => addItem(s, i, 5));
        if (bd.bluesTarget) {
          s.secondLine = Array.from({ length: 10 }, (_, k) => ({ id: `m${k}`, name: 'M' + k }));
          s.inTower = true;
        }
        res.push(
          bd.bluesTarget
            ? runClick(rng, s)
            : runFight(rng, s, [{ id: bd.id, level: bd.level }], { items: 3, boss: bd.id }),
        );
      }
      const wins = res.filter(r => r.result === 'win');
      const any = wins.length > 0;
      out.push(
        `BOSS ${bd.id.padEnd(13)} L${bd.level}: win ${pct(wins.length / res.length)} rounds ${any ? avg(wins.map(r => r.rounds)).toFixed(1) : '-'} items ${any ? avg(wins.map(r => r.used)).toFixed(1) : '-'} beads ${any ? avg(wins.map(r => r.beads || 0)).toFixed(1) : '-'} hpLeft ${any ? pct(avg(wins.map(r => r.hpLeft))) : '-'}`,
      );
      rows.push({
        cls,
        kind: 'boss',
        vs: bd.id,
        level: bd.level,
        win: wins.length / res.length,
        rounds: any ? avg(wins.map(r => r.rounds)) : NaN,
        items: any ? avg(wins.map(r => r.used)) : NaN,
        hpLeft: any ? avg(wins.map(r => r.hpLeft)) : NaN,
      });
    }
  }
  return { text: out.join('\n'), rows };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const arg = (k: string) => {
    const i = process.argv.indexOf(k);
    return i >= 0 ? process.argv[i + 1] : undefined;
  };
  const seed = Number(arg('--seed') ?? 1);
  const { text, rows } = runSim(seed);
  console.log(process.argv.includes('--json') ? JSON.stringify(rows, null, 2) : text);
}
