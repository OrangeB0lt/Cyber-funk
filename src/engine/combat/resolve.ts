/**
 * The effect resolver and everything it recurses through: targeting, damage, healing, death,
 * boss hit hooks, and the EffectOps that content functions call.
 *
 * These pieces are mutually recursive (a Countermelody counter-hits through dealHit; Vox's Sample
 * resolves a skill from inside an effect; boss hooks summon and apply statuses), so they live in
 * one module rather than an import cycle.
 *
 * Transliterated from v1 (legacy/src/05_engine.js). Statement and expression order are preserved
 * exactly so seeded fights replay draw-for-draw; see ADR-0003 and the PARITY notes.
 */
import type { StatusId } from '@core/ids/combat';
import type { BossId } from '@core/ids/enemies';
import { clamp, hasStatus, livingEnemies } from '@core/helpers';
import type { Rng } from '@core/rng';
import type {
  Actor,
  Battle,
  BossCtx,
  Castable,
  DamageEffect,
  EffectCtx,
  EffectOps,
  TargetMode,
  TimingGradeDef,
  TimingResult,
} from '@core/types';
import { BASIC_ATTACK, BOSSES, SKILLS, STATUSES, TIMING } from '@content/data';
import { removeItem } from '../inventory';
import { makeEnemy } from './actors';
import { actorById, endBattle, logLine, recordSeen } from './events';
import { applyStatus, applyStatusRaw, cleanse, effStat, removeStatus, stripBuffs } from './statuses';

/** Per-action context threaded through the resolver. */
export interface ResolveCtx {
  /** The action is a skill (not a riff, solo or item): Dirge's bonus applies. */
  isSkill?: boolean;
  /** The action is a SOLO: shatters Pitch Shields. */
  isSolo?: boolean;
  /** Bass Drum: this action lands on beat 4. */
  beat4?: boolean;
  /** Scale damage and healing (Vox's Sample plays your skill back at 70%). */
  scale?: number;
  /** The action is an item from the bag. */
  item?: boolean;
  /** The actor is a bandmate's assist helper. */
  assist?: boolean;
}

/** The fields of a damage effect dealHit reads. Counter-hits and Play the Blues build these ad hoc. */
export type HitSpec = Partial<Omit<DamageEffect, 'kind' | 'cond'>>;

/** The outcome of one hit. */
export interface HitResult {
  /** Damage dealt (0 if dodged or silenced). */
  dmg: number;
  /** It was dodged. */
  dodge?: boolean;
  /** It crit. */
  crit?: boolean;
  /** It hit a weakness. */
  weak?: boolean;
  /** It was resisted. */
  resisted?: boolean;
}

/* ------------------------------------------------------------------ */
/* Ops for content functions                                            */
/* ------------------------------------------------------------------ */

/** EffectOps bound to an actor: what custom effects and boss hooks may do to the battle. */
export function makeOps(b: Battle, actor: Actor): EffectOps {
  return {
    log: (text, cls) => logLine(b, text, cls),
    applyStatus: (target, id, turns) => applyStatus(b, target, id, turns),
    steal(lo, hi) {
      const n = Math.min(b.state.doubloons, b.rng.int(lo, hi));
      if (n > 0) {
        b.state.doubloons -= n;
        b.stolen += n;
        logLine(b, `${actor.name} lifts Ð${n} off you!`);
      }
    },
    stealFunk(n) {
      const p = b.player;
      const took = Math.min(p.fp, n);
      p.fp -= took;
      logLine(b, `${actor.name} claims ${took} Funk in royalties.`);
    },
    copyBuff() {
      const p = b.player;
      const good = p.statuses.filter(st => STATUSES[st.id].kind === 'good');
      if (good.length) {
        const st = b.rng.pick(good);
        applyStatusRaw(b, actor, st.id, st.turns);
        logLine(b, `${actor.name} records your ${STATUSES[st.id].name}.`);
      }
    },
    charge(release, line) {
      actor.charged = release;
      applyStatusRaw(b, actor, 'charging', 1);
      logLine(b, line, 'telegraph');
    },
    summon(defId, level, line) {
      if (b.summonCount >= 6) return;
      const a = makeEnemy(b.rng, b.state, defId, level, { summoned: true });
      b.enemies.push(a);
      b.summonCount++;
      recordSeen(b.state, defId);
      b.events.push({ type: 'summon', actor: a.id });
      logLine(b, line);
    },
    sample() {
      const id = b.lastPlayerSkill;
      if (!id || !SKILLS[id]) {
        resolveSkill(b, actor, SKILLS[BASIC_ATTACK], b.player, null);
        return;
      }
      logLine(b, `${actor.name} samples your ${SKILLS[id].name} and plays it back.`);
      resolveSkill(b, actor, SKILLS[id], b.player, rollAutoTiming(b.rng), { scale: 0.7 });
    },
    pitchShield() {
      actor.shield = { hits: 3 };
      applyStatusRaw(b, actor, 'pitchshield', 99);
      logLine(
        b,
        'PERFECT PITCH SHIELD. The next 3 hits deal 25% unless one lands ON THE ONE or is a SOLO.',
        'boss',
      );
    },
    fermata() {
      b.player.flags.loseTurn = true;
      logLine(b, 'Fermata. Your next turn is held.');
    },
    permStat(k, n) {
      b.state.perm[k] = (b.state.perm[k] || 0) + n;
      b.player.stats[k] += n;
    },
    cutLooseReady() {
      const a = actor;
      return (
        (a.flags.dirgeTurn !== undefined && b.round - a.flags.dirgeTurn <= 1) ||
        livingEnemies(b).some(e => hasStatus(e, 'blues'))
      );
    },
    flee() {
      b.flee = true;
    },
  };
}

