/** Display names for the six stats (v1: STAT_NAMES). Scenes use them for choices like "+1 Heart". */
import type { StatKey } from '@core/ids/combat';

export const STAT_NAMES: Record<StatKey, string> = {
  heart: 'Heart',
  funk: 'Funk',
  chops: 'Chops',
  grit: 'Grit',
  tempo: 'Tempo',
  mojo: 'Mojo',
};
