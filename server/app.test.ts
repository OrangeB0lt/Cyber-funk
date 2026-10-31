import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import { createRng } from '@core/rng';
import { newGame } from '@engine/index';
import { SAVE_VERSION, encodeSave } from '@app/save/format';
import { HISTORY_LIMIT, formatPlayerCode } from '@app/save/protocol';
import { buildApp } from './app';
import { players } from './db/schema';
import { pruneIdlePlayers } from './repo/saves';
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

/** A save envelope for a character. */
const save = (name = 'Dawlin', level = 1, at = new Date('2026-10-31T10:00:00.000Z')) => {
  const g = newGame(name, 'yat', 'snare', undefined, 0);
  g.level = level;
  return encodeSave(g, createRng(1).save(), at);
};

async function newPlayer(): Promise<{ playerId: string; secret: string; auth: { authorization: string } }> {
  const r = await app.inject({ method: 'POST', url: '/api/players' });
  expect(r.statusCode).toBe(201);
  const body = r.json() as { playerId: string; secret: string };
  return { ...body, auth: { authorization: `Bearer ${body.secret}` } };
}

const put = (auth: { authorization: string }, slot: number, raw: string, baseRevision: number | null) =>
  app.inject({ method: 'PUT', url: `/api/slots/${slot}`, headers: auth, payload: { raw, baseRevision } });

describe('health', () => {
  it('reports the database and version', async () => {
    const r = await app.inject('/api/health');
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ ok: true, db: true, version: 'test' });
    expect(r.headers['cache-control']).toBe('no-store');
  });
});

describe('players', () => {
  it('creates an anonymous player whose secret (or player code) authenticates', async () => {
    const p = await newPlayer();
    expect(p.secret).toMatch(/^[0-9A-HJKMNP-TV-Z]{24}$/);
    const me = await app.inject({ url: '/api/players/me', headers: p.auth });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ playerId: p.playerId });
    const byCode = await app.inject({
      url: '/api/players/me',
      headers: { authorization: `Bearer ${formatPlayerCode(p.secret).toLowerCase()}` },
    });
    expect(byCode.statusCode).toBe(200);
  });

  it('stores only a hash of the secret', async () => {
    const p = await newPlayer();
    const rows = await t.db.select().from(players);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.secretHash).not.toContain(p.secret);
    expect(rows[0]!.secretHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses a missing, malformed or unknown secret', async () => {
    expect((await app.inject('/api/slots')).statusCode).toBe(401);
    expect(
      (await app.inject({ url: '/api/slots', headers: { authorization: 'Bearer nope' } })).statusCode,
    ).toBe(401);
    const unknown = 'Bearer ' + '0'.repeat(24);
    expect((await app.inject({ url: '/api/slots', headers: { authorization: unknown } })).statusCode).toBe(
      401,
    );
  });

  it('rate-limits new players per IP', async () => {
    const strict = await buildApp({
      db: t.db,
      version: 'test',
      logLevel: 'silent',
      limits: { newPlayersPerHour: 2 },
    });
    const codes = [];
    for (let i = 0; i < 3; i++)
      codes.push((await strict.inject({ method: 'POST', url: '/api/players' })).statusCode);
    await strict.close();
    expect(codes).toEqual([201, 201, 429]);
  });
});

