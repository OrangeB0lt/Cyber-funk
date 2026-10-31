/**
 * The three save slots on this device. Each slot is one localStorage key holding a save envelope,
 * plus sync bookkeeping for the cloud: the server revision this device's copy is based on, and whether
 * the device has changes the server hasn't seen. A dirty slot with no save is a delete waiting to sync.
 */
import { SAVE_SLOT_IDS, type SaveSlotId } from '@core/ids/saves';
import { decodeSave, summarize, type LoadError, type SaveSummary } from './format';
import { browserKv, type KeyValue, type SaveStorage } from './storage';

/** localStorage key of a slot's save. */
export const slotKey = (slot: SaveSlotId) => `cyberfunk_save_v2:${slot}`;
/** localStorage key of a slot's sync bookkeeping. */
export const syncKey = (slot: SaveSlotId) => `cyberfunk_sync_v2:${slot}`;

/** Sync bookkeeping for one slot. */
export interface SyncMeta {
  /** The server revision this device's copy is based on (null: never synced). */
  baseRevision: number | null;
  /** The device has changes (a write or a delete) the server hasn't seen. */
  dirty: boolean;
}

/** What a slot holds. */
export interface SlotInfo {
  /** The slot. */
  slot: SaveSlotId;
  /** Who and how far (null when empty or unreadable). */
  summary: SaveSummary | null;
  /** When it was saved (ISO time). */
  savedAt: string | null;
  /** Why the stored text can't be loaded (null when empty or readable). */
  problem: Exclude<LoadError, 'empty'> | null;
}

/** The device's save slots. */
export class SaveSlots {
  /** The slot the running game saves to. */
  active: SaveSlotId = 1;
  private readonly listeners = new Set<(slot: SaveSlotId) => void>();

  constructor(readonly kv: KeyValue = browserKv) {}

  /** Storage for one slot. Writes and clears are local changes: they mark the slot dirty. */
  storage(slot: SaveSlotId): SaveStorage {
    return {
      read: () => this.kv.get(slotKey(slot)),
      write: raw => {
        const ok = this.kv.set(slotKey(slot), raw);
        if (ok) this.touch(slot);
        return ok;
      },
      clear: () => {
        this.kv.remove(slotKey(slot));
        this.touch(slot);
      },
    };
  }

  /** The active slot's storage: what the Session saves through. */
  readonly current: SaveStorage = {
    read: () => this.storage(this.active).read(),
    write: raw => this.storage(this.active).write(raw),
    clear: () => this.storage(this.active).clear(),
  };

  /** What a slot holds. */
  info(slot: SaveSlotId): SlotInfo {
    const r = decodeSave(this.kv.get(slotKey(slot)));
    if (r === 'empty') return { slot, summary: null, savedAt: null, problem: null };
    if (typeof r === 'string') return { slot, summary: null, savedAt: null, problem: r };
    return { slot, summary: summarize(r.game), savedAt: r.savedAt, problem: null };
  }

  /** Every slot, in order. */
  all(): SlotInfo[] {
    return SAVE_SLOT_IDS.map(s => this.info(s));
  }

  /** Sync bookkeeping. A save that was never synced counts as a local change. */
  meta(slot: SaveSlotId): SyncMeta {
    const raw = this.kv.get(syncKey(slot));
    if (raw) {
      try {
        const m = JSON.parse(raw) as Partial<SyncMeta>;
        return {
          baseRevision: typeof m.baseRevision === 'number' ? m.baseRevision : null,
          dirty: m.dirty === true,
        };
      } catch {
        // unreadable bookkeeping: fall through to the default
      }
    }
    return { baseRevision: null, dirty: this.kv.get(slotKey(slot)) !== null };
  }

  /** Update sync bookkeeping. */
  setMeta(slot: SaveSlotId, meta: SyncMeta): void {
    this.kv.set(syncKey(slot), JSON.stringify(meta));
  }

  /** Take the server's copy (null: the server has none). Not a local change, so the slot stays clean. */
  adopt(slot: SaveSlotId, raw: string | null, revision: number | null): void {
    if (raw === null) this.kv.remove(slotKey(slot));
    else this.kv.set(slotKey(slot), raw);
    this.setMeta(slot, { baseRevision: revision, dirty: false });
    this.emit(slot);
  }

  /** Forget every slot's server revision (unlinking this device from a player). */
  forgetRevisions(): void {
    for (const s of SAVE_SLOT_IDS) {
      const m = this.meta(s);
      this.setMeta(s, { baseRevision: null, dirty: m.dirty || this.kv.get(slotKey(s)) !== null });
    }
  }

  /** Hear about any change to a slot. Returns the unsubscribe function. */
  subscribe(fn: (slot: SaveSlotId) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private touch(slot: SaveSlotId): void {
    this.setMeta(slot, { ...this.meta(slot), dirty: true });
    this.emit(slot);
  }

  private emit(slot: SaveSlotId): void {
    for (const fn of this.listeners) fn(slot);
  }
}
