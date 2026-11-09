/**
 * The player's side of the pull loop: apply the chosen action, then end the player's turn.
 * Illegal actions (Muted PLAY, not enough Funk, a once-per-battle skill reused…) log why and still
 * use up the turn, as in v1. The UI should offer only legal actions (see legal.ts).
 */
import { clamp, hasStatus, livingEnemies } from '@core/helpers';
import type { BossId } from '@core/ids/enemies';
import type { Battle, PlayerIntent, TimingResult } from '@core/types';
import { BOSSES, ITEMS, SKILLS, TIMING } from '@content/data';
import { countItem, removeItem } from '../inventory';
import { actorById, endBattle, logLine } from './events';
import { bossHpHooks, checkDeath, dealHit, resolveSkill } from './resolve';
import { effStat, removeStatus } from './statuses';
import { endTurn } from './turns';

/** SOLO needs 100 Groove and not being Muted. */
export function playerCanSolo(b: Battle): boolean {
  return b.player.groove >= 100 && !hasStatus(b.player, 'muted');
}

/** Apply the player's action. `timing` is the On the One grade for riffs, damaging skills and solos. */
export function playerAction(b: Battle, action: PlayerIntent, timing: TimingResult | null): void {
  const p = b.player;
  b.waiting = false;
  const beat4 = p.bigFour && p.beat === 4;
  if (action.type === 'riff') {
    const sk = SKILLS[p.riff!];
    resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    p.fp = Math.min(p.maxFp, p.fp + 2);
    p.groove = clamp(p.groove + 20 + ((timing && timing.groove) || 0), 0, 100);
  } else if (action.type === 'play') {
    const sk = SKILLS[action.skillId];
    if (hasStatus(p, 'muted')) {
      logLine(b, "You're Muted. You can't PLAY.");
      return finishPlayerTurn(b, false);
    }
    if (sk.once && p.onceUsed[sk.id]) {
      logLine(b, `${sk.name} is once per battle.`);
      return finishPlayerTurn(b, false);
    }
    if (p.fp < sk.fp) {
      logLine(b, 'Not enough Funk.');
      return finishPlayerTurn(b, false);
    }
    p.fp -= sk.fp;
    if (sk.once) p.onceUsed[sk.id] = true;
    b.lastPlayerSkill = sk.id;
    logLine(b, `${p.name} plays ${sk.name}!`, 'you');
    resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    p.groove = clamp(p.groove + 10 + ((timing && timing.groove) || 0), 0, 100);
  } else if (action.type === 'solo') {
    if (!playerCanSolo(b)) {
      logLine(b, "Can't SOLO right now.");
      return finishPlayerTurn(b, false);
    }
    const sk = SKILLS[p.solo!];
    p.groove = 0;
    logLine(b, `SOLO! ${p.name} tears into ${sk.name}!`, 'solo');
    resolveSkill(b, p, sk, actorById(b, action.targetId), timing, { beat4 });
    if (timing && timing.groove) p.groove = clamp(p.groove + timing.groove, 0, 100);
  } else if (action.type === 'vamp') {
    p.guard = { pct: 0.5, reflect: 0 };
    p.fp = Math.min(p.maxFp, p.fp + Math.round(p.maxFp * 0.15));
    p.groove = clamp(p.groove + 10, 0, 100);
    logLine(b, `${p.name} vamps, holding the groove. (Half damage until your next turn, +15% Funk.)`, 'you');
  } else if (action.type === 'bag') {
    const it = ITEMS[action.itemId];
    if (!it || !countItem(b.state, it.id)) {
      logLine(b, "You don't have that.");
      return finishPlayerTurn(b, false);
    }
    if (it.escape && (b.noFlee || b.enemies.some(e => e.alive && e.boss))) {
      logLine(b, "The smoke won't cover you here. There's no slipping away from this fight.");
      return finishPlayerTurn(b, false);
    }
    removeItem(b.state, it.id, 1);
    logLine(b, `${p.name} uses ${it.name}.`, 'you');
    resolveSkill(b, p, { id: it.id, name: it.name, effects: it.effects ?? [] }, p, null, { item: true });
    if (b.flee) {
      logLine(b, 'Second Line Smoke! You slip away in the crowd.', 'good');
      endBattle(b, 'fled');
      return;
    }
  } else if (action.type === 'split') {
    if (b.noFlee || b.enemies.some(e => e.alive && (e.boss || e.elite))) {
      logLine(b, "You can't SPLIT from this one.");
      return finishPlayerTurn(b, false);
    }
    const avg =
      livingEnemies(b).reduce((t, e) => t + effStat(e, 'tempo'), 0) / Math.max(1, livingEnemies(b).length);
    const ch = clamp(0.5 + 0.02 * (effStat(p, 'tempo') - avg), 0.25, 0.9);
    if (b.rng.chance(ch)) {
      logLine(b, 'You SPLIT. Gone before the downbeat.', 'good');
      endBattle(b, 'fled');
      return;
    }
    logLine(b, `You try to SPLIT (${Math.round(ch * 100)}%) and trip over a go-cup.`);
  } else if (action.type === 'blues') {
    return playTheBlues(b, action.accuracy || 0);
  }
  finishPlayerTurn(b, true);
}

