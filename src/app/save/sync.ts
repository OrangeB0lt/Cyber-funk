/**
 * Cloud sync for the save slots: offline-first. The game always saves to the device (slots.ts) and
 * never waits on the network; this class uploads changed slots in the background, downloads what
 * other devices saved, and reports conflicts for the player to settle.
 *
 * Per slot, the device remembers the server revision its copy is based on and whether it has
 * changes the server hasn't seen (slots.ts SyncMeta). That's enough to decide everything:
 *
 *   server revision = base          nothing to fetch; upload if the device has changes
 *   server moved on, device clean   take the server's copy
 *   server moved on, device dirty   conflict, unless the server's copy is a deletion (device wins)
 *
 * A slot the running game is using is never replaced underneath it: a newer server copy becomes
 * a conflict, and the player chooses. See docs/architecture/server.md.
 */
import { SAVE_SLOT_IDS, type SaveSlotId } from '@core/ids/saves';
import type { CloudClient, HistoryEntry } from './cloud';
import { formatPlayerCode, parsePlayerCode, type RemoteSlot } from './protocol';
import type { SaveSlots } from './slots';
import type { KeyValue } from './storage';

/** localStorage key of this device's player. */
export const PLAYER_KEY = 'cyberfunk_player';

/** This device's anonymous player. */
interface Player {
  /** Server id. */
  id: string;
  /** The secret (the player code without its formatting). */
  secret: string;
}

/** Connection state. */
export type CloudMode = 'off' | 'checking' | 'online' | 'offline';

/** How a slot stands with the cloud. */
export type SlotSyncState = 'local' | 'synced' | 'pending' | 'conflict';

/** What CloudSync needs. */
export interface SyncDeps {
  /** The device's slots. */
  slots: SaveSlots;
  /** The API (null: cloud saves are off in this build). */
  api: CloudClient | null;
  /** Where the player is remembered. */
  kv: KeyValue;
  /** Is the running game saving to this slot? (Its slot is never replaced underneath it.) */
  isPlaying: (slot: SaveSlotId) => boolean;
  /** Something about sync changed (status, conflicts, the player). */
  onChange: () => void;
  /** A slot needs the player to choose between this device's copy and the server's. */
  onConflict: (slot: SaveSlotId) => void;
  /** Wait before uploading after a save, so a burst of saves sends one request. */
  debounceMs?: number;
}

/** Longest wait between retries while offline. */
const MAX_BACKOFF = 5 * 60_000;

/** The sync engine. */
export class CloudSync {
  /** Connection state. */
  mode: CloudMode;
  /** Slots waiting for the player to choose, with what the server holds. */
  readonly conflicts = new Map<SaveSlotId, RemoteSlot>();
  /** Slots the server refused (a save it can't load); not retried until they change. */
  private readonly rejected = new Set<SaveSlotId>();
  private player: Player | null;
  private creating: Promise<Player | null> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private backoff = 2000;
  private flushing: Promise<void> | null = null;
  private again = false;

  constructor(private readonly deps: SyncDeps) {
    this.mode = deps.api ? 'checking' : 'off';
    this.player = deps.api ? readPlayer(deps.kv) : null;
    deps.slots.subscribe(slot => {
      this.rejected.delete(slot);
      if (this.deps.slots.meta(slot).dirty) this.schedule();
    });
  }

  /** Cloud saves exist in this build. */
  get enabled(): boolean {
    return this.deps.api !== null;
  }

  /** This device is linked to a player. */
  get linked(): boolean {
    return this.player !== null;
  }

  /** The player code to show, once this device has a player. */
  get code(): string | null {
    return this.player ? formatPlayerCode(this.player.secret) : null;
  }

  /** Slots with changes the server hasn't seen. */
  get pending(): number {
    return SAVE_SLOT_IDS.filter(s => this.slotState(s) === 'pending').length;
  }

  /** How a slot stands with the cloud. */
  slotState(slot: SaveSlotId): SlotSyncState {
    if (!this.enabled) return 'local';
    if (this.conflicts.has(slot)) return 'conflict';
    const m = this.deps.slots.meta(slot);
    if (m.dirty && !this.rejected.has(slot)) {
      return this.linked || this.deps.slots.storage(slot).read() !== null ? 'pending' : 'local';
    }
    return m.baseRevision !== null && this.linked ? 'synced' : 'local';
  }

