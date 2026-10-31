/** Saxophone: Honker. Control and charm. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const saxophone = {
  id: 'saxophone',
  name: 'Saxophone',
  title: 'Honker',
  role: 'Control and charm',
  tones: ['FUNK', 'BLUE'],
  color: '#39ff88',
  base: [58, 28, 12, 7, 10, 10],
  growth: [10, 5, 2.5, 1, 1.5, 1.5],
  riff: 'sx_riff',
  skills: ['sx_s1', 'sx_s2', 'sx_s3', 'sx_s4', 'sx_s5', 'sx_s6'],
  solo: 'sx_solo',
  legendary: 'Midnight Honker',
  blurb: 'Honks that knock the grid off-beat and ballads that make the Hush forget to fight.',
} as const satisfies ClassDef;

/** Saxophone skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const saxophoneSkills = {
  sx_riff: {
    id: 'sx_riff',
    name: 'Reed Bite',
    fp: 0,
    riff: true,
    desc: 'FUNK ×1.0.',
    effects: [{ kind: 'dmg', tone: 'FUNK', mult: 1 }],
  },
  sx_s1: {
    id: 'sx_s1',
    name: 'Honk',
    fp: 6,
    level: 1,
    desc: 'FUNK ×1.3; 35% Off-Beat.',
    effects: [{ kind: 'dmg', tone: 'FUNK', mult: 1.3, status: { id: 'offbeat', chance: 0.35 } }],
  },
  sx_s2: {
    id: 'sx_s2',
    name: 'Smoky Ballad',
    fp: 9,
    level: 3,
    desc: 'BLUE ×0.6 and 70% Swooned (on bosses, The Blues instead).',
    effects: [
      { kind: 'dmg', tone: 'BLUE', mult: 0.6, status: { id: 'swooned', chance: 0.7, bossAlt: 'blues' } },
    ],
  },
  sx_s3: {
    id: 'sx_s3',
    name: 'Circular Breath',
    fp: 0,
    level: 5,
    once: true,
    desc: 'Once per battle: restore 40% of max Funk and gain In the Pocket.',
    effects: [
      { kind: 'funk', pct: 0.4 },
      { kind: 'status', id: 'pocket', target: 'self' },
    ],
  },
  sx_s4: {
    id: 'sx_s4',
    name: 'Bar Walk',
    fp: 12,
    level: 7,
    desc: 'Gain Up-Tempo and In the Pocket; FUNK ×1.0 on a random enemy.',
    effects: [
      { kind: 'status', id: 'uptempo', target: 'self' },
      { kind: 'status', id: 'pocket', target: 'self' },
      { kind: 'dmg', tone: 'FUNK', mult: 1, target: 'rand' },
    ],
  },
  sx_s5: {
    id: 'sx_s5',
    name: 'Altissimo',
    fp: 18,
    level: 10,
    desc: 'BLUE ×2.2 on one enemy, ignoring resistance.',
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: 2.2, ignoreResist: true }],
  },
  sx_s6: {
    id: 'sx_s6',
    name: 'Sheets of Sound',
    fp: 24,
    level: 13,
    desc: '6 hits of FUNK ×0.5 on random enemies; each 15% Off-Beat.',
    effects: [
      {
        kind: 'dmg',
        tone: 'FUNK',
        mult: 0.5,
        hits: 6,
        target: 'rand',
        status: { id: 'offbeat', chance: 0.15 },
      },
    ],
  },
  sx_solo: {
    id: 'sx_solo',
    name: 'Midnight Serenade',
    fp: 0,
    solo: true,
    desc: 'BLUE ×2.8 on all enemies; Swooned on non-bosses, The Blues on bosses.',
    effects: [
      {
        kind: 'dmg',
        tone: 'BLUE',
        mult: 2.8,
        target: 'all',
        status: { id: 'swooned', chance: 1, bossAlt: 'blues' },
      },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
