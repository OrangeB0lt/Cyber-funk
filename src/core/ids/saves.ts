/** Ids for save slots. */

/** The save slots a player can keep (title screen → Continue / New Game). */
export const SAVE_SLOT_IDS = [1, 2, 3] as const;
/** A save slot. */
export type SaveSlotId = (typeof SAVE_SLOT_IDS)[number];

/** Is this a save slot number? (Route params and storage keys arrive as plain numbers.) */
export function isSaveSlot(n: unknown): n is SaveSlotId {
  return (SAVE_SLOT_IDS as readonly unknown[]).includes(n);
}