/** The context a content function receives while acting as `actor`. */
function effectCtx(b: Battle, actor: Actor, target: Actor | null | undefined): EffectCtx {
  return { battle: b, actor, target: target ?? null, ops: makeOps(b, actor), rng: b.rng };
}

/** The context boss hooks receive. */
export function bossCtx(b: Battle, self: Actor): BossCtx {
  return { battle: b, self, ops: makeOps(b, self), rng: b.rng };
}

/* ------------------------------------------------------------------ */
/* Hit math                                                             */
/* ------------------------------------------------------------------ */

/** Auto-rhythm timing: 20% ONE, 50% pocket, 25% loose, 5% clams. Used by rivals, clones and Sample. */
export function rollAutoTiming(rng: Rng): TimingGradeDef {
  const r = rng.next();
  return r < 0.2 ? TIMING.one : r < 0.7 ? TIMING.pocket : r < 0.95 ? TIMING.loose : TIMING.clams;
}

/** Crit chance: 5% + 0.4% per Mojo (max 35%), plus gear and skill bonuses, +25% In the Pocket. */
export function critChance(a: Actor, fx: HitSpec): number {
  let c = 0.05 + 0.004 * effStat(a, 'mojo');
  c = Math.min(0.35, c);
  c += (a.critBonus || 0) + (fx.critBonus || 0);
  if (hasStatus(a, 'pocket')) c += 0.25;
  return c;
}

/** Dodge chance: 5% ± 1% per Tempo difference (0–25%), plus dodge bonuses (max 50%). */
export function dodgeChance(att: Actor, def: Actor, fx: HitSpec): number {
  if (fx.noDodge) return 0;
  let d = 0.05 + 0.01 * (effStat(def, 'tempo') - effStat(att, 'tempo'));
  d = clamp(d, 0, 0.25);
  d += def.dodgeBonus || 0;
  return clamp(d, 0, 0.5);
}

/**
 * One hit from `att` on `def`. In order: dodge, tone and multipliers, weakness/resistance, timing,
 * crit, grit, variance, then guard, Countermelody, Pitch Shield, Silence, damage, Groove, drain,
 * death, counter-hit and boss hooks.
 */
