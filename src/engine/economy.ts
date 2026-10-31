/** Prices. Shops call priceFor for every listed price so roots discounts apply everywhere. */
import type { DistrictId } from '@core/ids/world';
import type { GameState } from '@core/types';
import { ROOTS } from '@content/data';

/** A base price after the player's home-district discount, rounded. */
export function priceFor(s: Readonly<GameState>, basePrice: number, district: DistrictId): number {
  let p = basePrice;
  const discount = ROOTS[s.roots].discount;
  if (discount && discount.districts.includes(district)) p *= discount.mult;
  return Math.round(p);
}
