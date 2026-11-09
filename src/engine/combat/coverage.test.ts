/**
 * Everything in combat, once each: every skill, boss move, assist, status, item, gear piece, sheet of
 * music, enemy and boss. The mechanics tests (combat.test.ts) check *what* each rule does; this file
 * checks that *nothing* in the tables breaks: no throw, no NaN, no runaway fight, no "undefined" in the
 * battle log. It reads every id list, so new content is covered the moment it's added.
 *
 * The parity oracles sampled fights at random until cutover; this file reaches every id on purpose.
 */
import { describe, expect, it } from 'vitest';
import { livingEnemies } from '@core/helpers';
import { CLASS_IDS, type ClassId } from '@core/ids/characters';
import {
  BOSS_SKILL_IDS,
  ENEMY_SKILL_IDS,
  STATUS_IDS,
  type CombatStatKey,
  type SkillId,
} from '@core/ids/combat';
import { BOSS_IDS, ENEMY_IDS, type OpponentId } from '@core/ids/enemies';
import { BANDMATE_IDS } from '@core/ids/band';
import { ITEM_IDS, SHEET_MUSIC_IDS, type GearId } from '@core/ids/items';
import { createRng, type Rng } from '@core/rng';
import type { Battle, BattleOptions, GameState, PlayerIntent, TimingResult } from '@core/types';
import { BANDMATES, BOSSES, CLASSES, ENEMIES, GEAR, ITEMS, SKILLS, STATUSES, TIMING } from '@content/data';
import {
  activePassives,
  addItem,
  countItem,
  createBattle,
  derivedStats,
  effStat,
  equip,
  fullRest,
  legalActions,
  makeEnemy,
  makePlayerActor,
  needsTiming,
  newGame,
  playerAction,
  resolveSkill,
  rollAutoTiming,
  runUntilPlayer,
  useFieldItem,
} from '../index';
import { applyStatusRaw } from './statuses';
import { endTurn, runAssists } from './turns';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const COMBAT_STATS: CombatStatKey[] = ['chops', 'grit', 'tempo', 'mojo'];

/** A player of `cls` at `level`, with the instrument a player that level would carry. */
function hero(cls: ClassId, level: number, tweak?: (s: GameState) => void): GameState {
  const s = newGame('Coverage', 'yat', cls);
  s.level = level;
  const tier = level >= 11 ? 'chrome' : level >= 7 ? 'neon' : level >= 3 ? 'street' : 'pawnshop';
  s.gear.instrument = `inst_${cls}_${tier}`;
  tweak?.(s);
  fullRest(s);
  return s;
}

/** A battle against these opponents, advanced to the player's first turn. */
function fight(
  rng: Rng,
  s: GameState,
  foes: { id: OpponentId; level: number }[],
  opts: BattleOptions = {},
): Battle {
  const b = createBattle(
    rng,
    s,
    foes.map(f => makeEnemy(rng, s, f.id, f.level)),
    opts,
  );
  runUntilPlayer(b);
  return b;
}