export function dealHit(
  b: Battle,
  att: Actor,
  def: Actor,
  fx: HitSpec,
  timing: TimingResult | null,
  ctx?: ResolveCtx,
): HitResult | null {
  ctx = ctx || {};
  if (!def.alive) return null;
  // PARITY: chance(0) still draws when the attack can't be dodged.
  if (b.rng.chance(dodgeChance(att, def, fx))) {
    b.events.push({ type: 'dodge', target: def.id });
    logLine(b, `${def.name} dodges!`);
    return { dmg: 0, dodge: true };
  }
  let tone = fx.tone || att.tone || 'HOT';
  let mult = typeof fx.mult === 'function' ? fx.mult(effectCtx(b, att, def)) : fx.mult || 1;
  if (ctx.scale) mult *= ctx.scale;
  let toneMult = 1;
  if (att.side === 'player' && att.nextTone) {
    tone = att.nextTone;
    mult *= 1.2;
    att.nextTone = null;
  }
  if (att.side === 'player' && att.toneBonus && att.toneBonus[tone]) mult *= 1 + att.toneBonus[tone]!;
  if (att.side === 'player' && att.flags.dirgeNext && ctx.isSkill) {
    mult *= 1.5;
    att.flags.dirgeNext = false;
  }
  if (att.side === 'player' && att.bigFour && (ctx.beat4 || fx.forceBeat4)) mult *= 1.6;
  if (fx.machineBonus && def.machine) mult *= fx.machineBonus;
  let weak = false,
    resisted = false;
  if (def.weak === tone) {
    toneMult = 1.5;
    weak = true;
    if (def.side === 'enemy' && def.defId && def.defId !== 'player') {
      const bk = b.state.book[def.defId];
      if (bk && !bk.weak) {
        bk.weak = true;
        b.discoveries.push(def.defId);
      }
    }
  } else if (def.resist === tone && !fx.ignoreResist) {
    toneMult = 0.5;
    resisted = true;
  }
  const timingMult = timing ? timing.mult : 1;
  const crit = b.rng.chance(critChance(att, fx));
  const critMult = crit ? att.critDmg || 1.75 : 1;
  let grit = effStat(def, 'grit');
  if (fx.ignoreGrit) grit *= 1 - fx.ignoreGrit;
  // PARITY: keep this exact expression; the variance draw happens after the crit roll.
  let dmg =
    ((effStat(att, 'chops') * mult * 50) / (50 + grit)) *
    toneMult *
    timingMult *
    critMult *
    b.rng.float(0.9, 1.1);
  if (att.side === 'enemy') dmg *= att.dmgMult || 1;
  // guard
  if (def.guard) {
    const blocked = dmg * (1 - def.guard.pct);
    dmg *= def.guard.pct;
    if (def.guard.reflect && blocked > 0 && att.alive) {
      const ref = Math.max(1, Math.round(blocked * def.guard.reflect));
      att.hp -= ref;
      b.events.push({ type: 'dmg', target: att.id, amount: ref, tone: 'LOW', hpAfter: Math.max(0, att.hp) });
      logLine(b, `${def.name}'s Bell Wall reflects ${ref} back.`);
      // PARITY: the hit continues even if the reflect just killed the attacker.
      checkDeath(b, att);
    }
  }
  // countermelody
  let counter = false;
  if (hasStatus(def, 'countermelody')) {
    dmg *= 0.7;
    removeStatus(b, def, 'countermelody');
    counter = true;
  }
  // pitch shield
  if (def.shield && def.shield.hits > 0) {
    if ((timing && timing.id === 'one') || ctx.isSolo) {
      def.shield = null;
      removeStatus(b, def, 'pitchshield');
      logLine(b, 'The Perfect Pitch Shield SHATTERS!', 'good');
      b.events.push({ type: 'shatter', target: def.id });
    } else {
      dmg *= 0.25;
      def.shield.hits--;
      if (def.shield.hits <= 0) {
        def.shield = null;
        removeStatus(b, def, 'pitchshield');
      }
    }
  }
  if (hasStatus(def, 'silence')) {
    logLine(b, 'Perfect Silence. The Click takes no damage.');
    b.events.push({ type: 'dmg', target: def.id, amount: 0, tone, silent: true, hpAfter: def.hp });
    return { dmg: 0 };
  }
  dmg = Math.max(1, Math.round(dmg));
  def.hp -= dmg;
  b.events.push({
    type: 'dmg',
    target: def.id,
    amount: dmg,
    tone,
    crit,
    weak,
    resisted,
    hpAfter: Math.max(0, def.hp),
  });
  const tag = (crit ? ' CRIT!' : '') + (weak ? ' WEAK!' : '') + (resisted ? ' (resisted)' : '');
  logLine(b, `${att.name} hits ${def.name} for ${dmg}.${tag}`, crit ? 'crit' : '');
  if (def.side === 'player') def.groove = clamp(def.groove + 5, 0, 100);
  if (att.side === 'player' && weak) att.groove = clamp(att.groove + 10, 0, 100);
  if (fx.drain && att.alive) {
    const h = Math.round(dmg * fx.drain);
    healActor(b, att, h);
  }
  checkDeath(b, def);
  if (counter && def.alive && att.alive) {
    logLine(b, `${def.name} answers with a Countermelody!`);
    dealHit(b, def, att, { tone: 'HOT', mult: 1.5 }, null, {});
  }
  if (def.boss && def.alive) bossHpHooks(b, def);
  return { dmg, crit, weak, resisted };
}

