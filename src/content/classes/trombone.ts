/** Trombone: Tailgate. Drain bruiser, debuffs. */
import type { SkillId } from '@core/ids/combat';
import type { ClassDef, SkillDef, Table } from '@core/types';

export const trombone = {
  id: 'trombone',
  name: 'Trombone',
  title: 'Tailgate',
  role: 'Drain bruiser, debuffs',
  tones: ['BLUE'],
  color: '#3fb6ff',
  base: [65, 20, 12, 8, 9, 8],
  growth: [12, 3, 2.5, 1.5, 1, 1],
  riff: 'tb_riff',
  skills: ['tb_s1', 'tb_s2', 'tb_s3', 'tb_s4', 'tb_s5', 'tb_s6'],
  solo: 'tb_solo',
  legendary: 'Tailgate Royale',
  blurb: 'Smears, growls, and dirges. Wears enemies down and drinks the sorrow back as Heart.',
} as const satisfies ClassDef;

/** Trombone skills: riff, six unlockable skills (levels 1, 3, 5, 7, 10, 13) and the solo. */
export const tromboneSkills = {
  tb_riff: {
    id: 'tb_riff',
    name: 'Slide Swat',
    fp: 0,
    riff: true,
    desc: 'BLUE ×1.0.',
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: 1 }],
  },
  tb_s1: {
    id: 'tb_s1',
    name: 'Smear',
    fp: 6,
    level: 1,
    desc: 'BLUE ×1.3; 40% The Blues.',
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: 1.3, status: { id: 'blues', chance: 0.4 } }],
  },
  tb_s2: {
    id: 'tb_s2',
    name: 'Growl',
    fp: 8,
    level: 3,
    desc: 'BLUE ×1.2; heal for 50% of the damage dealt.',
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: 1.2, drain: 0.5 }],
  },
  tb_s3: {
    id: 'tb_s3',
    name: 'Tailgate Reach',
    fp: 7,
    level: 5,
    desc: "BLUE ×1.6; can't be dodged and ignores half the target's Grit.",
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: 1.6, noDodge: true, ignoreGrit: 0.5 }],
  },
  tb_s4: {
    id: 'tb_s4',
    name: 'Dirge',
    fp: 12,
    level: 7,
    desc: 'The Blues and Rattled on all enemies; your next damaging skill this battle deals +50%.',
    effects: [
      { kind: 'status', id: 'blues', target: 'all' },
      { kind: 'status', id: 'rattled', target: 'all' },
      {
        kind: 'custom',
        run: c => {
          c.actor.flags.dirgeNext = true;
          c.actor.flags.dirgeTurn = c.battle.round;
        },
      },
    ],
  },
  tb_s5: {
    id: 'tb_s5',
    name: 'Gutbucket',
    fp: 18,
    level: 10,
    desc: "BLUE ×(1.5 + 1.5 × the fraction of your Heart that's missing).",
    effects: [{ kind: 'dmg', tone: 'BLUE', mult: c => 1.5 + 1.5 * (1 - c.actor.hp / c.actor.maxHp) }],
  },
  tb_s6: {
    id: 'tb_s6',
    name: 'Cut the Body Loose',
    fp: 22,
    level: 13,
    desc: 'BLUE ×1.4 on all enemies, rising to ×2.2 plus Encore on you if you used Dirge last turn or any enemy has The Blues.',
    effects: [
      { kind: 'dmg', tone: 'BLUE', target: 'all', mult: c => (c.ops.cutLooseReady() ? 2.2 : 1.4) },
      { kind: 'status', id: 'encore', target: 'self', cond: c => c.ops.cutLooseReady() },
    ],
  },
  tb_solo: {
    id: 'tb_solo',
    name: 'Tailgate Jubilee',
    fp: 0,
    solo: true,
    desc: 'Heal 50% of Heart, cleanse yourself, and BLUE ×3.0 on all enemies.',
    effects: [
      { kind: 'heal', pct: 0.5, target: 'self' },
      { kind: 'cleanse', target: 'self' },
      { kind: 'dmg', tone: 'BLUE', mult: 3, target: 'all' },
    ],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
