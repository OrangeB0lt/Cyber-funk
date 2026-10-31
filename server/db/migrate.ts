/**
 * Apply pending migrations. The server runs this at startup; `npm run db:migrate` (migrate-cli.ts)
 * runs it by hand.
 * An advisory lock makes concurrent starts (two replicas, or a restart loop) take turns.
 */
import type pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

/** pg_advisory_lock key for migrations ("cfmg"). */
const LOCK = 0x63666d67;

/** Run every migration in `folder` that this database hasn't seen. */
export async function runMigrations(pool: pg.Pool, folder: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('select pg_advisory_lock($1)', [LOCK]);
    await migrate(drizzle({ client }), { migrationsFolder: folder });
  } finally {
    await client.query('select pg_advisory_unlock($1)', [LOCK]).catch(() => {});
    client.release();
  }
}
