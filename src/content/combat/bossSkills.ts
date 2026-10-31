/** Boss moves. Which one a boss uses each turn is decided by its AI (content/bosses). */
import type { SkillId } from '@core/ids/combat';
import type { SkillDef, Table } from '@core/types';

export const BOSS_SKILLS = {
  b_baton: {
    id: 'b_baton',
    name: 'Baton Strike',
    fp: 0,
    desc: 'A hard swing.',
    effects: [{ kind: 'dmg', mult: 1.3 }],
  },
  b_noisecancel: {
    id: 'b_noisecancel',
    name: 'Noise Cancel',
    fp: 0,
    desc: 'Muted for 2 turns.',
    effects: [{ kind: 'dmg', mult: 0.6, status: { id: 'muted', chance: 1, turns: 2 } }],
  },
  b_perfectpitch: {
    id: 'b_perfectpitch',
    name: 'Perfect Pitch',
    fp: 0,
    desc: 'Muted for 1 turn.',
    effects: [{ kind: 'dmg', mult: 0.9, status: { id: 'muted', chance: 1, turns: 1 } }],
  },
  b_sample: {
    id: 'b_sample',
    name: 'Sample',
    fp: 0,
    desc: 'Replays the last skill you used, back at you, at 70%.',
    effects: [{ kind: 'custom', run: c => c.ops.sample() }],
  },
  b_pitchcorrect: {
    id: 'b_pitchcorrect',
    name: 'Pitch Correction',
    fp: 0,
    desc: 'Gains Foundation.',
    effects: [{ kind: 'status', id: 'foundation', target: 'self' }],
  },
  b_foreclose: {
    id: 'b_foreclose',
    name: 'Foreclose',
    fp: 0,
    desc: 'Shredded.',
    effects: [{ kind: 'dmg', mult: 1.1, status: { id: 'shredded', chance: 1 } }],
  },
  b_audit: {
    id: 'b_audit',
    name: 'Audit',
    fp: 0,
    desc: 'Strips your buffs.',
    effects: [
      { kind: 'dmg', mult: 0.7 },
      { kind: 'strip', target: 'one' },
    ],
  },
  b_clawrake: {
    id: 'b_clawrake',
    name: 'Claw Rake',
    fp: 0,
    desc: '2 hits.',
    effects: [{ kind: 'dmg', mult: 0.85, hits: 2 }],
  },
  b_howlclick: {
    id: 'b_howlclick',
    name: 'Howl of the Click',
    fp: 0,
    desc: 'Muted for 1 turn.',
    effects: [{ kind: 'dmg', mult: 0.7, status: { id: 'muted', chance: 1, turns: 1 } }],
  },
  b_playback: {
    id: 'b_playback',
    name: 'Playback',
    fp: 0,
    desc: 'Summons a Ghost Track.',
    effects: [
      {
        kind: 'custom',
        run: c =>
          c.ops.summon('ghost_track', 2, 'A Ghost Track flickers into the room, an echo of a dead musician.'),
      },
    ],
  },
  b_erase: {
    id: 'b_erase',
    name: 'Erase',
    fp: 0,
    desc: 'Strips your buffs.',
    effects: [
      { kind: 'dmg', mult: 0.8 },
      { kind: 'strip', target: 'one' },
    ],
  },
  b_overdub: {
    id: 'b_overdub',
    name: 'Overdub',
    fp: 0,
    desc: 'Heals 15%.',
    effects: [{ kind: 'heal', pct: 0.15, target: 'self' }],
  },
  b_bowblade: {
    id: 'b_bowblade',
    name: 'Bow Blade',
    fp: 0,
    desc: '2 hits.',
    effects: [{ kind: 'dmg', mult: 0.9, hits: 2 }],
  },
  b_pizzicato: {
    id: 'b_pizzicato',
    name: 'Pizzicato Barrage',
    fp: 0,
    desc: '5 small hits.',
    effects: [{ kind: 'dmg', mult: 0.4, hits: 5 }],
  },
  b_shield: {
    id: 'b_shield',
    name: 'Perfect Pitch Shield',
    fp: 0,
    desc: 'The next 3 hits deal 25% unless one lands ON THE ONE or is a SOLO.',
    effects: [{ kind: 'custom', run: c => c.ops.pitchShield() }],
  },
  b_cadenza_charge: {
    id: 'b_cadenza_charge',
    name: 'Cadenza',
    fp: 0,
    desc: 'Telegraphs for a turn, then a huge hit.',
    effects: [
      {
        kind: 'custom',
        run: c =>
          c.ops.charge(
            'b_cadenza',
            'Isolde raises her bow. The air goes still. "Cadenza." (VAMP to survive it.)',
          ),
      },
    ],
  },
  b_cadenza: {
    id: 'b_cadenza',
    name: 'Cadenza',
    fp: 0,
    desc: 'A huge hit.',
    effects: [{ kind: 'dmg', mult: 3 }],
  },
  b_downbeat: {
    id: 'b_downbeat',
    name: 'Downbeat',
    fp: 0,
    desc: 'A heavy hit.',
    effects: [{ kind: 'dmg', mult: 1.6 }],
  },
  b_fermata: {
    id: 'b_fermata',
    name: 'Fermata',
    fp: 0,
    desc: 'You lose your next turn.',
    effects: [
      { kind: 'dmg', mult: 0.5 },
      { kind: 'custom', run: c => c.ops.fermata() },
    ],
  },
  b_ritardando: {
    id: 'b_ritardando',
    name: 'Ritardando',
    fp: 0,
    desc: 'Rattled.',
    effects: [{ kind: 'dmg', mult: 0.9, status: { id: 'rattled', chance: 1 } }],
  },
  b_tempolock: {
    id: 'b_tempolock',
    name: 'Tempo Lock',
    fp: 0,
    desc: 'Your Groove drops to 0.',
    effects: [
      { kind: 'dmg', mult: 0.6 },
      { kind: 'groove', amount: -100, target: 'one' },
    ],
  },
  b_crescendo_charge: {
    id: 'b_crescendo_charge',
    name: 'Crescendo',
    fp: 0,
    desc: 'A telegraphed countdown into a massive hit that VAMP halves.',
    effects: [
      { kind: 'custom', run: c => c.ops.charge('b_crescendo', 'The orchestra swells... 3... 2... 1...') },
    ],
  },
  b_crescendo: {
    id: 'b_crescendo',
    name: 'Crescendo',
    fp: 0,
    desc: 'A massive hit.',
    effects: [{ kind: 'dmg', mult: 2.8 }],
  },
  b_quantize: {
    id: 'b_quantize',
    name: 'Quantize',
    fp: 0,
    desc: 'Strips buffs and narrows the ONE zone for 2 turns.',
    effects: [
      { kind: 'dmg', mult: 0.8 },
      { kind: 'strip', target: 'one' },
      { kind: 'status', id: 'quantized', target: 'one', turns: 2 },
    ],
  },
  b_clicktrack: {
    id: 'b_clicktrack',
    name: 'Click Track',
    fp: 0,
    desc: 'Muted.',
    effects: [{ kind: 'dmg', mult: 0.7, status: { id: 'muted', chance: 1 } }],
  },
  b_perfecttime: {
    id: 'b_perfecttime',
    name: 'Perfect Time',
    fp: 0,
    desc: 'Heals 8%.',
    effects: [{ kind: 'heal', pct: 0.08, target: 'self' }],
  },
  b_spheres: {
    id: 'b_spheres',
    name: 'Silence of the Spheres',
    fp: 0,
    desc: 'A heavy hit.',
    effects: [{ kind: 'dmg', mult: 1.8 }],
  },
} satisfies Partial<Table<SkillId, SkillDef>>;
