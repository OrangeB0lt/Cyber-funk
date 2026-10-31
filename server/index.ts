/**
 * Server entry point: read the config, migrate the database, listen. In the Docker image this is
 * bundled to dist-server/index.mjs; in development `npm run dev:server` runs it with tsx watch.
 */
import pkg from '../package.json' with { type: 'json' };
import { buildApp } from './app';
import { connect } from './db/client';
import { runMigrations } from './db/migrate';
import { readEnv } from './env';
import { pruneIdlePlayers } from './repo/saves';

const env = readEnv();
const { db, pool } = connect(env.DATABASE_URL);

// The database may still be starting (a cold `docker compose up`): retry for about 30 seconds.
for (let attempt = 1; ; attempt++) {
  try {
    await runMigrations(pool, env.MIGRATIONS_DIR);
    break;
  } catch (e) {
    if (attempt >= 15) throw e;
    console.warn(`database not ready (${(e as Error).message}); retrying…`);
    await new Promise(r => setTimeout(r, 2000));
  }
}

const app = await buildApp({
  db,
  version: pkg.version,
  staticDir: env.STATIC_DIR,
  logLevel: env.LOG_LEVEL,
  trustProxy: env.TRUST_PROXY,
});
await app.listen({ port: env.PORT, host: env.HOST });

const prune = setInterval(() => {
  pruneIdlePlayers(db)
    .then(n => n > 0 && app.log.info({ removed: n }, 'pruned players with no saves'))
    .catch(e => app.log.error(e, 'pruning players failed'));
}, 86400_000);
prune.unref();

async function shutdown(signal: string): Promise<void> {
  app.log.info(`${signal}: shutting down`);
  clearInterval(prune);
  await app.close();
  await pool.end();
  process.exit(0);
}
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
