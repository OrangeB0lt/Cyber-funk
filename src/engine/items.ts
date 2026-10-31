/**
 * Using items outside battle, and the shop. (Moved from v1's UI: legacy/src/06_ui_core.js
 * useFieldItem and legacy/src/08_world.js openShop.) The UI shows the results; it decides nothing.
 */
import type { GearId, ItemId, SheetMusicId, ShopItemId } from '@core/ids/items';

import type { DistrictId } from '@core/ids/world';
import type { Rng } from '@core/rng';
import type { GameState } from '@core/types';
import { GEAR, ITEMS, SELL_RATE, SHEET_MUSIC, STATUSES } from '@content/data';
import { priceFor } from './economy';
import { addItem, countItem, removeItem } from './inventory';
import { clampVitals, derivedStats } from './stats';

/** The outcome of using an item from the menu, for the toast. */
export interface FieldUse {
  /** Whether anything happened. */
  used: boolean;
  /** Parts of the message, e.g. "+40 Heart". */
  parts: string[];
  /** The full toast text. */
  message: string;
}

/**
 * Use an item outside battle. Drinks queue a status for the next fight; food restores Heart and
 * Funk; King Cake may hold the baby (+1 Mojo). Battle-only effects do nothing here.
 */
export function useFieldItem(rng: Rng, s: GameState, id: ItemId): FieldUse {
  const it = ITEMS[id];
  if (!it || !countItem(s, id)) return { used: false, parts: [], message: '' };
  if (it.prefight) {
    s.nextFight = Object.assign(s.nextFight || {}, { status: it.prefight.status });
    removeItem(s, id, 1);
    return { used: true, parts: [], message: `${it.name}: ${STATUSES[it.prefight.status].name} next fight.` };
  }
  const st = derivedStats(s);
  const parts: string[] = [];
  (it.effects ?? []).forEach(f => {
    if (f.kind === 'heal') {
      const amt = f.flat || Math.round(st.maxHp * f.pct!);
      const real = Math.min(amt, st.maxHp - s.hp);
      s.hp += real;
      parts.push(`+${real} Heart`);
    }
    if (f.kind === 'funk') {
      const amt = f.flat || Math.round(st.maxFp * f.pct!);
      const real = Math.min(amt, st.maxFp - s.fp);
      s.fp += real;
      parts.push(`+${real} Funk`);
    }
    if (f.kind === 'cleanse') parts.push('statuses cleared (they only last in battle anyway)');
    // PARITY: v1 special-cased King Cake's custom effect outside battle by id.
    if (f.kind === 'custom' && id === 'kingcake') {
      if (rng.next() < 0.1) {
        s.perm.mojo += 1;
        parts.push('you found the baby! +1 Mojo');
      }
    }
  });
  removeItem(s, id, 1);
  clampVitals(s);
  return { used: true, parts, message: `${it.name}: ${parts.join(', ') || 'used'}.` };
}

/* ------------------------------------------------------------------ */
/* Shop                                                                 */
/* ------------------------------------------------------------------ */

/** One line of stock in a shop. */
export interface ShopEntry {
  /** What's for sale. */
  id: ShopItemId;
  /** Override the base price. */
  price?: number;
}

/** A shop row as the player sees it. */
export interface ShopRow {
  /** What's for sale. */
  id: ShopItemId;
  /** Kind of thing. */
  kind: 'item' | 'gear' | 'sheet';
  /** Price after discounts. */
  price: number;
  /** How many owned (items), or 1/0 for gear and sheet music. */
  owned: number;
  /** At the carry limit. */
  maxed: boolean;
  /** Gear above the player's level. */
  levelLocked: boolean;
  /** Can buy right now. */
  canBuy: boolean;
}

/** What kind of shop entry an id is. */
export function shopKind(id: ShopItemId): ShopRow['kind'] {
  return id in GEAR ? 'gear' : id in SHEET_MUSIC ? 'sheet' : 'item';
}

