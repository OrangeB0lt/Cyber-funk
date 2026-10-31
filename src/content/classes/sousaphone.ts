/** Sousaphone: Low End. Tank, armor shred. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const sousaphone = {
  id: 'sousaphone',
  name: 'Sousaphone',
  title: 'Low End',
  role: 'Tank, armor shred',
  tones: ['LOW'],
  color: '#9b5cff',
  base: [80, 18, 10, 12, 6, 6],
  growth: [15, 3, 2, 2.5, 1, 1],
  riff: 'su_riff',
  skills: ['su_s1', 'su_s2', 'su_s3', 'su_s4', 'su_s5', 'su_s6'],
  solo: 'su_solo',
  legendary: 'Leviathan Bell',
  blurb: 'The bottom of the band. Slow, enormous, and impossible to move.',
} as const satisfies ClassDef;

/** Sousaphone skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const sousaphoneSkills = {
  su_riff: {
    id: 'su_riff',
    name: 'Bass Bump',
    fp: 0,
    riff: true,
    desc: 'LOW ×1.0.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 1 }],
  },
  su_s1: {
    id: 'su_s1',
    name: 'Oom-Pah',
    fp: 5,
    level: 1,
    desc: '2 hits of LOW ×0.8; 30% Shredded.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 0.8, hits: 2, status: { id: 'shredded', chance: 0.3 } }],
  },
  su_s2: {
    id: 'su_s2',
    name: 'Foundation',
    fp: 8,
    level: 3,
    desc: 'Gain Foundation and heal 15%.',
    effects: [
      { kind: 'status', id: 'foundation', target: 'self' },
      { kind: 'heal', pct: 0.15, target: 'self' },
    ],
  },
  su_s3: {
    id: 'su_s3',
    name: 'Shotgun House Shaker',
    fp: 12,
    level: 5,
    desc: 'LOW ×1.0 on all enemies; 40% Shredded.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 1, target: 'all', status: { id: 'shredded', chance: 0.4 } }],
  },
  su_s4: {
    id: 'su_s4',
    name: 'Bell Wall',
    fp: 10,
    level: 7,
    desc: 'Take 60% less damage until your next turn and reflect half of what you blocked.',
    effects: [{ kind: 'guard', pct: 0.4, reflect: 0.5 }],
  },
  su_s5: {
    id: 'su_s5',
    name: 'Bass Drop',
    fp: 16,
    level: 10,
    desc: 'LOW ×2.4 on one enemy; strips its buffs.',
    effects: [
      { kind: 'strip', target: 'one' },
      { kind: 'dmg', tone: 'LOW', mult: 2.4 },
    ],
  },
  su_s6: {
    id: 'su_s6',
    name: 'Undertow',
    fp: 22,
    level: 13,
    desc: 'LOW ×1.6 on all enemies; Shredded and Rattled on all.',
    effects: [
      { kind: 'dmg', tone: 'LOW', mult: 1.6, target: 'all' },
      { kind: 'status', id: 'shredded', target: 'all' },
      { kind: 'status', id: 'rattled', target: 'all' },
    ],
  },
  su_solo: {
    id: 'su_solo',
    name: 'The Big Muddy',
    fp: 0,
    solo: true,
    desc: 'LOW ×3.2 on all enemies and Shredded on all; you gain Foundation.',
    effects: [
      { kind: 'dmg', tone: 'LOW', mult: 3.2, target: 'all', status: { id: 'shredded', chance: 1 } },
      { kind: 'status', id: 'foundation', target: 'self' },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
