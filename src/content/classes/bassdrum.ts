/** Bass Drum: The Heartbeat. Heavy hitter, Big Four counter. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const bassdrum = {
  id: 'bassdrum',
  name: 'Bass Drum',
  title: 'The Heartbeat',
  role: 'Heavy hitter, Big Four counter',
  tones: ['LOW', 'FUNK'],
  color: '#b14aff',
  base: [70, 20, 14, 9, 7, 7],
  growth: [13, 3, 3, 2, 1, 1],
  riff: 'bd_riff',
  skills: ['bd_s1', 'bd_s2', 'bd_s3', 'bd_s4', 'bd_s5', 'bd_s6'],
  solo: 'bd_solo',
  legendary: 'The Big Four',
  bigFour: true,
  blurb: 'Every action counts 1-2-3-4. Land the hit on four and the whole street feels it.',
} as const satisfies ClassDef;

/** Bass Drum skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const bassdrumSkills = {
  bd_riff: {
    id: 'bd_riff',
    name: 'Boom',
    fp: 0,
    riff: true,
    desc: 'LOW ×1.1.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 1.1 }],
  },
  bd_s1: {
    id: 'bd_s1',
    name: 'Cymbal Crash',
    fp: 6,
    level: 1,
    desc: 'FUNK ×0.9 on all enemies; 25% Off-Beat.',
    effects: [
      { kind: 'dmg', tone: 'FUNK', mult: 0.9, target: 'all', status: { id: 'offbeat', chance: 0.25 } },
    ],
  },
  bd_s2: {
    id: 'bd_s2',
    name: 'Heartbeat',
    fp: 8,
    level: 3,
    tone: 'SWEET',
    desc: 'Heal 10% and gain Encore.',
    effects: [
      { kind: 'heal', pct: 0.1, target: 'self' },
      { kind: 'status', id: 'encore', target: 'self' },
    ],
  },
  bd_s3: {
    id: 'bd_s3',
    name: 'Parade Stomp',
    fp: 10,
    level: 5,
    desc: 'LOW ×1.4; 50% Shredded.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 1.4, status: { id: 'shredded', chance: 0.5 } }],
  },
  bd_s4: {
    id: 'bd_s4',
    name: 'Count Off',
    fp: 6,
    level: 7,
    desc: 'Set the Big Four counter to 4 and gain Hyped.',
    effects: [
      {
        kind: 'custom',
        run: c => {
          c.actor.flags.setBeat = 4;
        },
      },
      { kind: 'status', id: 'hyped', target: 'self' },
    ],
  },
  bd_s5: {
    id: 'bd_s5',
    name: 'Raise the Rafters',
    fp: 18,
    level: 10,
    desc: 'LOW ×1.3 on all enemies; 40% Rattled.',
    effects: [{ kind: 'dmg', tone: 'LOW', mult: 1.3, target: 'all', status: { id: 'rattled', chance: 0.4 } }],
  },
  bd_s6: {
    id: 'bd_s6',
    name: 'Twin Thunder',
    fp: 24,
    level: 13,
    desc: 'One enemy takes LOW ×1.6, then FUNK ×1.6.',
    effects: [
      { kind: 'dmg', tone: 'LOW', mult: 1.6 },
      { kind: 'dmg', tone: 'FUNK', mult: 1.6, sameTarget: true },
    ],
  },
  bd_solo: {
    id: 'bd_solo',
    name: 'Thunder on Rampart',
    fp: 0,
    solo: true,
    desc: 'LOW ×3.4 on all enemies, always counted as beat 4; Rattled on all.',
    effects: [
      {
        kind: 'dmg',
        tone: 'LOW',
        mult: 3.4,
        target: 'all',
        forceBeat4: true,
        status: { id: 'rattled', chance: 1 },
      },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
