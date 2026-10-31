/**
 * What the player may do right now. The UI offers exactly these, so it never re-implements rules
 * (v1 duplicated these checks in its UI layer).
 */
import { hasStatus, livingEnemies } from '@core/helpers';
import type { SkillId } from '@core/ids/combat';
import type { BossId } from '@core/ids/enemies';
import type { Battle } from '@core/types';
import { BOSSES, SKILLS } from '@content/data';
import { playerCanSolo } from './player';

/** A skill as the skill picker shows it. */
export interface SkillChoice {
  /** The skill. */
  id: SkillId;
  /** Can be played now. */
  usable: boolean;
  /** Why not, for a toast. */
  reason?: string;
  /** Needs a target picked when there are several enemies. */
  needsTarget: boolean;
}

/** The actions on offer this turn. */
export interface LegalActions {
  /** Living enemies the player can target. */
  targets: string[];
  /** PLAY is allowed (not Muted). */
  canPlay: boolean;
  /** SOLO is ready. */
  canSolo: boolean;
  /** SOLO needs a target. */
  soloNeedsTarget: boolean;
  /** SPLIT is allowed. */
  canSplit: boolean;
  /** PLAY THE BLUES is available. */
  canBlues: boolean;
  /** The player is Muted. */
  muted: boolean;
  /** Skills for the picker. */
  skills: SkillChoice[];
}

/** Does this skill hit one chosen enemy (so the UI must ask which)? */
export function skillNeedsTarget(id: SkillId): boolean {
  const sk = SKILLS[id];
  return (
    sk.effects.some(f => f.kind === 'dmg' && (!f.target || f.target === 'one')) ||
    sk.effects.some(f => f.kind === 'strip' && f.target === 'one')
  );
}

/** Everything the action bar needs to know. */
export function legalActions(b: Battle): LegalActions {
  const p = b.player;
  const muted = hasStatus(p, 'muted');
  const click = b.clickPhase
    ? b.enemies.find(e => e.boss && BOSSES[e.defId as BossId].bluesTarget)
    : undefined;
  const canBlues = !!click && click.alive && hasStatus(click, 'silence') && (b.bluesFree || p.groove >= 100);
  const solo = p.solo ? SKILLS[p.solo] : null;
  return {
    targets: livingEnemies(b).map(e => e.id),
    canPlay: !muted,
    canSolo: playerCanSolo(b),
    soloNeedsTarget: !!solo && solo.effects.some(f => f.kind === 'dmg' && (!f.target || f.target === 'one')),
    canSplit: !(b.noFlee || b.enemies.some(e => e.alive && (e.boss || e.elite))),
    canBlues,
    muted,
    skills: p.skills.map(id => {
      const sk = SKILLS[id];
      const spent = !!(sk.once && p.onceUsed[id]);
      const reason = p.fp < sk.fp ? 'Not enough Funk.' : spent ? 'Once per battle.' : undefined;
      return { id, usable: !reason, reason, needsTarget: skillNeedsTarget(id) };
    }),
  };
}