describe('slots', () => {
  it('stores a save and returns its exact text, with a queryable summary', async () => {
    const p = await newPlayer();
    const raw = save('Cher', 4);
    const w = await put(p.auth, 2, raw, null);
    expect(w.statusCode).toBe(200);
    expect(w.json()).toEqual({ revision: 1, savedAt: '2026-10-31T10:00:00.000Z' });

    const list = await app.inject({ url: '/api/slots', headers: p.auth });
    expect(list.json()).toEqual({
      slots: [
        {
          slot: 2,
          revision: 1,
          savedAt: '2026-10-31T10:00:00.000Z',
          summary: {
            name: 'Cher',
            cls: 'snare',
            level: 4,
            act: 'treme',
            step: 'meet_roux',
            district: 'treme',
            ngPlus: 0,
          },
        },
      ],
    });
    const got = await app.inject({ url: '/api/slots/2', headers: p.auth });
    expect(got.json()).toEqual({ revision: 1, savedAt: '2026-10-31T10:00:00.000Z', raw });

    const rows = await t.db.execute(sql`select name, level, format_version from saves`);
    expect(rows.rows).toEqual([{ name: 'Cher', level: 4, format_version: SAVE_VERSION }]);
  });

  it('answers 409 with the current head when the base revision is stale', async () => {
    const p = await newPlayer();
    await put(p.auth, 1, save('A'), null);
    expect((await put(p.auth, 1, save('A', 2), 1)).json()).toMatchObject({ revision: 2 });
    const stale = await put(p.auth, 1, save('B'), 1);
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ error: 'conflict', current: { slot: 1, revision: 2 } });
    const fresh = await put(p.auth, 1, save('B'), null);
    expect(fresh.statusCode).toBe(409);
  });

  it('rejects saves the game could not load', async () => {
    const p = await newPlayer();
    const env = JSON.parse(save()) as Record<string, unknown> & { game: Record<string, unknown> };
    const cases: [string, string][] = [
      ['{not json', 'corrupt'],
      [JSON.stringify({ ...env, version: SAVE_VERSION + 1 }), 'too-new'],
      [JSON.stringify({ ...env, game: { ...env.game, cls: 'kazoo' } }), 'invalid'],
    ];
    for (const [raw, reason] of cases) {
      const r = await put(p.auth, 1, raw, null);
      expect(r.statusCode).toBe(422);
      expect(r.json()).toEqual({ error: 'rejected', reason });
    }
    expect((await put(p.auth, 4, save(), null)).statusCode).toBe(400);
    expect((await app.inject({ url: '/api/slots/1', headers: p.auth })).statusCode).toBe(404);
  });

  it('keeps players apart', async () => {
    const a = await newPlayer();
    const b = await newPlayer();
    await put(a.auth, 1, save('Mine'), null);
    expect((await app.inject({ url: '/api/slots', headers: b.auth })).json()).toEqual({ slots: [] });
    expect((await app.inject({ url: '/api/slots/1', headers: b.auth })).statusCode).toBe(404);
    expect((await put(b.auth, 1, save('Theirs'), null)).json()).toMatchObject({ revision: 1 });
  });

  it('deletes with a tombstone that other devices can see, and never over newer progress', async () => {
    const p = await newPlayer();
    await put(p.auth, 3, save(), null);
    await put(p.auth, 3, save('X', 2), 1);
    const stale = await app.inject({ method: 'DELETE', url: '/api/slots/3?baseRevision=1', headers: p.auth });
    expect(stale.statusCode).toBe(409);
    const del = await app.inject({ method: 'DELETE', url: '/api/slots/3?baseRevision=2', headers: p.auth });
    expect(del.statusCode).toBe(200);
    expect(del.json()).toMatchObject({ revision: 3 });
    const list = (await app.inject({ url: '/api/slots', headers: p.auth })).json() as { slots: unknown[] };
    expect(list.slots).toEqual([expect.objectContaining({ slot: 3, revision: 3, summary: null })]);
    expect((await app.inject({ url: '/api/slots/3', headers: p.auth })).json()).toMatchObject({ raw: null });
    // Writing over a deleted slot always works, whatever the device last saw.
    expect((await put(p.auth, 3, save('Back'), null)).json()).toMatchObject({ revision: 4 });
    expect(
      (await app.inject({ method: 'DELETE', url: '/api/slots/2?baseRevision=1', headers: p.auth }))
        .statusCode,
    ).toBe(404);
  });
});

describe('history', () => {
  it(`keeps the newest ${HISTORY_LIMIT} checkpoints and restores one as a new revision`, async () => {
    const p = await newPlayer();
    for (let i = 1; i <= HISTORY_LIMIT + 5; i++) {
      expect((await put(p.auth, 1, save(`Take ${i}`), i === 1 ? null : i - 1)).statusCode).toBe(200);
    }
    const h = (await app.inject({ url: '/api/slots/1/history', headers: p.auth })).json() as {
      entries: { revision: number; summary: { name: string } }[];
    };
    expect(h.entries).toHaveLength(HISTORY_LIMIT);
    expect(h.entries[0]).toMatchObject({
      revision: HISTORY_LIMIT + 5,
      summary: { name: `Take ${HISTORY_LIMIT + 5}` },
    });
    expect(h.entries.at(-1)!.revision).toBe(6);

    const r = await app.inject({
      method: 'POST',
      url: '/api/slots/1/restore',
      headers: p.auth,
      payload: { revision: 10 },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ revision: HISTORY_LIMIT + 6 });
    const got = (await app.inject({ url: '/api/slots/1', headers: p.auth })).json() as { raw: string };
    expect((JSON.parse(got.raw) as { game: { name: string } }).game.name).toBe('Take 10');
    const gone = await app.inject({
      method: 'POST',
      url: '/api/slots/1/restore',
      headers: p.auth,
      payload: { revision: 2 },
    });
    expect(gone.statusCode).toBe(404);
  });
});

describe('housekeeping', () => {
  it('prunes old players who never kept a save', async () => {
    const idle = await newPlayer();
    const keeper = await newPlayer();
    await put(keeper.auth, 1, save(), null);
    await t.db.execute(sql`update players set created_at = now() - interval '31 days'`);
    expect(await pruneIdlePlayers(t.db)).toBe(1);
    expect((await app.inject({ url: '/api/slots', headers: idle.auth })).statusCode).toBe(401);
    expect((await app.inject({ url: '/api/slots', headers: keeper.auth })).statusCode).toBe(200);
  });
});

describe('static files', () => {
  it('serves the built game with an SPA fallback, cache headers and a CSP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cf-static-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<!doctype html><title>CF</title>');
    writeFileSync(join(dir, 'assets', 'index-abc.js'), 'console.log(1)');
    const web = await buildApp({ db: t.db, version: 'test', logLevel: 'silent', staticDir: dir });
    const index = await web.inject('/');
    expect(index.statusCode).toBe(200);
    expect(index.body).toContain('<title>CF</title>');
    expect(index.headers['cache-control']).toBe('no-cache');
    expect(index.headers['content-security-policy']).toContain("default-src 'self'");
    const asset = await web.inject('/assets/index-abc.js');
    expect(asset.headers['cache-control']).toContain('immutable');
    expect((await web.inject('/somewhere')).body).toContain('<title>CF</title>');
    const api404 = await web.inject('/api/nope');
    expect(api404.statusCode).toBe(404);
    expect(api404.json()).toEqual({ error: 'not-found' });
    await web.close();
  });
});
