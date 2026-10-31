/**
 * Players, slots and checkpoints in Postgres. Every write to a slot runs in one transaction that
 * locks the slot's row, so two devices saving at once can't both win: the second gets a conflict.
 *
 * The rules (docs/architecture/server.md):
 * - A write must name the revision it was based on. If the slot holds a live save at a different
 *   revision, that's a conflict and nothing changes.
 * - Writing over an empty or deleted slot always succeeds, so a delete on one device never
 *   silently beats newer progress on another.
 * - A delete leaves a tombstone (data null) and bumps the revision, so other devices learn of it.
 * - Every write also lands in save_history; the newest HISTORY_LIMIT per slot are kept.
 */
import { and, desc, eq, lt, sql } from 'drizzle-orm';
import type { SaveSlotId } from '@core/ids/saves';
import type { SaveSummary } from '@app/save/format';
import { HISTORY_LIMIT, type RemoteSlot } from '@app/save/protocol';
import type { Db } from '../db/client';
import { players, saveHistory, saves } from '../db/schema';

/** A save to store: the envelope text plus what the server read out of it. */
export interface IncomingSave {
  /** The envelope text, as the game wrote it. */
  raw: string;
  /** Format version from the envelope. */
  version: number;
  /** When the game saved it. */
  savedAt: Date;
  /** Who and how far. */
  summary: SaveSummary;
}

/** The outcome of a write. */
export type WriteResult =
  | { kind: 'ok'; revision: number; savedAt: string }
  | { kind: 'conflict'; current: RemoteSlot }
  | { kind: 'missing' };

type SaveRow = typeof saves.$inferSelect;

/** A slot row as the API reports it. */
function remote(row: SaveRow): RemoteSlot {
  const live = row.data !== null;
  return {
    slot: row.slot as SaveSlotId,
    revision: row.revision,
    savedAt: row.savedAt.toISOString(),
    summary: live
      ? ({
          name: row.name,
          cls: row.cls,
          level: row.level,
          act: row.act,
          step: row.step,
          district: row.district,
          ngPlus: row.ngPlus,
        } as SaveSummary)
      : null,
  };
}

/** The columns a live save writes. */
function liveColumns(save: IncomingSave) {
  return {
    formatVersion: save.version,
    savedAt: save.savedAt,
    // json column: store the text as-is (see db/schema.ts).
    data: sql`${save.raw}::json`,
    ...save.summary,
    updatedAt: new Date(),
  };
}

/** Create a player. */
export async function createPlayer(db: Db, secretHash: string): Promise<{ id: string }> {
  const [row] = await db.insert(players).values({ secretHash }).returning({ id: players.id });
  return row!;
}

/** The player with this secret hash (and note that they were seen). */
export async function findPlayer(
  db: Db,
  secretHash: string,
): Promise<{ id: string; createdAt: Date } | null> {
  const [row] = await db
    .select({ id: players.id, createdAt: players.createdAt, lastSeenAt: players.lastSeenAt })
    .from(players)
    .where(eq(players.secretHash, secretHash));
  if (!row) return null;
  if (Date.now() - row.lastSeenAt.getTime() > 3600_000) {
    await db.update(players).set({ lastSeenAt: new Date() }).where(eq(players.id, row.id));
  }
  return { id: row.id, createdAt: row.createdAt };
}

/** Every slot the player has used, deleted ones included. */
export async function listSlots(db: Db, playerId: string): Promise<RemoteSlot[]> {
  const rows = await db.select().from(saves).where(eq(saves.playerId, playerId)).orderBy(saves.slot);
  return rows.map(remote);
}

/** One slot's head, with the save text. */
export async function getSlot(
  db: Db,
  playerId: string,
  slot: SaveSlotId,
): Promise<{ revision: number; savedAt: string; raw: string | null } | null> {
  const [row] = await db
    .select({
      revision: saves.revision,
      savedAt: saves.savedAt,
      raw: sql<string | null>`${saves.data}::text`,
    })
    .from(saves)
    .where(and(eq(saves.playerId, playerId), eq(saves.slot, slot)));
  return row ? { revision: row.revision, savedAt: row.savedAt.toISOString(), raw: row.raw } : null;
}

