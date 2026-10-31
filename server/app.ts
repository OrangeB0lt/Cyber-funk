/**
 * The HTTP server: the cloud-save API under /api, and (in the production image) the built game.
 * `buildApp` takes its dependencies so tests can drive it with `app.inject` against a test database.
 */
import { resolve, sep } from 'node:path';
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import type { Db } from './db/client';
import type { RouteDeps } from './routes/http';
import { healthRoutes } from './routes/health';
import { playerRoutes } from './routes/players';
import { slotRoutes } from './routes/slots';

/** Options for building the server. */
export interface AppOptions {
  /** The database. */
  db: Db;
  /** The game version (package.json), reported by /api/health. */
  version: string;
  /** The built game to serve (dist/). Unset in development, where Vite serves it. */
  staticDir?: string;
  /** pino log level ('silent' in tests). */
  logLevel?: string;
  /** Trust X-Forwarded-For (behind a reverse proxy). */
  trustProxy?: boolean;
  /** Override the abuse limits (tests). */
  limits?: Partial<RouteDeps['limits']>;
}

/** Largest request body: a save is a few kilobytes, so this is generous. */
const BODY_LIMIT = 256 * 1024;

/**
 * Same-origin only. React sets inline style attributes (meter widths), hence 'unsafe-inline' for
 * styles; scripts are only the built bundle.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join('; ');

/** Build the server (not listening yet). */
export async function buildApp(opts: AppOptions): Promise<FastifyInstance> {
  const deps: RouteDeps = {
    db: opts.db,
    version: opts.version,
    limits: { newPlayersPerHour: 10, requestsPerMinute: 300, ...opts.limits },
  };
  const app = Fastify({
    logger: { level: opts.logLevel ?? 'info' },
    bodyLimit: BODY_LIMIT,
    trustProxy: opts.trustProxy ?? false,
  });

  await app.register(rateLimit, { max: deps.limits.requestsPerMinute, timeWindow: '1 minute' });
  app.addHook('onSend', async (_req, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Content-Security-Policy', CSP);
  });

  await app.register(
    async api => {
      api.addHook('onSend', async (_req, reply) => {
        reply.header('Cache-Control', 'no-store');
      });
      healthRoutes(api, deps);
      playerRoutes(api, deps);
      slotRoutes(api, deps);
    },
    { prefix: '/api' },
  );

  const staticDir = opts.staticDir && resolve(opts.staticDir);
  if (staticDir) {
    await app.register(fastifyStatic, {
      root: staticDir,
      // Hashed build assets never change; everything else (index.html) is revalidated.
      setHeaders: (res, path) => {
        res.header(
          'Cache-Control',
          path.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
      },
    });
  }

  app.setNotFoundHandler((req, reply) => {
    if (staticDir && req.method === 'GET' && !req.url.startsWith('/api/')) {
      return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
    }
    return reply.code(404).send({ error: 'not-found' });
  });

  return app;
}
