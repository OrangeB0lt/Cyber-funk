/** Anonymous players: create one (the device's first sync), or check who a secret belongs to. */
import type { FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { createPlayerResponse, meResponse } from '@app/save/protocol';
import { hashSecret, newSecret } from '../auth';
import { createPlayer } from '../repo/saves';
import { authed, type RouteDeps } from './http';

export function playerRoutes(app: FastifyInstance, deps: RouteDeps): void {
  app.post(
    '/players',
    { config: { rateLimit: { max: deps.limits.newPlayersPerHour, timeWindow: '1 hour' } } },
    async (_req, reply) => {
      const secret = newSecret();
      const { id } = await createPlayer(deps.db, hashSecret(secret));
      const body: z.input<typeof createPlayerResponse> = { playerId: id, secret };
      return reply.code(201).send(body);
    },
  );

  app.get('/players/me', async (req, reply) => {
    const player = await authed(deps.db, req, reply);
    if (!player) return reply;
    const body: z.input<typeof meResponse> = {
      playerId: player.id,
      createdAt: player.createdAt.toISOString(),
    };
    return body;
  });
}
