/**
 * Every skill in one table: class skills (from content/classes), enemy, boss and assist moves.
 * The resolver doesn't care who owns a skill, which is how rivals and clones reuse player skills.
 */
import type { SkillId } from '@core/ids/combat';
import type { SkillDef, Table } from '@core/types';
import { CLASS_SKILLS } from '../classes';
import { ASSIST_SKILLS } from './assistSkills';
import { BOSS_SKILLS } from './bossSkills';
import { ENEMY_SKILLS } from './enemySkills';

export const SKILLS: Table<SkillId, SkillDef> = {
  ...CLASS_SKILLS,
  ...ENEMY_SKILLS,
  ...BOSS_SKILLS,
  ...ASSIST_SKILLS,
};
