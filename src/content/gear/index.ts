/** All gear, in v1 order: generated instruments, then threads, charms, mods. */
import type { GearId } from '@core/ids/items';
import type { GearDef, Table } from '@core/types';
import { CHARMS } from './charms';
import { INSTRUMENTS } from './instruments';
import { MODS } from './mods';
import { THREADS } from './threads';

export const GEAR: Table<GearId, GearDef> = { ...INSTRUMENTS, ...THREADS, ...CHARMS, ...MODS };
