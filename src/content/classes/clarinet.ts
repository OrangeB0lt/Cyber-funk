/** Clarinet: Licorice Stick. Healer, buffer, agile. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const clarinet = {
  id: 'clarinet',
  name: 'Clarinet',
  title: 'Licorice Stick',
  role: 'Healer, buffer, agile',
  tones: ['HOT', 'SWEET'],
  color: '#ff6ad5',
  base: [52, 30, 11, 6, 13, 9],
  growth: [9, 5, 2, 1, 2, 1.5],
  riff: 'cl_riff',
  skills: ['cl_s1', 'cl_s2', 'cl_s3', 'cl_s4', 'cl_s5', 'cl_s6'],
  solo: 'cl_solo',
  legendary: 'The Licorice Saint',
  blurb: 'Quick, sweet, and hard to pin down. Heals, buffs, and counters with a high trill.',
} as const satisfies ClassDef;

/** Clarinet skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const clarinetSkills = {
  cl_riff: {
    id: 'cl_riff',
    name: 'Noodle',
    fp: 0,
    riff: true,
    desc: 'HOT ×1.0 with +10% crit chance.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 1, critBonus: 0.1 }],
  },
  cl_s1: {
    id: 'cl_s1',
    name: 'Sweet Trill',
    fp: 6,
    level: 1,
    tone: 'SWEET',
    desc: 'Heal 30% of max Heart.',
    effects: [{ kind: 'heal', pct: 0.3, target: 'self' }],
  },
  cl_s2: {
    id: 'cl_s2',
    name: 'Noodle Run',
    fp: 7,
    level: 3,
    desc: '3 hits of HOT ×0.5 on one enemy; +15% crit chance.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 0.5, hits: 3, critBonus: 0.15 }],
  },
  cl_s3: {
    id: 'cl_s3',
    name: 'Chalumeau',
    fp: 8,
    level: 5,
    tone: 'SWEET',
    desc: 'Cleanse your negative statuses; Foundation for 2 turns.',
    effects: [
      { kind: 'cleanse', target: 'self' },
      { kind: 'status', id: 'foundation', target: 'self', turns: 2 },
    ],
  },
  cl_s4: {
    id: 'cl_s4',
    name: 'Countermelody',
    fp: 10,
    level: 7,
    desc: 'The next attack on you deals 30% less, and you counter with HOT ×1.5.',
    effects: [{ kind: 'status', id: 'countermelody', target: 'self' }],
  },
  cl_s5: {
    id: 'cl_s5',
    name: 'Woodshed',
    fp: 14,
    level: 10,
    desc: 'Gain Hyped, In the Pocket, and Up-Tempo.',
    effects: [
      { kind: 'status', id: 'hyped', target: 'self' },
      { kind: 'status', id: 'pocket', target: 'self' },
      { kind: 'status', id: 'uptempo', target: 'self' },
    ],
  },
  cl_s6: {
    id: 'cl_s6',
    name: 'Clarion Cascade',
    fp: 22,
    level: 13,
    desc: 'HOT ×1.4 on all enemies; heal 25%.',
    effects: [
      { kind: 'dmg', tone: 'HOT', mult: 1.4, target: 'all' },
      { kind: 'heal', pct: 0.25, target: 'self' },
    ],
  },
  cl_solo: {
    id: 'cl_solo',
    name: 'High Society',
    fp: 0,
    solo: true,
    desc: 'Full heal and cleanse, HOT ×2.6 on all enemies, and Encore on you.',
    effects: [
      { kind: 'heal', pct: 1, target: 'self' },
      { kind: 'cleanse', target: 'self' },
      { kind: 'dmg', tone: 'HOT', mult: 2.6, target: 'all' },
      { kind: 'status', id: 'encore', target: 'self' },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
