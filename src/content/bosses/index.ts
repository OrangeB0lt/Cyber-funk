/** Every boss, in story order. */
import type { BossId } from '@core/ids/enemies';
import type { BossDef, Table } from '@core/types';
import { captainHush } from './captain_hush';
import { voxPerfecta } from './vox_perfecta';
import { mrLedger } from './mr_ledger';
import { rougarou } from './rougarou';
import { archivist } from './archivist';
import { isolde } from './isolde';
import { conductor } from './conductor';
import { theClick } from './the_click';

export const BOSSES: Table<BossId, BossDef> = {
  captain_hush: captainHush,
  vox_perfecta: voxPerfecta,
  mr_ledger: mrLedger,
  rougarou: rougarou,
  archivist: archivist,
  isolde: isolde,
  conductor: conductor,
  the_click: theClick,
};
