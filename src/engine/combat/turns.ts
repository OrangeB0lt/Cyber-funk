/**
 * The turn machinery: rounds, turn order, assists, per-turn status ticks, enemy turns, and the
 * pull loop the presentation layer drives.
 *
 * The battle is a *pull loop*: `runUntilPlayer` advances enemy turns until the player must act (or
 * the battle ends), the caller collects the events and gets the player's choice, then
 * `playerAction` (player.ts) applies it. The engine never waits on anything.
 */
import type { SkillId } from '@core/ids/combat';
import type { BossId } from '@core/ids/enemies';
import { hasStatus, livingEnemies } from '@core/helpers';
import { restoreRng } from '@core/rng';
import type { Actor, Battle, TimingResult } from '@core/types';
import { BANDMATES, BASIC_ATTACK, BOSSES, SKILLS, STATUSES, TIMING } from '@content/data';
import { makeActor } from './actors';
import { actorById, endBattle, logLine } from './events';
import { bossCtx, checkDeath, healActor, resolveSkill, rollAutoTiming } from './resolve';
import { effStat, removeStatus } from './statuses';

/** Start a new round: turn order by Tempo (with tiny jitter), ambush, extra actions, assists. */
export function startRound(b: Battle): void {
  b.round++;
  const actors = [b.player, ...livingEnemies(b)];
  // Each actor draws its jitter once, in a fixed order, before sorting, so the comparator is pure
  // and every JavaScript engine's sort gives the same order and the same number of draws.
  const speed = new Map(actors.map(a => [a, effStat(a, 'tempo') + (b.rng.next() - 0.5) * 0.01]));
  actors.sort((x, y) => speed.get(y)! - speed.get(x)!);
  if (b.ambush && b.round === 1) {
    const i = actors.indexOf(b.player);
    actors.splice(i, 1);
    actors.push(b.player);
  }
  b.order = actors.map(a => a.id);
  actors.forEach(a => {
    if (a.extraActions) for (let i = 0; i < a.extraActions; i++) b.order.push(a.id);
  });
  b.idx = -1;
  b.events.push({ type: 'round', round: b.round });
  if (b.round % 3 === 0) runAssists(b);
}

/** Every third round, each active bandmate steps in with their assist move. */
export function runAssists(b: Battle): void {
  const s = b.state;
  s.band.active.forEach(id => {
    if (b.over) return;
    const bm = BANDMATES[id];
    if (!bm) return;
    const helper = makeActor({
      side: 'player',
      name: bm.name,
      level: s.level,
      stats: { chops: 8 + 3 * s.level, grit: 10, tempo: 10, mojo: 5 },
      maxHp: 1,
      hp: 1,
      maxFp: 0,
      fp: 0,
      tone: 'FUNK',
      assist: true,
    });
    logLine(b, `${bm.name} assists: ${SKILLS[bm.assist].name}!`, 'assist');
    b.events.push({ type: 'assist', bandmate: id });
    resolveSkill(b, helper, SKILLS[bm.assist], null, TIMING.loose, { assist: true });
  });
}

/**
 * Start-of-turn ticks: clear guard, Scorched burn, Encore heal, Funk regen, boss hooks, then
 * whether the actor can act (charged moves always release; Fermata, Swooned, Off-Beat skip).
 */
export function beginTurn(b: Battle, a: Actor): boolean {
  a.guard = null;
  a.turnCount++;
  if (hasStatus(a, 'scorched')) {
    const d = Math.max(1, Math.round(a.maxHp * 0.06));
    a.hp -= d;
    b.events.push({ type: 'dmg', target: a.id, amount: d, tone: 'HOT', hpAfter: Math.max(0, a.hp) });
    logLine(b, `${a.name} burns for ${d} (Scorched).`);
    checkDeath(b, a);
    if (b.over || !a.alive) return false;
  }
  if (hasStatus(a, 'encore')) healActor(b, a, Math.round(a.maxHp * 0.08));
  if (a.side === 'player' && a.funkRegen) {
    a.fp = Math.min(a.maxFp, a.fp + a.funkRegen);
  }
  if (a.boss) {
    const bd = BOSSES[a.defId as BossId];
    if (bd.onTurnStart) bd.onTurnStart(bossCtx(b, a));
  }
  if (a.charged) return true;
  if (a.flags.loseTurn) {
    a.flags.loseTurn = false;
    logLine(b, `${a.name} is held by the fermata and loses the turn.`);
    return false;
  }
  if (hasStatus(a, 'swooned')) {
    removeStatus(b, a, 'swooned');
    logLine(b, `${a.name} is Swooned and skips the turn.`);
    return false;
  }
  if (hasStatus(a, 'offbeat') && b.rng.chance(a.boss ? 0.25 : 0.5)) {
    logLine(b, `${a.name} stumbles Off-Beat and loses the turn.`);
    return false;
  }
  return true;
}

