/** The connection pool and the typed Drizzle handle every repository function takes. */
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

/** A database handle. */
export type Db = ReturnType<typeof connect>['db'];

/** Open a pool. Close it with `pool.end()` on shutdown. */
export function connect(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const db = drizzle({ client: pool, schema });
  return { db, pool };
}
