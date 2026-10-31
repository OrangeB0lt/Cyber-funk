import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SaveSlotId } from '@core/ids/saves';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import type { CloudClient, CloudResult, HistoryEntry, SlotHead, WriteOk } from './cloud';
import { decodeSave, encodeSave, summarize } from './format';
import type { RemoteSlot } from './protocol';
import { SaveSlots } from './slots';
import { memoryKv } from './storage';
import { CloudSync, PLAYER_KEY } from './sync';

const raw = (name: string) =>
  encodeSave(
    newGame(name, 'yat', 'snare', undefined, 0),
    createRng(1).save(),
    new Date('2026-10-31T10:00:00Z'),
  );

type Head = { revision: number; savedAt: string; raw: string | null };

/** The server's rules (server/repo/saves.ts), in memory. */
class FakeCloud implements CloudClient {
  offline = false;
  readonly secrets = new Map<string, string>();
  readonly data = new Map<string, Map<SaveSlotId, Head>>();
  readonly calls: string[] = [];
  private n = 0;

  private gate<T>(name: string, fn: () => CloudResult<T>): Promise<CloudResult<T>> {
    this.calls.push(name);
    return Promise.resolve(this.offline ? { kind: 'offline' } : fn());
  }
  private who(secret: string) {
    return this.secrets.get(secret) ?? null;
  }
  private heads(id: string) {
    let m = this.data.get(id);
    if (!m) this.data.set(id, (m = new Map()));
    return m;
  }
  private remote(slot: SaveSlotId, h: Head): RemoteSlot {
    const d = h.raw ? decodeSave(h.raw) : null;
    return {
      slot,
      revision: h.revision,
      savedAt: h.savedAt,
      summary: d && typeof d !== 'string' ? summarize(d.game) : null,
    };
  }
  /** Another device writes (bypassing the device under test). */
  write(secret: string, slot: SaveSlotId, text: string | null) {
    const m = this.heads(this.who(secret)!);
    const rev = (m.get(slot)?.revision ?? 0) + 1;
    m.set(slot, { revision: rev, savedAt: '2026-10-31T11:00:00.000Z', raw: text });
  }

  health() {
    return this.gate('health', () => ({ kind: 'ok', data: { ok: true, db: true, version: 't' } }));
  }
  createPlayer() {
    return this.gate('createPlayer', () => {
      const secret = `S${++this.n}`.padEnd(24, '0');
      const id = `00000000-0000-4000-8000-00000000000${this.n}`;
      this.secrets.set(secret, id);
      return { kind: 'ok', data: { playerId: id, secret } };
    });
  }
  me(secret: string) {
    return this.gate<{ playerId: string; createdAt: string }>('me', () => {
      const id = this.who(secret);
      return id ? { kind: 'ok', data: { playerId: id, createdAt: 'x' } } : { kind: 'unauthorized' };
    });
  }
  listSlots(secret: string) {
    return this.gate<RemoteSlot[]>('list', () => {
      const id = this.who(secret);
      if (!id) return { kind: 'unauthorized' };
      return { kind: 'ok', data: [...this.heads(id)].map(([s, h]) => this.remote(s, h)) };
    });
  }
  getSlot(secret: string, slot: SaveSlotId) {
    return this.gate<SlotHead>(`get:${slot}`, () => {
      const h = this.heads(this.who(secret)!).get(slot);
      return h ? { kind: 'ok', data: h } : { kind: 'missing' };
    });
  }
  putSlot(secret: string, slot: SaveSlotId, text: string, base: number | null) {
    return this.gate<WriteOk>(`put:${slot}`, () => {
      const id = this.who(secret);
      if (!id) return { kind: 'unauthorized' };
      const m = this.heads(id);
      const cur = m.get(slot);
      if (cur && cur.raw !== null && cur.revision !== base)
        return { kind: 'conflict', current: this.remote(slot, cur) };
      const head = { revision: (cur?.revision ?? 0) + 1, savedAt: '2026-10-31T10:00:00.000Z', raw: text };
      m.set(slot, head);
      return { kind: 'ok', data: { revision: head.revision, savedAt: head.savedAt } };
    });
  }
  deleteSlot(secret: string, slot: SaveSlotId, base: number) {
    return this.gate<WriteOk>(`delete:${slot}`, () => {
      const m = this.heads(this.who(secret)!);
      const cur = m.get(slot);
      if (!cur) return { kind: 'missing' };
      if (cur.raw !== null && cur.revision !== base)
        return { kind: 'conflict', current: this.remote(slot, cur) };
      m.set(slot, { revision: cur.revision + 1, savedAt: cur.savedAt, raw: null });
      return { kind: 'ok', data: { revision: cur.revision + 1, savedAt: cur.savedAt } };
    });
  }
  history() {
    return this.gate<HistoryEntry[]>('history', () => ({ kind: 'ok', data: [] }));
  }
  restore() {
    return this.gate<WriteOk>('restore', () => ({ kind: 'missing' }));
  }
}

