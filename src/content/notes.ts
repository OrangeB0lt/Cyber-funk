/** The six Blue Notes of the blues scale, in scale order. Each boss guards one (BossDef.note). */
import type { NoteId } from '@core/ids/enemies';
import type { NoteDef, Table } from '@core/types';

export const NOTES: Table<NoteId, NoteDef> = {
  C: {
    id: 'C',
    name: 'Root (C)',
    quote: 'Every song starts at the root. So does this city.',
    freq: 261.63,
  },
  Eb: {
    id: 'Eb',
    name: '♭3 (E♭)',
    quote: 'The flat third is where the song starts to hurt, a little, on purpose.',
    freq: 311.13,
  },
  F: {
    id: 'F',
    name: '4th (F)',
    quote: 'The fourth leans forward. It wants to go somewhere.',
    freq: 349.23,
  },
  Gb: {
    id: 'Gb',
    name: '♭5 (G♭)',
    quote: 'The blue note itself. Wrong on paper. Right in the chest.',
    freq: 369.99,
  },
  G: { id: 'G', name: '5th (G)', quote: 'The fifth holds the roof up.', freq: 392 },
  Bb: {
    id: 'Bb',
    name: '♭7 (B♭)',
    quote: 'The flat seventh is the door you leave by, and come back through.',
    freq: 466.16,
  },
};
