/**
 * Effects: the building blocks of every skill, boss move, assist and consumable.
 *
 * A skill is a list of effects resolved in order by one actor-agnostic resolver
 * (engine/combat/resolve.ts). The same resolver runs player skills, enemy moves, bandmate assists
 * and items. That is what lets rivals, Session Clones and Vox Perfecta's Sample reuse player skills.
 *
 * Pick the most specific effect kind that does the job. `custom` is the escape hatch for one-off
 * mechanics; if two skills need the same custom logic, promote it to a real effect kind.
 */
import type { CombatStatKey, SkillId, StatusId, ToneId } from '../ids/combat';
import type { EnemyId } from '../ids/enemies';
import type { Rng } from '../rng';
import type { Actor, Battle, LogClass } from './battle';

/**
 * Who an effect hits, relative to the actor using it.
 * - `one` the chosen target (falls back to the first living foe)
 * - `all` every living foe
 * - `rand` one random living foe
 * - `self` the actor
 * - `player` the player, whoever the actor is
 * - `ally` a random living teammate other than the actor (falls back to the actor)
 * - `allies` every living teammate, including the actor
 */
export type TargetMode = 'one' | 'all' | 'rand' | 'self' | 'player' | 'ally' | 'allies';

/** A status that a damaging hit may inflict when it lands. */
export interface StatusRider {
  /** The status to apply. */
  id: StatusId;
  /** Probability 0–1. Omitted means always. */
  chance?: number;
  /** Duration override in turns. Omitted uses the status's default. */
  turns?: number;
  /** Bosses are immune to Swooned. If set, apply this status to bosses instead. */
  bossAlt?: StatusId;
}

/** Fields every effect may carry. */
export interface EffectBase {
  /** Skip this effect unless the predicate holds at resolve time. */
  cond?: (c: EffectCtx) => boolean;
}

/** Deal damage: chops × mult × tone, timing and crit multipliers, reduced by the target's grit. */
export interface DamageEffect extends EffectBase {
  /** Effect kind. */
  kind: 'dmg';
  /** Damage type. Omitted uses the attacker's tone (enemies) or HOT. */
  tone?: ToneId;
  /** Damage multiplier, or a function of the moment (e.g. scales with missing Heart). Default 1. */
  mult?: number | ((c: EffectCtx) => number);
  /** Number of hits, or an inclusive [min, max] range rolled once. Default 1. */
  hits?: number | readonly [number, number];
  /** Who gets hit. Default `one`. */
  target?: TargetMode;
  /** Re-hit the previous effect's last target while it lives (combo skills). */
  sameTarget?: boolean;
  /** Status inflicted on each landed, damaging hit. */
  status?: StatusRider;
  /** Fraction of the attacker's max Heart lost after the hits (never below 1 Heart). */
  recoil?: number;
  /** Fraction of damage dealt healed back to the attacker. */
  drain?: number;
  /** This attack can't be dodged. */
  noDodge?: boolean;
  /** Fraction of the target's grit ignored (1 = all). */
  ignoreGrit?: number;
  /** Damage isn't halved by the target's resistance. */
  ignoreResist?: boolean;
  /** Extra crit chance added for this effect. */
  critBonus?: number;
  /** Always counts as beat 4 for the Bass Drum's Big Four. */
  forceBeat4?: boolean;
  /** Damage multiplier against machine enemies. */
  machineBonus?: number;
}

/** Apply a status to targets. */
export interface StatusEffect extends EffectBase {
  /** Effect kind. */
  kind: 'status';
  /** The status to apply. */
  id: StatusId;
  /** Who receives it. Default `one`. */
  target?: TargetMode;
  /** Duration override in turns. */
  turns?: number;
  /** Probability 0–1. Omitted means always. */
  chance?: number;
  /** Status applied to bosses instead (Swooned immunity). */
  bossAlt?: StatusId;
}

/** Restore Heart. */
export interface HealEffect extends EffectBase {
  /** Effect kind. */
  kind: 'heal';
  /** Fixed amount. Takes precedence over `pct`. */
  flat?: number;
  /** Fraction of the target's max Heart. */
  pct?: number;
  /** Who is healed. Omitted means the actor. */
  target?: TargetMode;
}

