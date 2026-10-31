/** GET /api/health: the compose healthcheck and the client's "is cloud saving available?" probe. */
import { sql } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { healthResponse } from '@app/save/protocol';
import type { RouteDeps } from './http';

export function healthRoutes(app: FastifyInstance, deps: RouteDeps): void {
  // The compose healthcheck calls this every 10 seconds: log it only when something's wrong.
  app.get('/health', { logLevel: 'warn' }, async (_req, reply) => {
    let db = false;
    try {
      await deps.db.execute(sql`select 1`);
      db = true;
    } catch (e) {
      app.log.error(e, 'health: database unreachable');
    }
    const body: z.input<typeof healthResponse> = { ok: db, db, version: deps.version };
    return reply.code(db ? 200 : 503).send(body);
  });
}
