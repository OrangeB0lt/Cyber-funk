/**
 * The browser's sync engine (src/app/save/sync.ts) over the real HTTP client against the real
 * server and database: proves the client and server agree on the protocol, end to end.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { CloudApi } from '@app/save/cloud';
import { encodeSave } from '@app/save/format';
import { SaveSlots } from '@app/save/slots';
import { memoryKv } from '@app/save/storage';
import { CloudSync, PLAYER_KEY } from '@app/save/sync';
import { buildApp } from './app';
import { testDb } from './testing/db';

let t: Awaited<ReturnType<typeof testDb>>;
let app: FastifyInstance;

beforeAll(async () => {
  t = await testDb();
  app = await buildApp({
    db: t.db,
    version: 'test',
    logLevel: 'silent',
    limits: { newPlayersPerHour: 1000 },
  });
});
afterAll(async () => {
  await app.close();
  await t.pool.end();
});
beforeEach(() => t.reset());

/** fetch, answered in-process by the server. */
const injectFetch: typeof fetch = async (input, init) => {
  const r = await app.inject({
    method: (init?.method ?? 'GET') as 'GET',
    url: String(input),
    headers: init?.headers as Record<string, string>,
    payload: init?.body as string | undefined,
  });
  return new Response(r.body || null, {
    status: r.statusCode,
    headers: Object.entries(r.headers).map(([k, v]) => [k, String(v)] as [string, string]),
  });
};

const raw = (name: string, level = 1) => {
  const g = newGame(name, 'creole', 'trumpet', undefined, 0);
  g.level = level;
  return encodeSave(g, createRng(7).save(), new Date('2026-10-31T09:00:00Z'));
};

function device(opts: { kv?: ReturnType<typeof memoryKv> } = {}) {
  const kv = opts.kv ?? memoryKv();
  const slots = new SaveSlots(kv);
  const conflicts: number[] = [];
  const sync = new CloudSync({
    slots,
    api: new CloudApi({ fetch: injectFetch }),
    kv,
    isPlaying: () => false,
    onChange: () => {},
    onConflict: s => conflicts.push(s),
    debounceMs: 0,
  });
  return { kv, slots, sync, conflicts };
}

describe('sync against the real server', () => {
  it('uploads, links a second device, settles a conflict and restores a checkpoint', async () => {
    const a = device();
    a.slots.storage(1).write(raw('Dawlin', 3));
    await a.sync.start();
    expect(a.sync.mode).toBe('online');
    expect(a.slots.meta(1)).toEqual({ baseRevision: 1, dirty: false });
    const code = a.sync.code!;
    expect(code).toMatch(/^CFP-(\w{4}-){5}\w{4}$/);

    const b = device();
    expect(await b.sync.link(code)).toBe('ok');
    expect(b.slots.info(1).summary).toMatchObject({ name: 'Dawlin', level: 3 });

    // Both change slot 1; B uploads first, so A has to choose.
    b.slots.storage(1).write(raw('Dawlin', 4));
    await b.sync.flush();
    a.slots.storage(1).write(raw('Dawlin', 5));
    await a.sync.flush();
    expect(a.conflicts).toEqual([1]);
    expect(a.sync.conflicts.get(1)?.summary?.level).toBe(4);
    await a.sync.keepLocal(1);
    expect(a.slots.meta(1)).toEqual({ baseRevision: 3, dirty: false });

    await b.sync.sync();
    expect(b.slots.info(1).summary?.level).toBe(5);

    const history = await b.sync.history(1);
    expect(history?.map(h => h.summary.level)).toEqual([5, 4, 3]);
    expect(await b.sync.restore(1, 1)).toBe(true);
    expect(b.slots.info(1).summary?.level).toBe(3);
    expect(b.slots.meta(1)).toEqual({ baseRevision: 4, dirty: false });
  });

  it('a save made with no connection uploads later, as a new anonymous player', async () => {
    const kv = memoryKv();
    const offline = new CloudSync({
      slots: new SaveSlots(kv),
      api: new CloudApi({ fetch: () => Promise.reject(new TypeError('Failed to fetch')) }),
      kv,
      isPlaying: () => false,
      onChange: () => {},
      onConflict: () => {},
    });
    await offline.start();
    expect(offline.mode).toBe('offline');
    const d = device({ kv });
    d.slots.storage(2).write(raw('Later'));
    await d.sync.start();
    expect(d.sync.linked).toBe(true);
    expect(kv.get(PLAYER_KEY)).toContain('secret');
    expect(d.slots.meta(2)).toEqual({ baseRevision: 1, dirty: false });
  });
});
