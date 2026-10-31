/** Small helpers the route modules share: body parsing with the protocol schemas, and auth. */
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { bearerSecret, hashSecret } from '../auth';
import type { Db } from '../db/client';
import { findPlayer } from '../repo/saves';

/** What the route modules need. */
export interface RouteDeps {
  /** The database. */
  db: Db;
  /** The game version (package.json), reported by /api/health. */
  version: string;
  /** Abuse limits. */
  limits: { newPlayersPerHour: number; requestsPerMinute: number };
}

/** Parse with a protocol schema; on failure, answer 400 and return null. */
export function parse<S extends z.ZodType>(
  schema: S,
  value: unknown,
  reply: FastifyReply,
): z.output<S> | null {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  void reply.code(400).send({ error: 'bad-request', issues: r.error.issues.map(i => i.message) });
  return null;
}

/** The calling player; on a missing or unknown secret, answer 401 and return null. */
export async function authed(
  db: Db,
  req: FastifyRequest,
  reply: FastifyReply,
): Promise<{ id: string; createdAt: Date } | null> {
  const secret = bearerSecret(req.headers.authorization);
  const player = secret ? await findPlayer(db, hashSecret(secret)) : null;
  if (player) return player;
  void reply.code(401).send({ error: 'unauthorized' });
  return null;
}