/** The row for one entry: price with discounts, ownership, locks. */
export function shopRow(s: GameState, e: ShopEntry, district: DistrictId): ShopRow {
  const kind = shopKind(e.id);
  const base =
    kind === 'gear'
      ? GEAR[e.id as GearId].price
      : kind === 'sheet'
        ? SHEET_MUSIC[e.id as SheetMusicId].price
        : ITEMS[e.id as ItemId].price;
  const price = priceFor(s, e.price !== undefined ? e.price : base, district);
  const owned =
    kind === 'gear'
      ? s.gearBag.includes(e.id as GearId) || Object.values(s.gear).includes(e.id as GearId)
        ? 1
        : 0
      : kind === 'sheet'
        ? s.sheet.includes(e.id as SheetMusicId)
          ? 1
          : 0
        : countItem(s, e.id as ItemId);
  const max = kind === 'item' ? ITEMS[e.id as ItemId].max : undefined;
  const maxed = !!max && countItem(s, e.id as ItemId) >= max;
  const levelLocked = kind === 'gear' && GEAR[e.id as GearId].level > s.level;
  const canBuy = s.doubloons >= price && !(kind !== 'item' && owned) && !maxed && !levelLocked;
  return { id: e.id, kind, price, owned, maxed, levelLocked, canBuy };
}

/** The outcome of a purchase, for toasts. */
export interface BuyResult {
  /** Bought. */
  ok: boolean;
  /** Toast lines. */
  messages: string[];
}

/**
 * Buy at `price` (as shown). Gear is auto-equipped when its total stats are at least the current
 * piece's (instruments only for your class).
 */
export function buy(s: GameState, id: ShopItemId, price: number): BuyResult {
  if (s.doubloons < price) return { ok: false, messages: ['Not enough Doubloons.'] };
  const kind = shopKind(id);
  if (kind === 'gear') {
    const g = GEAR[id as GearId];
    if (g.level > s.level) return { ok: false, messages: [`Needs level ${g.level}.`] };
    s.doubloons -= price;
    s.gearBag.push(g.id);
    const messages = [`Bought ${g.name}.`];
    const slot = g.slot;
    const curId = s.gear[slot];
    const cur = curId ? GEAR[curId] : null;
    const total = (stats: Record<string, number | undefined>) =>
      Object.values(stats).reduce<number>((a, c) => a + (c ?? 0), 0);
    const better = !cur || total(g.stats) >= total(cur.stats || {});
    if (better && (slot !== 'instrument' || g.cls === s.cls)) {
      s.gear[slot] = g.id;
      clampVitals(s);
      messages.push(`Equipped ${g.name}.`);
    }
    return { ok: true, messages };
  }
  if (kind === 'sheet') {
    s.doubloons -= price;
    s.sheet.push(id as SheetMusicId);
    return { ok: true, messages: [`Learned ${SHEET_MUSIC[id as SheetMusicId].name}.`] };
  }
  const it = ITEMS[id as ItemId];
  if (it.max && countItem(s, it.id) >= it.max) return { ok: false, messages: ['You can only carry one.'] };
  s.doubloons -= price;
  addItem(s, it.id, 1);
  return { ok: true, messages: [`Bought ${it.name}.`] };
}

/** Something the player can sell. */
export interface SellRow {
  /** What. */
  id: ItemId | GearId;
  /** Doubloons received. */
  price: number;
  /** How many. */
  n: number;
  /** Display name. */
  name: string;
  /** Is gear. */
  gear: boolean;
}

/** Sell price: 40% of base, at least Ð1. */
export function sellPrice(base: number): number {
  return Math.max(1, Math.round(base * SELL_RATE));
}

/** Everything sellable: bag items that aren't key or rare, then unequipped non-story gear. */
export function sellables(s: GameState): SellRow[] {
  const items = (Object.keys(s.bag) as ItemId[])
    .filter(id => ITEMS[id] && !ITEMS[id].key && !ITEMS[id].rare)
    .map(id => ({ id, price: sellPrice(ITEMS[id].price), n: s.bag[id]!, name: ITEMS[id].name, gear: false }));
  const gear = s.gearBag
    .filter(id => !Object.values(s.gear).includes(id) && !GEAR[id].story)
    .map(id => ({ id, price: sellPrice(GEAR[id].price), n: 1, name: GEAR[id].name, gear: true }));
  return [...items, ...gear];
}

/** Sell one. */
export function sell(s: GameState, id: ItemId | GearId): void {
  if (id in GEAR) {
    const i = s.gearBag.indexOf(id as GearId);
    if (i >= 0) {
      s.gearBag.splice(i, 1);
      s.doubloons += sellPrice(GEAR[id as GearId].price);
    }
  } else {
    removeItem(s, id as ItemId, 1);
    s.doubloons += sellPrice(ITEMS[id as ItemId].price);
  }
}

export type { ShopItemId };