/** Heal an actor (Sugar's bonus applies to the player). Returns the amount actually healed. */
export function healActor(b: Battle, a: Actor, amount: number): number {
  if (!a.alive) return 0;
  if (a.side === 'player' && a.healBonus) amount = Math.round(amount * (1 + a.healBonus));
  const real = Math.min(amount, a.maxHp - a.hp);
  a.hp += real;
  if (real > 0) {
    b.events.push({ type: 'heal', target: a.id, amount: real, hpAfter: a.hp });
    logLine(b, `${a.name} regains ${real} Heart.`, 'heal');
  }
  return real;
}

/**
 * Handle an actor at 0 Heart. The player may survive once via Second Wind or a revive item; otherwise
 * the battle is lost. An enemy is cut; the battle is won when none remain.
 */
export function checkDeath(b: Battle, a: Actor): void {
  if (a.hp > 0 || !a.alive) return;
  // An assist helper is a momentary 1-Heart actor on the player's side. If it's cut (a counter or
  // a reflect answering its hit), it just leaves; the battle goes on.
  if (a.assist) {
    a.hp = 0;
    a.alive = false;
    logLine(b, `${a.name} is cut, but the song goes on.`);
    return;
  }
  if (a.side === 'player') {
    if (a.secondWind && !a.onceUsed.secondWind) {
      a.onceUsed.secondWind = true;
      a.hp = 1;
      b.events.push({ type: 'revive', target: a.id, hpAfter: a.hp });
      logLine(b, 'SECOND WIND. You stay on your feet with 1 Heart.', 'good');
      return;
    }
    if (a.revive && !a.onceUsed[a.revive.itemId]) {
      const revive = a.revive;
      a.onceUsed[revive.itemId] = true;
      a.hp = Math.round(a.maxHp * revive.pct);
      b.events.push({ type: 'revive', target: a.id, hpAfter: a.hp });
      removeItem(b.state, revive.itemId, 1);
      a.revive = null;
      logLine(b, revive.line, 'good');
      return;
    }
    a.hp = 0;
    a.alive = false;
    b.events.push({ type: 'death', target: a.id });
    logLine(b, 'You got cut.', 'bad');
    endBattle(b, 'lose');
    return;
  }
  a.hp = 0;
  a.alive = false;
  a.statuses = [];
  b.events.push({ type: 'death', target: a.id });
  if (a.boss) {
    const bd = BOSSES[a.defId as BossId];
    logLine(b, `${a.name}: "${bd.lines.defeat}"`, 'boss');
  } else logLine(b, `${a.name} is cut.`);
  if (!livingEnemies(b).length) endBattle(b, 'win');
}

/** The boss's half-Heart line and hook, and its per-hit hook. */
export function bossHpHooks(b: Battle, a: Actor): void {
  const bd = BOSSES[a.defId as BossId];
  if (!bd) return;
  if (!a.flags.halfLine && a.hp <= a.maxHp * 0.5) {
    a.flags.halfLine = true;
    logLine(b, `${a.name}: "${bd.lines.half}"`, 'boss');
    if (bd.onHalf) bd.onHalf(bossCtx(b, a));
  }
  if (bd.onHp) bd.onHp(bossCtx(b, a));
}

/* ------------------------------------------------------------------ */
/* Targeting and the resolver                                           */
/* ------------------------------------------------------------------ */

/** Who an effect hits. See TargetMode in core/types/effects.ts. */
export function pickTargets(
  b: Battle,
  actor: Actor,
  fx: { target?: TargetMode },
  chosen: Actor | null | undefined,
): Actor[] {
  const foes = actor.side === 'player' ? livingEnemies(b) : [b.player].filter(p => p.alive);
  const mode = fx.target || 'one';
  if (mode === 'self') return [actor];
  if (mode === 'player') return [b.player];
  if (mode === 'all') return foes.slice();
  if (mode === 'rand') return foes.length ? [b.rng.pick(foes)] : [];
  if (mode === 'ally') {
    const allies = (actor.side === 'enemy' ? livingEnemies(b) : [b.player]).filter(x => x !== actor);
    return allies.length ? [b.rng.pick(allies)] : [actor];
  }
  if (mode === 'allies') return actor.side === 'enemy' ? livingEnemies(b) : [b.player];
  if (chosen && chosen.alive && foes.includes(chosen)) return [chosen];
  return foes.length ? [foes[0]!] : [];
}

/**
 * Resolve a skill, move, assist or item: run its effects in order for `actor`, aimed at `chosen`.
 * Stops early when the battle ends.
 */
