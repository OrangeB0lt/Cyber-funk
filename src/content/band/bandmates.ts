/** Bandmates you can recruit. Two can be active: each assists every third round and adds a passive. */
import type { BandmateId } from '@core/ids/band';
import type { BandmateDef, Table } from '@core/types';

export const BANDMATES: Table<BandmateId, BandmateDef> = {
  sugar: {
    id: 'sugar',
    name: 'Sugar Desmarais',
    inst: 'vocals',
    color: '#ff6ad5',
    assist: 'as_sugar',
    passive: { healBonus: 0.1 },
    passiveDesc: '+10% healing received',
    blurb:
      'Vocalist. Won the Cutting Contest for her and she sang the whole way home. Big voice, bigger laugh, zero patience for licensed jingles.',
    arc: 'Sugar sang backup on MoodSync tracks for two years before she quit. "They pitched my voice to a grid," she says. "I pitched their grid to the river."',
  },
  static: {
    id: 'static',
    name: '"Static" Okafor',
    inst: 'cassette deck',
    color: '#00e5ff',
    assist: 'as_static',
    passive: { doubloonBonus: 0.1 },
    passiveDesc: '+10% Doubloons',
    blurb:
      "Cassette-deck DJ and hacker. Got him out of a Metronome contract and he's been scratching the Hush's frequencies ever since.",
    arc: 'Static built the Click\'s first test encoder as a Metronome intern. He\'s been trying to break it ever since. "Every grid has a seam," he says. "I know where I left mine."',
  },
  remy: {
    id: 'remy',
    name: 'Remy Guidry',
    inst: 'frottoir',
    color: '#39ff88',
    assist: 'as_remy',
    passive: { dodgeBonus: 0.05 },
    passiveDesc: '+5% dodge',
    blurb:
      "Rubboard player from Manchac. Defended the Fais Do-Do with him and he hasn't stopped playing since. Mais, he never does.",
    arc: 'Remy\'s grand-père played frottoir on the same floor of the Fais Do-Do for sixty years. "The gators took the dock," Remy says. "They don\'t get the dancehall."',
  },
  moses: {
    id: 'moses',
    name: 'Brother Moses Valcour',
    inst: 'banjo',
    color: '#ffc43d',
    assist: 'as_moses',
    passive: { funkRegen: 1 },
    passiveDesc: '+1 Funk per turn',
    blurb:
      'Banjo player and hymn-leader. Laid the restless haints to rest with him and he plays for the dead as sweet as the living.',
    arc: 'Brother Moses lost his whole band to the first Mute raids. He kept playing in the cemetery so they\'d have somewhere to listen. "Dead folks got good ears," he says. "Better than Metronome\'s."',
  },
};
