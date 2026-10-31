/** Every non-boss enemy. Key order matters (spar pools iterate it), so keep this merge order. */
import type { EnemyId } from '@core/ids/enemies';
import type { EnemyDef, Table } from '@core/types';
import { tremeEnemies } from '../districts/treme/enemies';
import { quarterEnemies } from '../districts/quarter/enemies';
import { storyvilleEnemies } from '../districts/storyville/enemies';
import { bayouEnemies } from '../districts/bayou/enemies';
import { cemeteryEnemies } from '../districts/cemetery/enemies';
import { gardenEnemies } from '../districts/garden/enemies';
import { towerEnemies } from '../districts/tower/enemies';
import { RIVALS } from './rivals';
import { SUMMONS } from './summons';

export const ENEMIES: Table<EnemyId, EnemyDef> = {
  ...tremeEnemies,
  ...quarterEnemies,
  ...storyvilleEnemies,
  ...bayouEnemies,
  ...cemeteryEnemies,
  ...gardenEnemies,
  ...towerEnemies,
  ...SUMMONS,
  ...RIVALS,
};
