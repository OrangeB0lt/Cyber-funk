/** On the One timing grades. The grade multiplies every hit of the action. */
import type { TimingId } from '@core/ids/combat';
import type { Table, TimingGradeDef } from '@core/types';

export const TIMING: Table<TimingId, TimingGradeDef> = {
  one: { id: 'one', label: 'ON THE ONE!', mult: 1.5, groove: 10, color: '#ffc43d' },
  pocket: { id: 'pocket', label: 'IN THE POCKET', mult: 1.2, groove: 0, color: '#39ff88' },
  loose: { id: 'loose', label: 'LOOSE', mult: 1, groove: 0, color: '#00e5ff' },
  clams: { id: 'clams', label: 'CLAMS', mult: 0.6, groove: 0, color: '#ff2bd6' },
};
