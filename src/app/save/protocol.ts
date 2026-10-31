/**
 * The cloud-save API contract, shared by the browser (cloud.ts) and the server (server/routes). Both
 * sides parse with these schemas, so a change here is a change to both, checked by the compiler.
 * Like format.ts, this module is DOM-free and imports only core and Zod.
 *
 * Players are anonymous: a device gets a random secret the first time it syncs, and that secret is
 * the only credential (sent as `Authorization: Bearer <secret>`). Shown to the player it is the
 * "player code", which links another device to the same saves. See docs/architecture/server.md.
 */
import { z } from 'zod';
import { CLASS_IDS } from '@core/ids/characters';
import { isSaveSlot, type SaveSlotId } from '@core/ids/saves';
import { ACT_ORDER, type ActId } from '@core/ids/story';
import { DISTRICT_IDS } from '@core/ids/world';

/** Crockford base32: no I, L, O or U, so a code survives being read aloud or handwritten. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
/** Bytes in a player secret (120 bits). */
export const SECRET_BYTES = 15;
/** Characters in a player secret (base32 of SECRET_BYTES). */
export const SECRET_LENGTH = (SECRET_BYTES * 8) / 5;
/** Prefix of a player code as shown to the player. */
export const PLAYER_CODE_PREFIX = 'CFP-';

/** Base32-encode random bytes into a secret. */
export function encodeSecret(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** The player code for a secret: CFP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX. */
export function formatPlayerCode(secret: string): string {
  return PLAYER_CODE_PREFIX + (secret.match(/.{1,4}/g) ?? []).join('-');
}

/**
 * The secret in a typed or pasted player code, or null if it isn't one. Forgiving like Crockford
 * base32 intends: any case, spaces and dashes ignored, I/L read as 1 and O as 0.
 */
export function parsePlayerCode(text: string): string | null {
  let t = text.trim().toUpperCase();
  if (t.startsWith(PLAYER_CODE_PREFIX)) t = t.slice(PLAYER_CODE_PREFIX.length);
  t = t.replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0');
  if (t.length !== SECRET_LENGTH) return null;
  for (const ch of t) if (!ALPHABET.includes(ch)) return null;
  return t;
}

/** A slot number. */
export const slotIdSchema = z.custom<SaveSlotId>(isSaveSlot, 'not a save slot');
/** A slot number in a URL. */
export const slotParamSchema = z.object({ slot: z.coerce.number().pipe(slotIdSchema) });

/** A save's summary (see format.ts `summarize`). */
export const saveSummarySchema = z.object({
  name: z.string(),
  cls: z.enum(CLASS_IDS),
  level: z.number().int(),
  act: z.enum(ACT_ORDER as [ActId, ...ActId[]]),
  step: z.string(),
  district: z.enum(DISTRICT_IDS),
  ngPlus: z.number().int(),
});

/** One slot as the server has it. A null summary means the slot was deleted (revisions keep counting). */
export const remoteSlotSchema = z.object({
  slot: slotIdSchema,
  revision: z.number().int().min(1),
  savedAt: z.string(),
  summary: saveSummarySchema.nullable(),
});
/** A slot on the server. */
export type RemoteSlot = z.infer<typeof remoteSlotSchema>;

/** POST /api/players: a new anonymous player. The secret is returned once and never stored in clear. */
export const createPlayerResponse = z.object({
  playerId: z.uuid(),
  secret: z.string().length(SECRET_LENGTH),
});

/** GET /api/players/me. */
export const meResponse = z.object({ playerId: z.uuid(), createdAt: z.string() });

/** GET /api/slots: every slot the player has used (deleted ones included, so devices learn of it). */
export const listSlotsResponse = z.object({ slots: z.array(remoteSlotSchema) });

/** GET /api/slots/:slot. `raw` is the save envelope text, or null when the slot was deleted. */
export const getSlotResponse = z.object({
  revision: z.number().int().min(1),
  savedAt: z.string(),
  raw: z.string().nullable(),
});

/** PUT /api/slots/:slot. `baseRevision` is the revision this device last agreed with (null: none). */
export const putSlotRequest = z.object({
  raw: z.string().min(2),
  baseRevision: z.number().int().min(1).nullable(),
});

/** DELETE /api/slots/:slot?baseRevision=n. */
export const deleteSlotQuery = z.object({ baseRevision: z.coerce.number().int().min(1) });

/** 200 from PUT, DELETE and restore: the slot's new head. */
export const writeOkResponse = z.object({ revision: z.number().int().min(1), savedAt: z.string() });

/** 409 from PUT and DELETE: another device moved the slot on; here is what it holds now. */
export const conflictResponse = z.object({ error: z.literal('conflict'), current: remoteSlotSchema });

/** 422 from PUT: the save isn't one this server's game version can load (format.ts LoadError). */
export const rejectedResponse = z.object({
  error: z.literal('rejected'),
  reason: z.enum(['corrupt', 'too-new', 'invalid']),
});

/** GET /api/slots/:slot/history: the newest checkpoints first. */
export const historyResponse = z.object({
  entries: z.array(z.object({ revision: z.number().int(), savedAt: z.string(), summary: saveSummarySchema })),
});

/** POST /api/slots/:slot/restore: make an old checkpoint the slot's newest revision. */
export const restoreRequest = z.object({ revision: z.number().int().min(1) });

/** GET /api/health. */
export const healthResponse = z.object({ ok: z.boolean(), db: z.boolean(), version: z.string() });

/** Most checkpoints the server keeps per slot. */
export const HISTORY_LIMIT = 20;
