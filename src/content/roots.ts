/** Character roots: where you grew up. A stat bonus, starting kit, and a discount at home. */
import type { RootsId } from '@core/ids/characters';
import type { RootsDef, Table } from '@core/types';

export const ROOTS: Table<RootsId, RootsDef> = {
  creole: {
    id: 'creole',
    name: 'Creole',
    home: '7th Ward',
    bonus: { mojo: 2 },
    items: {},
    gear: ['ch_pouch'],
    doubloons: 0,
    blurb: '+2 Mojo. Starts with a Gris-Gris Pouch. Family knows everyone: 5% off in Tremé and the Quarter.',
    flavor: 'Seventh Ward, where every cousin plays something and every porch has an opinion.',
    discount: { districts: ['treme', 'quarter'], mult: 0.95 },
  },
  cajun: {
    id: 'cajun',
    name: 'Cajun',
    home: 'Bayou Lafourche',
    bonus: { grit: 2 },
    items: { boudin: 2 },
    doubloons: 0,
    blurb:
      '+2 Grit. Starts with 2 Boudin Links. Speaks Cajun French with bayou folk: 5% off in the Bayou, plus extra dialogue down the bayou.',
    flavor: 'Bayou Lafourche, where the music came up the water in a pirogue and never left.',
    discount: { districts: ['bayou'], mult: 0.95 },
  },
  yat: {
    id: 'yat',
    name: 'Yat',
    home: 'Irish Channel',
    bonus: { tempo: 2 },
    items: {},
    doubloons: 50,
    blurb: '+2 Tempo. Starts with an extra Ð50. Streetwise: better odds on bluffs and street-event choices.',
    flavor: 'Irish Channel, born and raised. You know which banquettes flood and which bars never close.',
  },
};
