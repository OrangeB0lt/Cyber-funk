/**
 * Building actors: the player from the save, enemies and bosses from content.
 */
import type { SkillId } from '@core/ids/combat';
import type { BossId, EnemyId, OpponentId } from '@core/ids/enemies';
import type { Rng } from '@core/rng';
import type { Actor, BossDef, DamageEffect, EnemyDef, GameState } from '@core/types';
import { BOSSES, CLASSES, ENEMIES, ITEMS, SKILLS, SKILL_LEVELS } from '@content/data';
import { ITEM_IDS } from '@core/ids/items';
import { BALANCE, difficultyMods, enemyBaseStats } from '../balance';
import { countItem } from '../inventory';
import { activePassives, derivedStats, unlockedSkills } from '../stats';

/** Process-wide actor counter. Ids only need to be unique within a battle. */
let actorSeq = 0;

/** Fill in every per-battle field with its starting value. */
export function makeActor(base: Partial<Actor> & Pick<Actor, 'side' | 'name' | 'level' | 'stats'>): Actor {
  return Object.assign(
    {
      id: 'a' + ++actorSeq,
      defId: undefined,
      maxHp: 0,
      hp: 0,
      maxFp: 0,
      fp: 0,
      tone: 'HOT',
      weak: null,
      resist: null,
      skills: [],
      riff: null,
      solo: null,
      statuses: [],
      flags: {},
      turnCount: 0,
      guard: null,
      charged: null,
      chopsStack: 0,
      extraActions: 0,
      dodgeBonus: 0,
      onceUsed: {},
      alive: true,
      groove: 0,
      beat: 1,
    } satisfies Omit<Actor, 'side' | 'name' | 'level' | 'stats'>,
    base,
  );
}

/** The tone of a class's riff (its first effect). */
export function riffTone(skill: SkillId) {
  return (SKILLS[skill].effects[0] as DamageEffect).tone!;
}

/** A boss or enemy row, viewed through the fields both share (the rest are optional). */
type OpponentRow = Partial<Omit<EnemyDef, 'id'>> &
  Partial<Omit<BossDef, 'id'>> &
  Pick<EnemyDef, 'name' | 'tone' | 'weak' | 'resist'>;

/** Is this opponent id a boss? */
export function isBossId(id: OpponentId): id is BossId {
  return id in BOSSES;
}

/**
 * Build an enemy or boss actor. Without `level`, an enemy rolls one in its range.
 * `rng` is drawn only for that roll and for a Session Clone's copied skill.
 */
export function makeEnemy(
  rng: Rng,
  s: GameState,
  defId: OpponentId,
  level?: number,
  opts?: { summoned?: boolean },
): Actor {
  opts = opts || {};
  const isBoss = isBossId(defId);
  const d: OpponentRow = isBoss ? BOSSES[defId] : ENEMIES[defId as EnemyId];
  const L = level || (isBoss ? BOSSES[defId].level : rng.int(d.levels![0], d.levels![1]));
  const bs = enemyBaseStats(L);
  const diff = difficultyMods(s);
  const ng = 1 + 0.3 * (s.ngPlus || 0);
  let hp = bs.hp,
    chops = bs.chops,
    grit = bs.grit;
  if (isBoss) {
    hp *= BALANCE.bossHp + BALANCE.bossHpPerL * Math.max(0, L - 3);
    chops *= BALANCE.bossChops + BALANCE.bossChopsPerL * Math.max(0, L - 3);
    grit *= BALANCE.bossGrit;
  }
  if (d.elite) {
    hp *= 1.6;
    chops *= 1.15;
  }
  if (d.hpMult) hp *= d.hpMult;
  if (d.gritMult) grit *= d.gritMult;
  hp = Math.round(hp * diff.hp * ng);
  chops *= ng;
  const a = makeActor({
    side: 'enemy',
    defId,
    name: d.name,
    level: L,
    boss: isBoss,
    elite: !!d.elite,
    machine: !!d.machine,
    hologram: !!d.hologram,
    stats: { chops, grit, tempo: bs.tempo, mojo: bs.mojo },
    maxHp: hp,
    hp,
    maxFp: 0,
    fp: 0,
    tone: d.tone,
    weak: d.weak,
    resist: d.resist || null,
    dodgeBonus: d.dodgeBonus || 0,
    special: d.special,
    specialChance: d.specialChance || 0.3,
    dmgMult: diff.dmg,
    rival: d.rival || null,
    summoned: !!opts.summoned,
    skills: [],
    riff: null,
    solo: null,
  });
  if (d.rival) {
    const c = CLASSES[d.rival];
    a.riff = c.riff;
    a.skills = c.skills.filter((_id, i) => L >= SKILL_LEVELS[i]!);
    a.cls = d.rival;
    a.maxFp = 999;
    a.fp = 999;
  }
  if (d.special === 'clone') {
    const c = CLASSES[s.cls];
    a.clone = true;
    a.riff = c.riff;
    a.cls = s.cls;
    const dmgSkills = c.skills.filter(
      (id, i) => s.level >= SKILL_LEVELS[i]! && SKILLS[id].effects.some(f => f.kind === 'dmg'),
    );
    a.skills = [rng.pick(dmgSkills.length ? dmgSkills : [c.skills[0]])];
    a.name = `Session Clone (${c.name})`;
    a.tone = riffTone(c.riff);
    a.maxFp = 999;
    a.fp = 999;
  }
  return a;
}

/** The first carried item that revives (Gris-Gris), if any. */
function carriedRevive(s: GameState): Actor['revive'] {
  for (const id of ITEM_IDS) {
    const revive = ITEMS[id].revive;
    if (revive && countItem(s, id) > 0) return { itemId: id, pct: revive.pct, line: revive.line };
  }
  return null;
}

/** Build the player's actor from the save: derived stats, unlocked skills and passives. */
export function makePlayerActor(s: GameState): Actor {
  const st = derivedStats(s);
  const c = CLASSES[s.cls];
  const passives = activePassives(s);
  let funkRegen = 0;
  let healBonus = 0;
  let critDmg = 1.75;
  let secondWind = false;
  for (const p of passives) {
    if (p.funkRegen) funkRegen += p.funkRegen;
    if (p.healBonus) healBonus += p.healBonus;
    if (p.critDmg) critDmg = p.critDmg;
    if (p.secondWind) secondWind = true;
  }
  return makeActor({
    side: 'player',
    defId: 'player',
    name: s.name,
    level: s.level,
    cls: s.cls,
    stats: { chops: st.chops, grit: st.grit, tempo: st.tempo, mojo: st.mojo },
    maxHp: st.maxHp,
    hp: Math.min(s.hp, st.maxHp),
    maxFp: st.maxFp,
    fp: Math.min(s.fp, st.maxFp),
    tone: riffTone(c.riff),
    weak: null,
    resist: null,
    riff: c.riff,
    solo: c.solo,
    skills: unlockedSkills(s),
    oneZone: st.oneZone,
    critBonus: st.critBonus,
    statusResist: st.statusResist,
    dodgeBonus: st.dodgeBonus,
    toneBonus: st.toneBonus,
    bigFour: !!c.bigFour,
    secondWind,
    revive: carriedRevive(s),
    healBonus,
    funkRegen,
    critDmg,
  });
}
