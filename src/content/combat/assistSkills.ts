/** Bandmate assists, used every third round by each active bandmate. */
import type { SkillId } from '@core/ids/combat';
import type { SkillDef, Table } from '@core/types';

export const ASSIST_SKILLS = {
  as_sugar: {
    id: 'as_sugar',
    name: 'Call & Response',
    fp: 0,
    desc: 'You regain 15% Heart and 10 Funk.',
    effects: [
      { kind: 'heal', pct: 0.15, target: 'player' },
      { kind: 'funk', flat: 10, target: 'player' },
    ],
  },
  as_static: {
    id: 'as_static',
    name: 'Scratch',
    fp: 0,
    desc: "Strips one enemy's buffs and deals FUNK damage, doubled against machines.",
    effects: [
      { kind: 'strip', target: 'one' },
      { kind: 'dmg', tone: 'FUNK', mult: 1, machineBonus: 2 },
    ],
  },
  as_remy: {
    id: 'as_remy',
    name: 'Rub-a-Dub',
    fp: 0,
    desc: 'FUNK damage to all enemies; 25% Off-Beat.',
    effects: [
      { kind: 'dmg', tone: 'FUNK', mult: 0.7, target: 'all', status: { id: 'offbeat', chance: 0.25 } },
    ],
  },
  as_moses: {
    id: 'as_moses',
    name: 'Strum Hymn',
    fp: 0,
    desc: 'You gain Hyped for 2 turns.',
    effects: [{ kind: 'status', id: 'hyped', target: 'player', turns: 2 }],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