/** Restore Funk (the skill resource). */
export interface FunkEffect extends EffectBase {
  /** Effect kind. */
  kind: 'funk';
  /** Fixed amount. Takes precedence over `pct`. */
  flat?: number;
  /** Fraction of max Funk. */
  pct?: number;
  /** `player` restores the player's Funk (bandmate assists); anything else, the actor's. */
  target?: TargetMode;
}

/** Remove negative statuses. */
export interface CleanseEffect extends EffectBase {
  /** Effect kind. */
  kind: 'cleanse';
  /** `one` cleanses the chosen target; anything else, the actor. */
  target?: TargetMode;
  /** Remove only this status instead of every negative one. */
  only?: StatusId;
}

/** Remove positive statuses (buffs). Silence and Pitch Shield can't be stripped. */
export interface StripEffect extends EffectBase {
  /** Effect kind. */
  kind: 'strip';
  /** Whose buffs to strip. */
  target?: TargetMode;
  /** Strip only the most recent N buffs. Omitted strips all. */
  count?: number;
}

/** Brace: take a fraction of damage until the actor's next turn, optionally reflecting some back. */
export interface GuardEffect extends EffectBase {
  /** Effect kind. */
  kind: 'guard';
  /** Fraction of damage still taken (0.4 = take 40%). */
  pct: number;
  /** Fraction of the blocked damage reflected to the attacker. */
  reflect?: number;
}

/** Change the player's Groove (the SOLO meter). */
export interface GrooveEffect extends EffectBase {
  /** Effect kind. */
  kind: 'groove';
  /** Amount to add (negative drains). Clamped to 0–100. */
  amount: number;
  /** `one` targets the player; anything else, the actor (only players have Groove). */
  target?: TargetMode;
}

/** Escape hatch for one-off mechanics. Gets the full effect context. */
export interface CustomEffect extends EffectBase {
  /** Effect kind. */
  kind: 'custom';
  /** The mechanic. Use `c.ops` for anything that changes the battle beyond the actor. */
  run: (c: EffectCtx) => void;
}

/** Any effect. */
export type Effect =
  | DamageEffect
  | StatusEffect
  | HealEffect
  | FunkEffect
  | CleanseEffect
  | StripEffect
  | GuardEffect
  | GrooveEffect
  | CustomEffect;

/** The kinds of effect the resolver understands. */
export type EffectKind = Effect['kind'];

/** What a content function receives while an effect resolves. */
export interface EffectCtx {
  /** The battle in progress. */
  battle: Battle;
  /** Who is acting. */
  actor: Actor;
  /** The chosen target, if any. */
  target: Actor | null;
  /** Engine capabilities, bound to `actor`. */
  ops: EffectOps;
  /** The battle's random stream. Never use Math.random in content. */
  rng: Rng;
}

/**
 * Engine capabilities available to content functions (custom effects, boss AI hooks).
 * Declared here in core and implemented by the engine, so content never imports the engine.
 * Every method acts on behalf of the actor the ops were created for.
 */
export interface EffectOps {
  /** Write a line to the battle log. */
  log(text: string, cls?: LogClass): void;
  /** Apply a status to an actor (respects charm resistance and boss immunities). */
  applyStatus(target: Actor, id: StatusId, turns?: number): boolean;
  /** Steal between `lo` and `hi` Doubloons from the player; returned if the player wins. */
  steal(lo: number, hi: number): void;
  /** Drain up to `n` Funk from the player. */
  stealFunk(n: number): void;
  /** Copy one of the player's buffs onto the actor. */
  copyBuff(): void;
  /** Spend this turn winding up; next turn, release `release`. Logs `line` as a telegraph. */
  charge(release: SkillId, line: string): void;
  /** Bring a new enemy into the fight (max six summons per battle). */
  summon(id: EnemyId, level: number, line: string): void;
  /** Replay the player's last skill back at them at 70% (Vox Perfecta). */
  sample(): void;
  /** Raise a Perfect Pitch Shield on the actor (Isolde). */
  pitchShield(): void;
  /** The player loses their next turn. */
  fermata(): void;
  /** Permanently raise one of the player's stats (King Cake baby). */
  permStat(stat: CombatStatKey, n: number): void;
  /** True if the actor used Dirge last turn or any enemy has The Blues (Cut the Body Loose). */
  cutLooseReady(): boolean;
  /** End the battle as an escape after this action (Second Line Smoke). */
  flee(): void;
}
