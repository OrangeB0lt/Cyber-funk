/**
 * The districts whose scenes haven't been ported from v1 yet (the 2.0 migration, P3–P4).
 *
 * This is the one list the completeness tests read. A district on it may have places with nothing to
 * do (the place screen says so), bosses without scenes and quests nobody gives. A district off it must
 * be whole: tools/completeness.test.ts and tests/integration/explore.test.ts check every place, option,
 * boss, quest and story step in it. Porting a district means deleting it from this list and fixing
 * what those tests report. The file goes away at the end of P4.
 *
 * Keep this module free of imports other than types: the e2e suite imports it directly.
 */
import type { ActId } from '@core/ids/story';
import type { DistrictId } from '@core/ids/world';

export const PENDING_DISTRICTS = [
  'storyville',
  'bayou',
  'cemetery',
  'garden',
  'tower',
] as const satisfies readonly DistrictId[];

/** A district still waiting for its scenes. */
export type PendingDistrict = (typeof PENDING_DISTRICTS)[number];

/** Is this district still waiting for its scenes? */
export function isPendingDistrict(d: DistrictId): d is PendingDistrict {
  return (PENDING_DISTRICTS as readonly DistrictId[]).includes(d);
}

/** Is this act still waiting for its scenes? The finale (`done`) comes with the Tower. */
export function isPendingAct(a: ActId): boolean {
  return a === 'done' ? isPendingDistrict('tower') : isPendingDistrict(a);
}
