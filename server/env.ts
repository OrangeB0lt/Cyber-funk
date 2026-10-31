/**
 * Server configuration, read once from the environment and validated, so a typo in compose.yaml
 * fails at startup with a clear message instead of at the first request.
 */
import { z } from 'zod';

const schema = z.object({
  /** postgres://user:password@host:5432/database */
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Port to listen on. */
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  /** Interface to bind (0.0.0.0 inside a container). */
  HOST: z.string().default('0.0.0.0'),
  /** The built game (dist/) to serve. Unset in development, where Vite serves the game. */
  STATIC_DIR: z.string().optional(),
  /** Where the SQL migrations live. */
  MIGRATIONS_DIR: z.string().default('server/db/migrations'),
  /** Behind a reverse proxy: trust X-Forwarded-For for client IPs (rate limits). */
  TRUST_PROXY: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  /** pino log level. */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

/** Validated server configuration. */
export type Env = z.infer<typeof schema>;

/** Read and validate the environment; throws listing every problem. */
export function readEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const r = schema.safeParse(source);
  if (!r.success) {
    const problems = r.error.issues.map(i => `  ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Bad server configuration:\n${problems}`);
  }
  return r.data;
}
