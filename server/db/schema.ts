/**
 * The database tables (Drizzle). Change a table here, then run `npm run db:generate` to write the
 * SQL migration into server/db/migrations, and commit both. Never edit a migration that has shipped.
 *
 * Save envelopes are stored as `json`, not `jsonb`: json keeps the text exactly as the game wrote it
 * (jsonb reorders keys), so a save loaded from the cloud behaves byte-for-byte like the local one.
 * The summary columns copy a few fields out so plain SQL can answer "who is playing what".
 */
import { sql } from 'drizzle-orm';
import {
  bigserial,
  check,
  index,
  integer,
  json,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import type { SaveSummary } from '@app/save/format';

const at = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

/** Anonymous players. The secret itself is never stored: only its SHA-256. */
export const players = pgTable('players', {
  id: uuid('id').primaryKey().defaultRandom(),
  secretHash: text('secret_hash').notNull().unique(),
  createdAt: at('created_at').notNull().defaultNow(),
  lastSeenAt: at('last_seen_at').notNull().defaultNow(),
});

/**
 * The head of each slot. `revision` counts every write and delete, so devices can tell whose copy is
 * newer. A deleted slot keeps its row with `data` null (a tombstone) so other devices learn of it.
 */
export const saves = pgTable(
  'saves',
  {
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    slot: smallint('slot').notNull(),
    revision: integer('revision').notNull(),
    formatVersion: integer('format_version'),
    savedAt: at('saved_at').notNull(),
    data: json('data'),
    name: text('name'),
    cls: text('cls'),
    level: integer('level'),
    act: text('act'),
    step: text('step'),
    district: text('district'),
    ngPlus: integer('ng_plus'),
    updatedAt: at('updated_at').notNull().defaultNow(),
  },
  t => [
    primaryKey({ columns: [t.playerId, t.slot] }),
    check('saves_slot_range', sql`${t.slot} between 1 and 3`),
  ],
);

/** Recent checkpoints per slot (the newest HISTORY_LIMIT are kept), for rolling a slot back. */
export const saveHistory = pgTable(
  'save_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    slot: smallint('slot').notNull(),
    revision: integer('revision').notNull(),
    savedAt: at('saved_at').notNull(),
    data: json('data').notNull(),
    summary: jsonb('summary').$type<SaveSummary>().notNull(),
    createdAt: at('created_at').notNull().defaultNow(),
  },
  t => [index('save_history_slot_idx').on(t.playerId, t.slot, t.revision.desc())],
);