/** Advance the Big Four beat (if the player acted) and end the player's turn. */
export function finishPlayerTurn(b: Battle, acted: boolean): void {
  const p = b.player;
  if (acted && p.bigFour) {
    p.beat = (p.beat % 4) + 1;
    if (p.flags.setBeat) {
      p.beat = p.flags.setBeat;
      p.flags.setBeat = 0;
    }
  }
  if (!b.over) endTurn(b, p);
}

/**
 * The finale's signature move. Breaks Perfect Silence, every second-line marcher strikes for 3% of
 * the boss's max Heart, then the player's own note lands with FUNK ×2(1 + accuracy), ON THE ONE.
 */
export function playTheBlues(b: Battle, accuracy: number): void {
  const p = b.player;
  const click = b.enemies.find(e => e.boss && BOSSES[e.defId as BossId].bluesTarget);
  if (!click || !click.alive) {
    logLine(b, 'There is nothing to play the blues at.');
    return finishPlayerTurn(b, false);
  }
  if (!b.bluesFree && p.groove < 100) {
    logLine(b, 'You need 100 Groove to Play the Blues.');
    return finishPlayerTurn(b, false);
  }
  if (b.bluesFree) b.bluesFree = false;
  else p.groove = 0;
  logLine(b, `${p.name} PLAYS THE BLUES. C... E♭... F... G♭... G... B♭.`, 'solo');
  b.events.push({ type: 'blues', accuracy });
  if (hasStatus(click, 'silence')) {
    removeStatus(b, click, 'silence');
    logLine(b, 'PERFECT SILENCE SHATTERS. The Click can be hurt.', 'good');
    b.events.push({ type: 'shatter', target: click.id });
  }
  const line = b.state.secondLine || [];
  line.forEach(m => {
    if (!click.alive) return;
    const d = Math.max(1, Math.round(click.maxHp * 0.03));
    click.hp -= d;
    b.events.push({ type: 'dmg', target: click.id, amount: d, tone: 'FUNK', hpAfter: Math.max(0, click.hp) });
    logLine(b, `${m.name} strikes for ${d}!`, 'assist');
    checkDeath(b, click);
    if (click.alive) bossHpHooks(b, click);
  });
  if (click.alive) {
    const fx = { tone: 'FUNK' as const, mult: 2.0 * (1 + accuracy), ignoreResist: true };
    logLine(b, `Your own note lands at ${Math.round(accuracy * 100)}% accuracy.`);
    dealHit(b, p, click, fx, TIMING.one, { isSolo: true });
  }
  finishPlayerTurn(b, true);
}
