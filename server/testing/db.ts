/**
 * The real Postgres the server tests run against: DATABASE_URL_TEST, or the dev stack's test
 * database on localhost. Start it with `docker compose -f compose.dev.yaml up -d db`.
 */
import { sql } from 'drizzle-orm';
import { connect } from '../db/client';
import { runMigrations } from '../db/migrate';

/** The dev stack's test database (compose.dev.yaml creates it). */
const DEFAULT_URL = 'postgres://cyberfunk:cyberfunk@localhost:5432/cyberfunk_test';

/** Connect, migrate, and hand back a way to empty every table between tests. */
export async function testDb() {
  const url = process.env.DATABASE_URL_TEST ?? DEFAULT_URL;
  const { db, pool } = connect(url);
  try {
    await runMigrations(pool, 'server/db/migrations');
  } catch (e) {
    await pool.end();
    throw new Error(
      `Can't reach the test database at ${url} (${(e as Error).message}).\n` +
        'Start it with `docker compose -f compose.dev.yaml up -d db`, or set DATABASE_URL_TEST.',
      { cause: e },
    );
  }
  return {
    db,
    pool,
    reset: () => db.execute(sql`truncate players, saves, save_history restart identity cascade`),
  };
}