/** Store a save in a slot if `baseRevision` is still current (see the rules at the top). */
export function putSlot(
  db: Db,
  playerId: string,
  slot: SaveSlotId,
  save: IncomingSave,
  baseRevision: number | null,
): Promise<WriteResult> {
  return db.transaction(async tx => {
    const where = and(eq(saves.playerId, playerId), eq(saves.slot, slot));
    const [cur] = await tx.select().from(saves).where(where).for('update');
    if (cur && cur.data !== null && cur.revision !== baseRevision)
      return { kind: 'conflict', current: remote(cur) };
    const revision = (cur?.revision ?? 0) + 1;
    if (cur) {
      await tx
        .update(saves)
        .set({ ...liveColumns(save), revision })
        .where(where);
    } else {
      const inserted = await tx
        .insert(saves)
        .values({ playerId, slot, revision, ...liveColumns(save) })
        .onConflictDoNothing()
        .returning({ revision: saves.revision });
      if (!inserted.length) {
        // Another device created this slot a moment ago.
        const [now] = await tx.select().from(saves).where(where);
        return { kind: 'conflict', current: remote(now!) };
      }
    }
    await tx.insert(saveHistory).values({
      playerId,
      slot,
      revision,
      savedAt: save.savedAt,
      data: sql`${save.raw}::json`,
      summary: save.summary,
    });
    await trimHistory(tx, playerId, slot);
    return { kind: 'ok', revision, savedAt: save.savedAt.toISOString() };
  });
}

/** Delete a slot (leaving a tombstone) if `baseRevision` is still current. */
export function deleteSlot(
  db: Db,
  playerId: string,
  slot: SaveSlotId,
  baseRevision: number,
): Promise<WriteResult> {
  return db.transaction(async tx => {
    const where = and(eq(saves.playerId, playerId), eq(saves.slot, slot));
    const [cur] = await tx.select().from(saves).where(where).for('update');
    if (!cur) return { kind: 'missing' };
    if (cur.data !== null && cur.revision !== baseRevision) return { kind: 'conflict', current: remote(cur) };
    const savedAt = new Date();
    const revision = cur.revision + 1;
    await tx
      .update(saves)
      .set({
        revision,
        savedAt,
        data: null,
        formatVersion: null,
        name: null,
        cls: null,
        level: null,
        act: null,
        step: null,
        district: null,
        ngPlus: null,
        updatedAt: savedAt,
      })
      .where(where);
    return { kind: 'ok', revision, savedAt: savedAt.toISOString() };
  });
}

/** A slot's recent checkpoints, newest first. */
export async function slotHistory(
  db: Db,
  playerId: string,
  slot: SaveSlotId,
): Promise<{ revision: number; savedAt: string; summary: SaveSummary }[]> {
  const rows = await db
    .select({ revision: saveHistory.revision, savedAt: saveHistory.savedAt, summary: saveHistory.summary })
    .from(saveHistory)
    .where(and(eq(saveHistory.playerId, playerId), eq(saveHistory.slot, slot)))
    .orderBy(desc(saveHistory.revision))
    .limit(HISTORY_LIMIT);
  return rows.map(r => ({ ...r, savedAt: r.savedAt.toISOString() }));
}

/** Make an old checkpoint the slot's newest revision (itself a new checkpoint). */
export async function restoreCheckpoint(
  db: Db,
  playerId: string,
  slot: SaveSlotId,
  revision: number,
): Promise<WriteResult> {
  const [h] = await db
    .select({
      raw: sql<string>`${saveHistory.data}::text`,
      savedAt: saveHistory.savedAt,
      summary: saveHistory.summary,
      version: sql<number>`(${saveHistory.data}->>'version')::int`,
    })
    .from(saveHistory)
    .where(
      and(eq(saveHistory.playerId, playerId), eq(saveHistory.slot, slot), eq(saveHistory.revision, revision)),
    );
  if (!h) return { kind: 'missing' };
  const [cur] = await db
    .select({ revision: saves.revision })
    .from(saves)
    .where(and(eq(saves.playerId, playerId), eq(saves.slot, slot)));
  return putSlot(
    db,
    playerId,
    slot,
    { raw: h.raw, version: h.version, savedAt: h.savedAt, summary: h.summary },
    cur?.revision ?? null,
  );
}

/** Keep the newest HISTORY_LIMIT checkpoints of a slot. */
async function trimHistory(tx: Pick<Db, 'execute'>, playerId: string, slot: SaveSlotId): Promise<void> {
  await tx.execute(sql`
    delete from ${saveHistory}
    where ${saveHistory.playerId} = ${playerId} and ${saveHistory.slot} = ${slot}
      and ${saveHistory.id} not in (
        select ${saveHistory.id} from ${saveHistory}
        where ${saveHistory.playerId} = ${playerId} and ${saveHistory.slot} = ${slot}
        order by ${saveHistory.revision} desc
        limit ${HISTORY_LIMIT}
      )`);
}

/** Forget players who never kept a save, a while after they were created. Returns how many. */
export async function pruneIdlePlayers(db: Db, olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 86400_000);
  const gone = await db
    .delete(players)
    .where(
      and(
        lt(players.createdAt, cutoff),
        sql`not exists (select 1 from ${saves} where ${saves.playerId} = ${players.id} and ${saves.data} is not null)`,
      ),
    )
    .returning({ id: players.id });
  return gone.length;
}
