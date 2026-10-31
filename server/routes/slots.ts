/**
 * Save slots: list, read, write, delete, history and restore. Every upload is decoded with the
 * game's own `decodeSave`, so the database only ever holds saves the game can load.
 */
import type { FastifyInstance, FastifyReply } from 'fastify';
import type { z } from 'zod';
import { decodeSave, summarize } from '@app/save/format';
import {
  deleteSlotQuery,
  putSlotRequest,
  restoreRequest,
  slotParamSchema,
  type conflictResponse,
  type getSlotResponse,
  type historyResponse,
  type listSlotsResponse,
  type rejectedResponse,
  type writeOkResponse,
} from '@app/save/protocol';
import {
  deleteSlot,
  getSlot,
  listSlots,
  putSlot,
  restoreCheckpoint,
  slotHistory,
  type WriteResult,
} from '../repo/saves';
import { authed, parse, type RouteDeps } from './http';

/** Answer a write: 200 with the new head, 409 with what the slot holds now, or 404. */
function sendWrite(reply: FastifyReply, r: WriteResult) {
  if (r.kind === 'ok') {
    const body: z.input<typeof writeOkResponse> = { revision: r.revision, savedAt: r.savedAt };
    return reply.send(body);
  }
  if (r.kind === 'conflict') {
    const body: z.input<typeof conflictResponse> = { error: 'conflict', current: r.current };
    return reply.code(409).send(body);
  }
  return reply.code(404).send({ error: 'not-found' });
}

export function slotRoutes(app: FastifyInstance, deps: RouteDeps): void {
  const { db } = deps;

  app.get('/slots', async (req, reply) => {
    const player = await authed(db, req, reply);
    if (!player) return reply;
    const body: z.input<typeof listSlotsResponse> = { slots: await listSlots(db, player.id) };
    return body;
  });

  app.get('/slots/:slot', async (req, reply) => {
    const player = await authed(db, req, reply);
    const p = player && parse(slotParamSchema, req.params, reply);
    if (!player || !p) return reply;
    const head = await getSlot(db, player.id, p.slot);
    if (!head) return reply.code(404).send({ error: 'not-found' });
    const body: z.input<typeof getSlotResponse> = head;
    return body;
  });

  app.put('/slots/:slot', async (req, reply) => {
    const player = await authed(db, req, reply);
    const p = player && parse(slotParamSchema, req.params, reply);
    const b = p && parse(putSlotRequest, req.body, reply);
    if (!player || !p || !b) return reply;
    const loaded = decodeSave(b.raw);
    const savedAt = typeof loaded === 'string' ? null : new Date(loaded.savedAt);
    if (typeof loaded === 'string' || !savedAt || Number.isNaN(savedAt.getTime())) {
      const reason = typeof loaded === 'string' && loaded !== 'empty' ? loaded : 'corrupt';
      const body: z.input<typeof rejectedResponse> = { error: 'rejected', reason };
      return reply.code(422).send(body);
    }
    const version = (JSON.parse(b.raw) as { version: number }).version;
    const save = { raw: b.raw, version, savedAt, summary: summarize(loaded.game) };
    return sendWrite(reply, await putSlot(db, player.id, p.slot, save, b.baseRevision));
  });

  app.delete('/slots/:slot', async (req, reply) => {
    const player = await authed(db, req, reply);
    const p = player && parse(slotParamSchema, req.params, reply);
    const q = p && parse(deleteSlotQuery, req.query, reply);
    if (!player || !p || !q) return reply;
    return sendWrite(reply, await deleteSlot(db, player.id, p.slot, q.baseRevision));
  });

  app.get('/slots/:slot/history', async (req, reply) => {
    const player = await authed(db, req, reply);
    const p = player && parse(slotParamSchema, req.params, reply);
    if (!player || !p) return reply;
    const body: z.input<typeof historyResponse> = { entries: await slotHistory(db, player.id, p.slot) };
    return body;
  });

  app.post('/slots/:slot/restore', async (req, reply) => {
    const player = await authed(db, req, reply);
    const p = player && parse(slotParamSchema, req.params, reply);
    const b = p && parse(restoreRequest, req.body, reply);
    if (!player || !p || !b) return reply;
    return sendWrite(reply, await restoreCheckpoint(db, player.id, p.slot, b.revision));
  });
}