/** End-of-turn: statuses count down (fresh ones skip a beat; until-triggered ones stay). */
export function endTurn(b: Battle, a: Actor): void {
  a.statuses = a.statuses.filter(st => {
    if (st.fresh) {
      st.fresh = false;
      return true;
    }
    const d = STATUSES[st.id];
    if (d.untilTriggered) return true;
    st.turns--;
    if (st.turns <= 0) {
      b.events.push({ type: 'status', target: a.id, id: st.id, add: false });
      return false;
    }
    return true;
  });
  if (a.charged === null && hasStatus(a, 'charging')) removeStatus(b, a, 'charging');
}

/** An enemy's turn: release a charged move, or pick one (boss AI, rival/clone, signature, basic). */
export function enemyAct(b: Battle, a: Actor): void {
  if (!a.alive || b.over) return;
  if (a.charged) {
    const sk = SKILLS[a.charged];
    a.charged = null;
    removeStatus(b, a, 'charging');
    logLine(b, `${a.name} unleashes ${sk.name}!`, 'boss');
    resolveSkill(b, a, sk, b.player, null);
    return;
  }
  let skillId: SkillId = BASIC_ATTACK,
    telegraph: string | null = null,
    timing: TimingResult | null = null;
  if (a.boss) {
    const flags = { ...a.flags };
    const r = BOSSES[a.defId as BossId].ai(bossCtx(b, a));
    skillId = r.skill;
    telegraph = r.telegraph || null;
    if (a.planned) {
      // The move was announced last turn: it happens as announced, and its telegraph isn't repeated.
      // The AI still ran, so the random draws stay the same; if it chose something else, its flags
      // go back to how they were, so that move stays available for later.
      if (r.skill !== a.planned.skill) a.flags = flags;
      skillId = a.planned.skill;
      telegraph = null;
      a.planned = null;
    }
  } else if (a.rival || a.clone) {
    if (b.rng.chance(a.rival ? 0.6 : 0.5) && a.skills.length) skillId = b.rng.pick(a.skills);
    else skillId = a.riff!;
    timing = rollAutoTiming(b.rng);
  } else if (a.special && b.rng.chance(a.specialChance!)) skillId = a.special as SkillId;
  const sk = SKILLS[skillId] || SKILLS[BASIC_ATTACK];
  if (telegraph) logLine(b, telegraph, 'telegraph');
  if (skillId !== BASIC_ATTACK && !sk.riff) logLine(b, `${a.name} uses ${sk.name}!`, a.boss ? 'boss' : '');
  resolveSkill(b, a, sk, b.player, timing);
}

/**
 * After a boss's turn, look one move ahead: run its AI for its next turn as a dry run (on a copy of
 * the random stream, with its flags restored). If that move is telegraphed, announce it now and
 * lock it in, so the warning comes a turn before the move and the boss keeps its pace. A charged
 * move releasing next turn, or a move already announced, needs no look.
 */
export function planAhead(b: Battle, a: Actor): void {
  if (!a.alive || a.charged || a.planned) return;
  const rng = b.rng;
  const flags = { ...a.flags };
  a.turnCount++;
  b.rng = restoreRng(rng.save());
  let r;
  try {
    r = BOSSES[a.defId as BossId].ai(bossCtx(b, a));
  } finally {
    b.rng = rng;
    a.turnCount--;
    a.flags = flags;
  }
  if (!r.telegraph) return;
  a.planned = { skill: r.skill, telegraph: r.telegraph };
  logLine(b, r.telegraph, 'telegraph');
}

/**
 * Advance until the player must act (returns true) or the battle ends (returns false).
 * A 200-step guard stops runaway loops: it calls the fight off (`callOff`) and returns false.
 */
export function runUntilPlayer(b: Battle): boolean {
  let guard = 0;
  while (!b.over && guard++ < 200) {
    if (b.idx < 0 || b.idx >= b.order.length - 1) {
      startRound(b);
      if (b.over) break;
    }
    b.idx++;
    const a = actorById(b, b.order[b.idx]);
    if (!a || !a.alive) continue;
    b.events.push({ type: 'turn', actor: a.id });
    const canAct = beginTurn(b, a);
    if (b.over) break;
    if (a.side === 'player') {
      if (!canAct) {
        endTurn(b, a);
        continue;
      }
      b.waiting = true;
      return true;
    }
    if (canAct) enemyAct(b, a);
    if (!b.over) endTurn(b, a);
    if (!b.over && a.boss) planAhead(b, a);
  }
  if (!b.over) callOff(b);
  return false;
}

/**
 * Call off a fight that can't reach the player's turn (the turn guard tripped): it ends as `fled`,
 * with no winner and no defeat penalty, so a runaway fight never costs the player anything.
 */
export function callOff(b: Battle): void {
  if (b.over) return;
  b.stalled = true;
  logLine(b, 'The song stalls out. Nobody remembers who was winning, so everybody walks away.');
  endBattle(b, 'fled');
}
