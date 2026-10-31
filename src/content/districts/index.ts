/** The districts of Neon Orleans, in travel and story order. */
import type { DistrictId } from '@core/ids/world';
import type { DistrictDef, Table } from '@core/types';
import { treme } from './treme/district';
import { quarter } from './quarter/district';
import { storyville } from './storyville/district';
import { bayou } from './bayou/district';
import { cemetery } from './cemetery/district';
import { garden } from './garden/district';
import { tower } from './tower/district';

export const DISTRICTS: Table<DistrictId, DistrictDef> = {
  treme: treme,
  quarter: quarter,
  storyville: storyville,
  bayou: bayou,
  cemetery: cemetery,
  garden: garden,
  tower: tower,
};