export function resolveSkill(
  b: Battle,
  actor: Actor,
  skill: Castable,
  chosen: Actor | null | undefined,
  timing: TimingResult | null,
  ctx?: ResolveCtx,
): void {
  ctx = ctx || {};
  ctx.isSkill = !skill.riff && !skill.solo && !ctx.item;
  ctx.isSolo = !!skill.solo;
  const c = effectCtx(b, actor, chosen);
  let lastTarget = chosen;
  for (const fx of skill.effects) {
    if (b.over) break;
    if (fx.cond && !fx.cond(c)) continue;
    if (fx.kind === 'dmg') {
      const hits = Array.isArray(fx.hits) ? b.rng.int(fx.hits[0]!, fx.hits[1]!) : (fx.hits as number) || 1;
      for (let h = 0; h < hits; h++) {
        if (b.over) break;
        let targets =
          fx.sameTarget && lastTarget && lastTarget.alive ? [lastTarget] : pickTargets(b, actor, fx, chosen);
        // PARITY: 'rand' targets are picked a second time (one extra draw per hit), as in v1.
        if (fx.target === 'rand') targets = pickTargets(b, actor, fx, chosen);
        if (!targets.length) break;
        for (const t of targets) {
          if (!t.alive) continue;
          lastTarget = t;
          const r = dealHit(b, actor, t, fx, timing, ctx);
          if (r && !r.dodge && r.dmg > 0 && fx.status && t.alive) {
            applyStatus(b, t, fx.status.id, fx.status.turns, fx.status.chance, fx.status.bossAlt);
          }
        }
      }
      if (fx.recoil && actor.alive) {
        const r = Math.max(1, Math.round(actor.maxHp * fx.recoil));
        actor.hp = Math.max(1, actor.hp - r);
        b.events.push({ type: 'dmg', target: actor.id, amount: r, tone: 'HOT', hpAfter: actor.hp });
        logLine(b, `${actor.name} takes ${r} recoil.`);
      }
    } else if (fx.kind === 'status') {
      const targets = pickTargets(b, actor, fx, chosen);
      targets.forEach(t => applyStatus(b, t, fx.id, fx.turns, fx.chance, fx.bossAlt));
    } else if (fx.kind === 'heal') {
      const targets = fx.target ? pickTargets(b, actor, fx, chosen) : [actor];
      targets.forEach(t => {
        let amt = fx.flat || Math.round(t.maxHp * (fx.pct || 0));
        if (ctx.scale) amt = Math.round(amt * ctx.scale);
        healActor(b, t, amt);
      });
    } else if (fx.kind === 'funk') {
      const t = fx.target === 'player' ? b.player : actor;
      const amt = fx.flat || Math.round(t.maxFp * (fx.pct || 0));
      const real = Math.min(amt, t.maxFp - t.fp);
      t.fp += real;
      if (real > 0) logLine(b, `${t.name} regains ${real} Funk.`, 'heal');
    } else if (fx.kind === 'cleanse') {
      const t = fx.target === 'one' ? chosen || actor : actor;
      const n = cleanse(b, t, 'bad', fx.only);
      if (n) logLine(b, `${t.name} shakes off ${n} status${n > 1 ? 'es' : ''}.`, 'good');
    } else if (fx.kind === 'strip') {
      const targets = fx.target === 'self' ? [actor] : pickTargets(b, actor, fx, chosen);
      targets.forEach(t => stripBuffs(b, t, fx.count));
    } else if (fx.kind === 'guard') {
      actor.guard = { pct: fx.pct, reflect: fx.reflect || 0 };
      logLine(b, `${actor.name} raises a Bell Wall.`, 'good');
    } else if (fx.kind === 'groove') {
      const t = fx.target === 'one' ? b.player : actor;
      if (t.side === 'player') {
        t.groove = clamp(t.groove + fx.amount, 0, 100);
        logLine(b, `${t.name}'s Groove ${fx.amount > 0 ? '+' : ''}${fx.amount}.`);
      }
    } else if (fx.kind === 'custom') {
      fx.run(c);
    }
  }
}

/** Resolve by actor id (for player intents). */
export function targetOf(b: Battle, id: string | undefined): Actor | undefined {
  return actorById(b, id);
}

/** Status ids with engine-implemented mechanics. Content must define a row for each. */
export const MECHANIC_STATUSES: readonly StatusId[] = [
  'scorched',
  'encore',
  'offbeat',
  'swooned',
  'muted',
  'pocket',
  'countermelody',
  'pitchshield',
  'silence',
  'charging',
];