const BROKEN = /undefined|NaN|\[object /;

/** Everything wrong with a battle right now (then its events are cleared). */
function insane(b: Battle): string[] {
  const out: string[] = [];
  for (const a of [b.player, ...b.enemies]) {
    const nums = { hp: a.hp, maxHp: a.maxHp, fp: a.fp, maxFp: a.maxFp, groove: a.groove };
    for (const [k, v] of Object.entries(nums)) if (!Number.isFinite(v)) out.push(`${a.name}.${k} is ${v}`);
    if (a.hp > a.maxHp) out.push(`${a.name} has ${a.hp}/${a.maxHp} Heart`);
    if (a.hp < 0) out.push(`${a.name} has negative Heart (${a.hp})`);
    for (const k of COMBAT_STATS) {
      const v = effStat(a, k);
      if (!Number.isFinite(v)) out.push(`${a.name}'s effective ${k} is ${v}`);
    }
  }
  for (const e of b.events) {
    if ((e.type === 'dmg' || e.type === 'heal') && !(Number.isFinite(e.amount) && Number.isFinite(e.hpAfter)))
      out.push(`${e.type} event with amount ${e.amount}, hpAfter ${e.hpAfter}`);
    if (e.type === 'revive' && !Number.isFinite(e.hpAfter)) out.push(`revive to ${e.hpAfter}`);
    if (e.type === 'blues' && !Number.isFinite(e.accuracy)) out.push(`blues accuracy ${e.accuracy}`);
    if (e.type === 'log' && BROKEN.test(e.text)) out.push(`log: ${e.text}`);
  }
  b.events.length = 0;
  return out;
}

/** A simple player: Blues when possible, SOLO when ready, a random usable skill half the time, else RIFF. */
function chooseIntent(rng: Rng, b: Battle): PlayerIntent {
  const legal = legalActions(b);
  const target = livingEnemies(b).sort((a, c) => a.hp - c.hp)[0]?.id;
  if (legal.canBlues) return { type: 'blues', accuracy: 0.7 };
  if (legal.canSolo) return { type: 'solo', targetId: target };
  const usable = legal.skills.filter(sk => sk.usable);
  if (legal.canPlay && usable.length && rng.chance(0.5))
    return { type: 'play', skillId: rng.pick(usable).id, targetId: target };
  return { type: 'riff', targetId: target };
}

/** Play a battle to the end. Problems include a fight that never ends. */
function autoFight(b: Battle, rng: Rng, maxActions = 150): string[] {
  const problems = insane(b);
  for (let i = 0; i < maxActions; i++) {
    if (b.over) return problems;
    if (!b.waiting && !runUntilPlayer(b)) {
      problems.push(...insane(b));
      return b.over ? problems : [...problems, `runUntilPlayer tripped its loop guard in round ${b.round}`];
    }
    problems.push(...insane(b));
    if (b.over) return problems;
    const intent = chooseIntent(rng, b);
    playerAction(b, intent, intent.type !== 'blues' && needsTiming(intent) ? rollAutoTiming(rng) : null);
    problems.push(...insane(b));
  }
  return b.over ? problems : [...problems, `still going after ${maxActions} actions (round ${b.round})`];
}

/** Collect problems under a label. */
function under(label: string, problems: string[]): string[] {
  return problems.map(p => `${label}: ${p}`);
}

/** Run `f`, turning a throw into a problem. */
function safely(label: string, f: () => string[]): string[] {
  try {
    return under(label, f());
  } catch (e) {
    return [`${label}: threw ${e instanceof Error ? e.message : String(e)}`];
  }
}

/* ------------------------------------------------------------------ */
/* Skills                                                               */
/* ------------------------------------------------------------------ */

describe('every skill', () => {
  it("every class's riff, solo and six skills resolve, on the ONE and as CLAMS, and the fight still ends", () => {
    const problems: string[] = [];
    for (const cls of CLASS_IDS) {
      const c = CLASSES[cls];
      for (const id of [c.riff, c.solo, ...c.skills] as SkillId[])
        for (const seed of [1, 2, 3])
          for (const timing of [TIMING.one, TIMING.clams] as TimingResult[])
            problems.push(
              ...safely(`${cls} ${id} seed ${seed} ${timing.id}`, () => {
                const rng = createRng(seed);
                const b = fight(rng, hero(cls, 15), [
                  { id: 'nutria', level: 12 },
                  { id: 'hush_patrol', level: 12 },
                ]);
                b.player.fp = b.player.maxFp;
                b.player.groove = 100;
                const intent: PlayerIntent = SKILLS[id].riff
                  ? { type: 'riff', targetId: b.enemies[0]!.id }
                  : SKILLS[id].solo
                    ? { type: 'solo', targetId: b.enemies[0]!.id }
                    : { type: 'play', skillId: id, targetId: b.enemies[0]!.id };
                playerAction(b, intent, timing);
                const out = insane(b);
                return seed === 1 && timing === TIMING.one ? [...out, ...autoFight(b, rng)] : out;
              }),
            );
    }
    expect(problems).toEqual([]);
  });

  it('every enemy special resolves from the enemy that has it', () => {
    const problems: string[] = [];
    for (const id of ENEMY_SKILL_IDS) {
      const owners = ENEMY_IDS.filter(e => ENEMIES[e].special === id);
      for (const e of owners.length ? owners : (['nutria'] as const))
        problems.push(
          ...safely(`${e} uses ${id}`, () => {
            const rng = createRng(5);
            const b = fight(rng, hero('trumpet', 10), [{ id: e, level: ENEMIES[e].levels[1] }]);
            const caster = b.enemies[0]!;
            resolveSkill(b, caster, SKILLS[id], b.player, null);
            return [...insane(b), ...autoFight(b, rng)];
          }),
        );
    }
    expect(problems).toEqual([]);
  });

  it('every boss move resolves from some boss (each boss runs its own in the fights below)', () => {
    const problems: string[] = [];
    for (const id of BOSS_SKILL_IDS) {
      const tries = BOSS_IDS.map(boss =>
        safely(`${boss} uses ${id}`, () => {
          const rng = createRng(5);
          const b = fight(rng, hero('trumpet', 15), [{ id: boss, level: BOSSES[boss].level }], {
            boss,
            noFlee: true,
          });
          resolveSkill(b, b.enemies[0]!, SKILLS[id], b.player, null);
          return insane(b);
        }),
      );
      if (tries.every(t => t.length)) problems.push(`${id}: no boss can use it`, ...tries.flat());
    }
    expect(problems).toEqual([]);
  });

  it('every bandmate assist resolves, alone and as a pair', () => {
    const problems: string[] = [];
    const lineups = [
      ...BANDMATE_IDS.map(id => [id]),
      [...BANDMATE_IDS].slice(0, 2),
      [...BANDMATE_IDS].slice(2),
    ];
    for (const active of lineups)
      problems.push(
        ...safely(`assists ${active.join('+')}`, () => {
          const rng = createRng(3);
          const s = hero('snare', 10, g => {
            g.band.recruited = [...BANDMATE_IDS];
            g.band.active = active;
          });
          const b = fight(rng, s, [
            { id: 'nutria', level: 9 },
            { id: 'hush_patrol', level: 9 },
          ]);
          runAssists(b);
          const out = insane(b);
          if (!active.every(id => BANDMATES[id])) out.push('unknown bandmate');
          return [...out, ...autoFight(b, rng)];
        }),
      );
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Statuses                                                             */
/* ------------------------------------------------------------------ */

describe('every status', () => {
  it('applies to the player and an enemy, keeps stats finite, wears off, and the fight still ends', () => {
    const problems: string[] = [];
    for (const id of STATUS_IDS)
      for (const side of ['player', 'enemy'] as const)
        problems.push(
          ...safely(`${id} on the ${side}`, () => {
            const rng = createRng(9);
            const b = fight(rng, hero('saxophone', 8), [{ id: 'gocup_golem', level: 5 }]);
            const target = side === 'player' ? b.player : b.enemies[0]!;
            applyStatusRaw(b, target, id);
            const out = insane(b);
            const def = STATUSES[id];
            if (!def.untilTriggered) {
              const probe = structuredClone(target.statuses);
              const turns = (probe.find(st => st.id === id)?.turns ?? def.turns) + 2;
              const copy = { ...target, statuses: probe };
              for (let i = 0; i < turns; i++) endTurn({ ...b, events: [] }, copy);
              if (copy.statuses.some(st => st.id === id)) out.push(`still on after ${turns} turns`);
            }
            return [...out, ...autoFight(b, rng)];
          }),
        );
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Items, gear, sheet music                                             */
/* ------------------------------------------------------------------ */

describe('every item', () => {
  it('battle items work from the bag; field items work from the menu; drinks carry into the next fight', () => {
    const problems: string[] = [];
    for (const id of ITEM_IDS) {
      const it = ITEMS[id];
      if (it.battle)
        problems.push(
          ...safely(`${id} in battle`, () => {
            const rng = createRng(4);
            const s = hero('trombone', 6, g => addItem(g, id, 2));
            const b = fight(rng, s, [{ id: 'barker', level: 5 }]);
            b.player.hp = Math.ceil(b.player.maxHp / 3);
            playerAction(
              b,
              { type: 'bag', itemId: id, ...{ targetId: b.enemies[0]!.id } } as PlayerIntent,
              null,
            );
            const out = insane(b);
            if (countItem(s, id) !== 1) out.push(`the bag still holds ${countItem(s, id)} (used none)`);
            return [...out, ...autoFight(b, rng)];
          }),
        );
      if (it.field)
        problems.push(
          ...safely(`${id} from the menu`, () => {
            const s = hero('trombone', 6, g => addItem(g, id, 1));
            s.hp = 1;
            const use = useFieldItem(createRng(4), s, id);
            const out: string[] = [];
            if (!use.used) out.push('did nothing');
            if (BROKEN.test(use.message)) out.push(`message: ${use.message}`);
            if (!Number.isFinite(s.hp) || !Number.isFinite(s.fp)) out.push(`vitals ${s.hp}/${s.fp}`);
            if (it.prefight) {
              const b = fight(createRng(4), s, [{ id: 'barker', level: 5 }]);
              if (!b.player.statuses.some(st => st.id === it.prefight!.status))
                out.push(`${it.prefight.status} wasn't on at the start of the next fight`);
              out.push(...insane(b));
            }
            return out;
          }),
        );
    }
    expect(problems).toEqual([]);
  });
});

describe('every gear piece and sheet of music', () => {
  it('equips with finite stats and fights', () => {
    const problems: string[] = [];
    for (const id of Object.keys(GEAR) as GearId[]) {
      const g = GEAR[id];
      const cls: ClassId = g.cls ?? 'trumpet';
      problems.push(
        ...safely(`${id}`, () => {
          const s = hero(cls, 15, st => {
            st.gearBag.push(id);
            equip(st, id);
          });
          const out: string[] = [];
          if (s.gear[g.slot] !== id) out.push(`didn't equip into ${g.slot}`);
          const d = derivedStats(s);
          for (const [k, v] of Object.entries(d))
            if (typeof v === 'number' && !Number.isFinite(v)) out.push(`${k} is ${v}`);
          const a = makePlayerActor(s);
          for (const k of COMBAT_STATS)
            if (!Number.isFinite(a.stats[k])) out.push(`actor ${k} is ${a.stats[k]}`);
          const rng = createRng(2);
          return [...out, ...autoFight(fight(rng, s, [{ id: 'nutria', level: 10 }]), rng)];
        }),
      );
    }
    for (const id of SHEET_MUSIC_IDS)
      problems.push(
        ...safely(id, () => {
          const s = hero('clarinet', 12, st => (st.sheet = [id]));
          const out: string[] = [];
          if (!activePassives(s).length) out.push('gives no passive');
          const rng = createRng(2);
          return [...out, ...autoFight(fight(rng, s, [{ id: 'nutria', level: 10 }]), rng)];
        }),
      );
    expect(problems).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Opponents                                                            */
/* ------------------------------------------------------------------ */

describe('every opponent', () => {
  it('every enemy builds at both ends of its level range and can be fought to the end', () => {
    const problems: string[] = [];
    for (const id of ENEMY_IDS)
      for (const level of new Set(ENEMIES[id].levels))
        problems.push(
          ...safely(`${id} L${level}`, () => {
            const rng = createRng(level * 7 + 1);
            const s = hero('sousaphone', Math.min(15, level + 2));
            const e = makeEnemy(rng, s, id, level);
            const out: string[] = [];
            if (!(e.maxHp > 0) || !Number.isFinite(e.maxHp)) out.push(`maxHp ${e.maxHp}`);
            for (const k of COMBAT_STATS) if (!Number.isFinite(e.stats[k])) out.push(`${k} ${e.stats[k]}`);
            return [...out, ...autoFight(fight(rng, s, [{ id, level }], { noFlee: true }), rng)];
          }),
        );
    expect(problems).toEqual([]);
  });

  it('every boss can be fought to the end, and every boss move gets used', () => {
    const problems: string[] = [];
    const used = new Set<string>();
    const nameToId = new Map(BOSS_SKILL_IDS.map(id => [SKILLS[id].name, id]));
    for (const boss of BOSS_IDS) {
      const bd = BOSSES[boss];
      const ai = bd.ai;
      // Record the moves the AI picks (charged releases are logged as "unleashes <move>!").
      (bd as { ai: typeof ai }).ai = ctx => {
        const r = ai(ctx);
        used.add(r.skill);
        return r;
      };
      try {
        for (const seed of [1, 2, 3, 4, 5])
          for (const cls of [CLASS_IDS[seed % CLASS_IDS.length]!])
            problems.push(
              ...safely(`${boss} vs ${cls} seed ${seed}`, () => {
                const rng = createRng(seed);
                const s = hero(cls, bd.level, st => {
                  addItem(st, 'gumbo', 3);
                  if (bd.bluesTarget) {
                    st.secondLine = Array.from({ length: 10 }, (_, k) => ({ id: `m${k}`, name: `M${k}` }));
                    st.inTower = true;
                  }
                });
                const b = fight(rng, s, [{ id: boss, level: bd.level }], {
                  boss,
                  noFlee: true,
                  clickPhase: !!bd.bluesTarget,
                });
                const log: string[] = [];
                const before = b.events.length;
                const out = insane({ ...b, events: b.events.slice(0, before) });
                for (let i = 0; i < 300 && !b.over; i++) {
                  if (!b.waiting && !runUntilPlayer(b)) break;
                  for (const e of b.events) if (e.type === 'log') log.push(e.text);
                  out.push(...insane(b));
                  if (b.over) break;
                  const intent = chooseIntent(rng, b);
                  playerAction(
                    b,
                    intent,
                    intent.type !== 'blues' && needsTiming(intent) ? rollAutoTiming(rng) : null,
                  );
                  for (const e of b.events) if (e.type === 'log') log.push(e.text);
                  out.push(...insane(b));
                }
                if (!b.over) out.push(`still going in round ${b.round}`);
                for (const line of log) {
                  const m = /unleashes (.+)!$/.exec(line);
                  if (m && nameToId.has(m[1]!)) used.add(nameToId.get(m[1]!)!);
                }
                return out;
              }),
            );
      } finally {
        (bd as { ai: typeof ai }).ai = ai;
      }
    }
    problems.push(...BOSS_SKILL_IDS.filter(id => !used.has(id)).map(id => `boss move ${id} never got used`));
    expect(problems).toEqual([]);
  });
});
