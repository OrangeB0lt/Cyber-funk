/** Snare Drum: Snare Line. Speed, multi-hit, stun. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const snare = {
  id: 'snare',
  name: 'Snare Drum',
  title: 'Snare Line',
  role: 'Speed, multi-hit, stun',
  tones: ['FUNK'],
  color: '#ffc43d',
  base: [56, 22, 12, 7, 15, 9],
  growth: [10, 3.5, 2.5, 1, 2.5, 1],
  riff: 'sn_riff',
  skills: ['sn_s1', 'sn_s2', 'sn_s3', 'sn_s4', 'sn_s5', 'sn_s6'],
  solo: 'sn_solo',
  legendary: 'Thunderhead Snare',
  blurb: 'Fastest hands in the parade. Rolls, rimshots, and a street beat that stops the grid cold.',
} as const satisfies ClassDef;

/** Snare Drum skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const snareSkills = {
  sn_riff: {
    id: 'sn_riff',
    name: 'Stick Work',
    fp: 0,
    riff: true,
    desc: 'FUNK ×1.0.',
    effects: [{ kind: 'dmg', tone: 'FUNK', mult: 1 }],
  },
  sn_s1: {
    id: 'sn_s1',
    name: 'Paradiddle',
    fp: 6,
    level: 1,
    desc: '4 hits of FUNK ×0.45 on one enemy.',
    effects: [{ kind: 'dmg', tone: 'FUNK', mult: 0.45, hits: 4 }],
  },
  sn_s2: {
    id: 'sn_s2',
    name: 'Rimshot',
    fp: 8,
    level: 3,
    desc: 'FUNK ×1.5 with +30% crit chance; 40% Off-Beat.',
    effects: [
      { kind: 'dmg', tone: 'FUNK', mult: 1.5, critBonus: 0.3, status: { id: 'offbeat', chance: 0.4 } },
    ],
  },
  sn_s3: {
    id: 'sn_s3',
    name: 'Press Roll',
    fp: 10,
    level: 5,
    desc: '6 hits of FUNK ×0.3 on random enemies; each 30% Rattled.',
    effects: [
      {
        kind: 'dmg',
        tone: 'FUNK',
        mult: 0.3,
        hits: 6,
        target: 'rand',
        status: { id: 'rattled', chance: 0.3 },
      },
    ],
  },
  sn_s4: {
    id: 'sn_s4',
    name: 'Cadence',
    fp: 12,
    level: 7,
    desc: 'Gain Up-Tempo and Hyped.',
    effects: [
      { kind: 'status', id: 'uptempo', target: 'self' },
      { kind: 'status', id: 'hyped', target: 'self' },
    ],
  },
  sn_s5: {
    id: 'sn_s5',
    name: 'Flam Tap',
    fp: 16,
    level: 10,
    desc: '2 hits of FUNK ×0.9; the second ignores Grit.',
    effects: [
      { kind: 'dmg', tone: 'FUNK', mult: 0.9 },
      { kind: 'dmg', tone: 'FUNK', mult: 0.9, ignoreGrit: 1, sameTarget: true },
    ],
  },
  sn_s6: {
    id: 'sn_s6',
    name: 'Street Beat',
    fp: 22,
    level: 13,
    desc: 'FUNK ×1.2 on all enemies; 50% Off-Beat on all.',
    effects: [
      { kind: 'dmg', tone: 'FUNK', mult: 1.2, target: 'all', status: { id: 'offbeat', chance: 0.5 } },
    ],
  },
  sn_solo: {
    id: 'sn_solo',
    name: 'Second Line Breakdown',
    fp: 0,
    solo: true,
    desc: '8–12 hits of FUNK ×0.5 on random enemies; each 20% Off-Beat.',
    effects: [
      {
        kind: 'dmg',
        tone: 'FUNK',
        mult: 0.5,
        hits: [8, 12],
        target: 'rand',
        status: { id: 'offbeat', chance: 0.2 },
      },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