/** A device: its own storage and sync engine, against the shared fake server. */
function device(cloud: FakeCloud, opts: { playing?: SaveSlotId; kv?: ReturnType<typeof memoryKv> } = {}) {
  const kv = opts.kv ?? memoryKv();
  const slots = new SaveSlots(kv);
  const conflicts: SaveSlotId[] = [];
  const sync = new CloudSync({
    slots,
    api: cloud,
    kv,
    isPlaying: s => s === opts.playing,
    onChange: () => {},
    onConflict: s => conflicts.push(s),
    debounceMs: 1000,
  });
  return {
    kv,
    slots,
    sync,
    conflicts,
    secret: () => (JSON.parse(kv.get(PLAYER_KEY)!) as { secret: string }).secret,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('cloud sync', () => {
  it('uploads after a save, creating the anonymous player only then', async () => {
    const cloud = new FakeCloud();
    const d = device(cloud);
    await d.sync.start();
    expect(cloud.calls).toEqual(['health']);
    expect(d.sync.linked).toBe(false);

    d.slots.storage(2).write(raw('Cher'));
    expect(d.sync.slotState(2)).toBe('pending');
    await vi.advanceTimersByTimeAsync(1000);
    await d.sync.flush();
    expect(cloud.calls).toEqual(['health', 'createPlayer', 'put:2']);
    expect(d.slots.meta(2)).toEqual({ baseRevision: 1, dirty: false });
    expect(d.sync.slotState(2)).toBe('synced');
    expect(d.sync.code).toMatch(/^CFP-/);
  });

  it('sends one upload for a burst of saves', async () => {
    const cloud = new FakeCloud();
    const d = device(cloud);
    await d.sync.start();
    for (const n of ['a', 'b', 'c']) d.slots.storage(1).write(raw(n));
    await vi.advanceTimersByTimeAsync(1000);
    await d.sync.flush();
    expect(cloud.calls.filter(c => c.startsWith('put'))).toEqual(['put:1']);
    expect(cloud.data.values().next().value!.get(1)!.raw).toBe(raw('c'));
  });

  it('keeps playing offline and uploads when the connection is back', async () => {
    const cloud = new FakeCloud();
    const d = device(cloud);
    await d.sync.start();
    cloud.offline = true;
    d.slots.storage(1).write(raw('Offline'));
    await vi.advanceTimersByTimeAsync(1000);
    await d.sync.flush();
    expect(d.sync.mode).toBe('offline');
    expect(d.slots.meta(1).dirty).toBe(true);
    expect(d.slots.storage(1).read()).toBe(raw('Offline'));

    cloud.offline = false;
    await vi.advanceTimersByTimeAsync(10_000); // the retry fires
    await d.sync.flush();
    expect(d.sync.mode).toBe('online');
    expect(d.slots.meta(1)).toEqual({ baseRevision: 1, dirty: false });
  });

  it("downloads another device's newer save when this one has no changes", async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('First'));
    await a.sync.start();
    const b = device(cloud);
    expect(await b.sync.link(a.secret())).toBe('ok');
    expect(b.slots.info(1).summary?.name).toBe('First');

    cloud.write(a.secret(), 1, raw('Second'));
    await b.sync.sync();
    expect(b.slots.info(1).summary?.name).toBe('Second');
    expect(b.slots.meta(1)).toEqual({ baseRevision: 2, dirty: false });
  });

  it('asks when both devices changed a slot, and settles either way', async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('Base'));
    await a.sync.start();
    cloud.write(a.secret(), 1, raw('Elsewhere'));
    a.slots.storage(1).write(raw('Here'));
    await a.sync.sync();
    expect(a.conflicts).toEqual([1]);
    expect(a.sync.slotState(1)).toBe('conflict');
    expect(a.sync.conflicts.get(1)?.summary?.name).toBe('Elsewhere');

    await a.sync.keepLocal(1);
    expect(cloud.data.values().next().value!.get(1)).toMatchObject({ revision: 3, raw: raw('Here') });
    expect(a.sync.slotState(1)).toBe('synced');

    cloud.write(a.secret(), 1, raw('Again'));
    a.slots.storage(1).write(raw('Mine'));
    await a.sync.sync();
    expect(await a.sync.takeRemote(1)).toBe(true);
    expect(a.slots.info(1).summary?.name).toBe('Again');
    expect(a.slots.meta(1)).toEqual({ baseRevision: 4, dirty: false });
  });

  it('never replaces the slot of the game being played: a newer copy is a question', async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('Base'));
    await a.sync.start();
    const playing = device(cloud, { playing: 1, kv: memoryKv({ [PLAYER_KEY]: a.kv.get(PLAYER_KEY)! }) });
    playing.slots.adopt(1, raw('Base'), 1);
    cloud.write(a.secret(), 1, raw('Newer'));
    await playing.sync.sync();
    expect(playing.conflicts).toEqual([1]);
    expect(playing.slots.info(1).summary?.name).toBe('Base');
  });

  it('uploads deletes, and progress beats a deletion made elsewhere', async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('Gone'));
    a.slots.storage(2).write(raw('Kept'));
    await a.sync.start();
    a.slots.storage(1).clear();
    await vi.advanceTimersByTimeAsync(1000);
    await a.sync.flush();
    expect(cloud.data.values().next().value!.get(1)).toMatchObject({ revision: 2, raw: null });

    cloud.write(a.secret(), 2, null); // deleted on another device…
    a.slots.storage(2).write(raw('Progress')); // …while this one kept playing
    await a.sync.sync();
    expect(a.conflicts).toEqual([]);
    expect(cloud.data.values().next().value!.get(2)).toMatchObject({ revision: 3, raw: raw('Progress') });
  });

  it('linking a code uploads slots only here, downloads slots only there, and asks about both', async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('A1'));
    a.slots.storage(2).write(raw('A2'));
    await a.sync.start();

    const b = device(cloud);
    b.slots.storage(2).write(raw('B2'));
    b.slots.storage(3).write(raw('B3'));
    expect(await b.sync.link('nonsense')).toBe('bad-code');
    expect(await b.sync.link('CFP-' + 'Z'.repeat(24))).toBe('bad-code');
    expect(await b.sync.link(a.secret().toLowerCase())).toBe('ok');
    expect(b.slots.info(1).summary?.name).toBe('A1');
    expect(b.conflicts).toEqual([2]);
    expect(cloud.data.values().next().value!.get(3)?.raw).toBe(raw('B3'));
  });

  it('starts a fresh player if the server no longer knows this one', async () => {
    const cloud = new FakeCloud();
    const a = device(cloud);
    a.slots.storage(1).write(raw('Lost'));
    await a.sync.start();
    const first = a.secret();
    cloud.secrets.clear();
    a.slots.storage(1).write(raw('Lost 2'));
    await vi.advanceTimersByTimeAsync(1000);
    await a.sync.flush();
    expect(a.secret()).not.toBe(first);
    expect(a.slots.meta(1)).toEqual({ baseRevision: 1, dirty: false });
  });

  it('does nothing at all when cloud saves are off', async () => {
    const kv = memoryKv();
    const slots = new SaveSlots(kv);
    const sync = new CloudSync({
      slots,
      api: null,
      kv,
      isPlaying: () => false,
      onChange: () => {},
      onConflict: () => {},
    });
    await sync.start();
    slots.storage(1).write(raw('Local'));
    expect(sync.mode).toBe('off');
    expect(sync.slotState(1)).toBe('local');
  });
});
