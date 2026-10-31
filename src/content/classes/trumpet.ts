/** Trumpet: Lead Horn. Burst damage, glass cannon. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const trumpet = {
  id: 'trumpet',
  name: 'Trumpet',
  title: 'Lead Horn',
  role: 'Burst damage, glass cannon',
  tones: ['HOT'],
  color: '#ff5a2b',
  base: [55, 25, 14, 6, 12, 8],
  growth: [10, 4, 3, 1, 2, 1],
  riff: 'tr_riff',
  skills: ['tr_s1', 'tr_s2', 'tr_s3', 'tr_s4', 'tr_s5', 'tr_s6'],
  solo: 'tr_solo',
  legendary: 'The Archangel',
  blurb: 'High notes that peel paint off the balconies. Hits hardest, bruises easiest.',
} as const satisfies ClassDef;

/** Trumpet skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const trumpetSkills = {
  tr_riff: {
    id: 'tr_riff',
    name: 'Brass Stab',
    fp: 0,
    riff: true,
    desc: 'HOT ×1.0.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 1 }],
  },
  tr_s1: {
    id: 'tr_s1',
    name: 'Hot Lick',
    fp: 6,
    level: 1,
    desc: 'HOT ×1.5 on one enemy; 30% Scorched.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 1.5, status: { id: 'scorched', chance: 0.3 } }],
  },
  tr_s2: {
    id: 'tr_s2',
    name: 'Shake',
    fp: 9,
    level: 3,
    desc: '3 hits of HOT ×0.6 on random enemies; each 15% Scorched.',
    effects: [
      {
        kind: 'dmg',
        tone: 'HOT',
        mult: 0.6,
        hits: 3,
        target: 'rand',
        status: { id: 'scorched', chance: 0.15 },
      },
    ],
  },
  tr_s3: {
    id: 'tr_s3',
    name: 'Plunger Wah',
    fp: 8,
    level: 5,
    desc: 'HOT ×0.8 and The Blues on one enemy.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 0.8, status: { id: 'blues', chance: 1 } }],
  },
  tr_s4: {
    id: 'tr_s4',
    name: 'Scream Note',
    fp: 16,
    level: 7,
    desc: 'HOT ×2.6 on one enemy; you take 5% of max Heart as recoil.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 2.6, recoil: 0.05 }],
  },
  tr_s5: {
    id: 'tr_s5',
    name: 'Across the River',
    fp: 20,
    level: 10,
    desc: 'HOT ×1.3 on all enemies; you gain Hyped.',
    effects: [
      { kind: 'dmg', tone: 'HOT', mult: 1.3, target: 'all' },
      { kind: 'status', id: 'hyped', target: 'self' },
    ],
  },
  tr_s6: {
    id: 'tr_s6',
    name: 'Triple-Tongue Inferno',
    fp: 24,
    level: 13,
    desc: '4 hits of HOT ×0.9 on one enemy; guaranteed Scorched.',
    effects: [{ kind: 'dmg', tone: 'HOT', mult: 0.9, hits: 4, status: { id: 'scorched', chance: 1 } }],
  },
  tr_solo: {
    id: 'tr_solo',
    name: 'Archangel Call',
    fp: 0,
    solo: true,
    desc: 'HOT ×3.5 on all enemies and Scorched on all; you gain Up-Tempo.',
    effects: [
      { kind: 'dmg', tone: 'HOT', mult: 3.5, target: 'all', status: { id: 'scorched', chance: 1 } },
      { kind: 'status', id: 'uptempo', target: 'self' },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