  /** Boot: see if the server is there, then catch up. Also listens for the connection coming back. */
  async start(): Promise<void> {
    if (!this.deps.api) return;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => void this.sync());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void this.sync();
      });
    }
    await this.sync();
  }

  /** Pull what other devices saved, then push this device's changes. */
  async sync(): Promise<void> {
    const api = this.deps.api;
    if (!api) return;
    const h = await api.health();
    this.setMode(h.kind === 'ok' && h.data.ok ? 'online' : 'offline');
    if (this.mode === 'offline') return this.retryLater();
    if (this.player) await this.pull();
    await this.flush();
  }

  /** Download the server's view of every slot and reconcile (see the table at the top). */
  async pull(): Promise<void> {
    const api = this.deps.api;
    const player = this.player;
    if (!api || !player) return;
    const r = await api.listSlots(player.secret);
    if (r.kind === 'unauthorized') return this.forgetPlayer();
    if (r.kind !== 'ok') {
      this.setMode('offline');
      return this.retryLater();
    }
    this.setMode('online');
    const remote = new Map(r.data.map(s => [s.slot, s]));
    for (const slot of SAVE_SLOT_IDS) await this.reconcile(slot, remote.get(slot) ?? null);
    this.deps.onChange();
  }

  private async reconcile(slot: SaveSlotId, rs: RemoteSlot | null): Promise<void> {
    const { slots } = this.deps;
    const m = slots.meta(slot);
    const hasLocal = slots.storage(slot).read() !== null;
    if (!rs) {
      // The server has never seen this slot (or its database was reset): anything here is new.
      if (m.baseRevision !== null || (hasLocal && !m.dirty)) {
        slots.setMeta(slot, { baseRevision: null, dirty: hasLocal });
      }
      return;
    }
    if (rs.revision === m.baseRevision) {
      this.conflicts.delete(slot);
      return;
    }
    if (this.conflicts.get(slot)?.revision === rs.revision) return;
    if (!m.dirty && !this.deps.isPlaying(slot)) {
      await this.takeServerCopy(slot, rs);
      return;
    }
    if (!m.dirty && rs.summary === null) return; // deleted elsewhere while playing it here: keep playing
    if (rs.summary === null && hasLocal) {
      // Deleted on another device, changed here: the progress wins (a write over a deletion).
      slots.setMeta(slot, { baseRevision: rs.revision, dirty: true });
      return;
    }
    if (rs.summary === null && !hasLocal) {
      slots.setMeta(slot, { baseRevision: rs.revision, dirty: false }); // deleted on both
      return;
    }
    this.conflicts.set(slot, rs);
    this.deps.onConflict(slot);
  }

  private async takeServerCopy(slot: SaveSlotId, rs: RemoteSlot): Promise<boolean> {
    const api = this.deps.api!;
    const player = this.player!;
    if (rs.summary === null) {
      this.deps.slots.adopt(slot, null, rs.revision);
      return true;
    }
    const g = await api.getSlot(player.secret, slot);
    if (g.kind !== 'ok') return false;
    this.deps.slots.adopt(slot, g.data.raw, g.data.revision);
    return true;
  }

  /** Upload soon (debounced). */
  schedule(): void {
    if (!this.deps.api || this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.deps.debounceMs ?? 1000);
  }

  /** Upload every slot with changes, one at a time. Concurrent calls coalesce. */
  flush(): Promise<void> {
    if (this.flushing) {
      this.again = true;
      return this.flushing;
    }
    this.flushing = (async () => {
      do {
        this.again = false;
        for (const slot of SAVE_SLOT_IDS) {
          if (!(await this.push(slot))) {
            this.retryLater();
            return;
          }
        }
      } while (this.again);
      this.backoff = 2000;
    })().finally(() => {
      this.flushing = null;
      this.deps.onChange();
    });
    return this.flushing;
  }

  /** Upload one slot if it has changes. False when the connection failed (retry later). */
  private async push(slot: SaveSlotId): Promise<boolean> {
    const { slots, api } = this.deps;
    if (!api || this.conflicts.has(slot) || this.rejected.has(slot)) return true;
    const m = slots.meta(slot);
    if (!m.dirty) return true;
    const raw = slots.storage(slot).read();
    if (raw === null && m.baseRevision === null) {
      slots.setMeta(slot, { baseRevision: null, dirty: false }); // made and deleted before any sync
      return true;
    }
    const player = await this.ensurePlayer();
    if (!player) return false;
    const r =
      raw === null
        ? await api.deleteSlot(player.secret, slot, m.baseRevision!)
        : await api.putSlot(player.secret, slot, raw, m.baseRevision);
    switch (r.kind) {
      case 'ok': {
        this.setMode('online');
        // A save that landed while the request was out still needs sending.
        const changed = slots.storage(slot).read() !== raw;
        slots.setMeta(slot, { baseRevision: r.data.revision, dirty: changed });
        if (changed) this.again = true;
        return true;
      }
      case 'missing':
        slots.setMeta(slot, { baseRevision: null, dirty: false });
        return true;
      case 'conflict':
        this.conflicts.set(slot, r.current);
        this.deps.onConflict(slot);
        return true;
      case 'rejected':
        this.rejected.add(slot);
        return true;
      case 'unauthorized':
        this.forgetPlayer();
        this.again = true;
        return true;
      case 'offline':
        this.setMode('offline');
        return false;
      case 'error':
        return false;
    }
  }

  private ensurePlayer(): Promise<Player | null> {
    if (this.player) return Promise.resolve(this.player);
    if (!this.creating) {
      this.creating = (async () => {
        const r = await this.deps.api!.createPlayer();
        if (r.kind === 'offline') this.setMode('offline');
        if (r.kind !== 'ok') return null;
        this.player = { id: r.data.playerId, secret: r.data.secret };
        writePlayer(this.deps.kv, this.player);
        this.deps.onChange();
        return this.player;
      })().finally(() => {
        this.creating = null;
      });
    }
    return this.creating;
  }

  private retryLater(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.sync();
    }, this.backoff);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF);
  }

  private setMode(mode: CloudMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.deps.onChange();
  }

  /* ---------------- the player's choices ---------------- */

  /** Settle a conflict for this device's copy: it becomes the newest revision. */
  keepLocal(slot: SaveSlotId): Promise<void> {
    const c = this.conflicts.get(slot);
    if (!c) return Promise.resolve();
    this.conflicts.delete(slot);
    this.deps.slots.setMeta(slot, { baseRevision: c.revision, dirty: true });
    this.deps.onChange();
    return this.flush();
  }

  /** Settle a conflict for the server's copy: it replaces this device's. False if it can't be fetched. */
  async takeRemote(slot: SaveSlotId): Promise<boolean> {
    const c = this.conflicts.get(slot);
    if (!c || !this.player) return false;
    const ok = await this.takeServerCopy(slot, c);
    if (ok) this.conflicts.delete(slot);
    this.deps.onChange();
    return ok;
  }

  /**
   * Link this device to the player behind a code. Every slot is then reconciled from scratch:
   * slots only here upload, slots only there download, slots on both ask. False if the code is
   * wrong or the server can't be reached.
   */
  async link(code: string): Promise<'ok' | 'bad-code' | 'offline'> {
    const api = this.deps.api;
    const secret = parsePlayerCode(code);
    if (!api || !secret) return 'bad-code';
    const me = await api.me(secret);
    if (me.kind === 'unauthorized' || me.kind === 'missing') return 'bad-code';
    if (me.kind !== 'ok') return 'offline';
    this.player = { id: me.data.playerId, secret };
    writePlayer(this.deps.kv, this.player);
    this.conflicts.clear();
    this.deps.slots.forgetRevisions();
    await this.pull();
    await this.flush();
    return 'ok';
  }

  /** Forget the player on this device. Its saves stay on the server and on this device. */
  unlink(): void {
    this.forgetPlayer();
  }

  private forgetPlayer(): void {
    this.player = null;
    this.deps.kv.remove(PLAYER_KEY);
    this.conflicts.clear();
    this.deps.slots.forgetRevisions();
    this.deps.onChange();
  }

  /** A slot's checkpoints on the server, newest first (null if they can't be fetched). */
  async history(slot: SaveSlotId): Promise<HistoryEntry[] | null> {
    if (!this.deps.api || !this.player) return null;
    const r = await this.deps.api.history(this.player.secret, slot);
    return r.kind === 'ok' ? r.data : null;
  }

  /** Roll a slot back to a checkpoint, on the server and then on this device. */
  async restore(slot: SaveSlotId, revision: number): Promise<boolean> {
    const api = this.deps.api;
    if (!api || !this.player) return false;
    const r = await api.restore(this.player.secret, slot, revision);
    if (r.kind !== 'ok') return false;
    const g = await api.getSlot(this.player.secret, slot);
    if (g.kind !== 'ok') return false;
    this.conflicts.delete(slot);
    this.deps.slots.adopt(slot, g.data.raw, g.data.revision);
    this.deps.onChange();
    return true;
  }
}

function readPlayer(kv: KeyValue): Player | null {
  try {
    const p = JSON.parse(kv.get(PLAYER_KEY) ?? 'null') as Partial<Player> | null;
    return p && typeof p.id === 'string' && typeof p.secret === 'string'
      ? { id: p.id, secret: p.secret }
      : null;
  } catch {
    return null;
  }
}

function writePlayer(kv: KeyValue, p: Player): void {
  kv.set(PLAYER_KEY, JSON.stringify(p));
}
