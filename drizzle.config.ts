/* drizzle-kit: `npm run db:generate` diffs server/db/schema.ts against the migrations folder and
   writes the next SQL migration. It needs no database. */
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './server/db/schema.ts',
  out: './server/db/migrations',
});
