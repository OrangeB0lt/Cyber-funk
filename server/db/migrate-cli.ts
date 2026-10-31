/* `npm run db:migrate`: apply pending migrations to DATABASE_URL and exit. */
import { readEnv } from '../env';
import { connect } from './client';
import { runMigrations } from './migrate';

const env = readEnv();
const { pool } = connect(env.DATABASE_URL);
try {
  await runMigrations(pool, env.MIGRATIONS_DIR);
  console.log('migrations: up to date');
} finally {
  await pool.end();
}
