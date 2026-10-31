/**
 * The browser's client for the cloud-save API (server/routes). Every call resolves, never throws:
 * a network failure or a timeout is `{ kind: 'offline' }`, so the sync loop can treat "no signal"
 * as an ordinary state. Responses are parsed with the shared protocol schemas.
 */
import type { z } from 'zod';
import type { SaveSlotId } from '@core/ids/saves';
import {
  conflictResponse,
  createPlayerResponse,
  getSlotResponse,
  healthResponse,
  historyResponse,
  listSlotsResponse,
  meResponse,
  rejectedResponse,
  writeOkResponse,
  type RemoteSlot,
} from './protocol';

/** What a call came back with. */
export type CloudResult<T> =
  | { kind: 'ok'; data: T }
  /** Another device moved the slot on (409). */
  | { kind: 'conflict'; current: RemoteSlot }
  /** The server can't load this save (422). */
  | { kind: 'rejected'; reason: z.infer<typeof rejectedResponse>['reason'] }
  /** The secret isn't a player the server knows (401). */
  | { kind: 'unauthorized' }
  /** Nothing there (404). */
  | { kind: 'missing' }
  /** No connection, a timeout, or the server is down. */
  | { kind: 'offline' }
  /** Anything else (a bug or a server error). */
  | { kind: 'error'; status: number };

/** A slot's head with its save text. */
export type SlotHead = z.infer<typeof getSlotResponse>;
/** A new slot head after a write. */
export type WriteOk = z.infer<typeof writeOkResponse>;
/** A checkpoint in a slot's history. */
export type HistoryEntry = z.infer<typeof historyResponse>['entries'][number];

/** The cloud-save API (CloudApi talks HTTP; tests substitute a fake). */
export interface CloudClient {
  /** Is the server up? */
  health(): Promise<CloudResult<z.infer<typeof healthResponse>>>;
  /** Create an anonymous player. */
  createPlayer(): Promise<CloudResult<z.infer<typeof createPlayerResponse>>>;
  /** Check a secret. */
  me(secret: string): Promise<CloudResult<z.infer<typeof meResponse>>>;
  /** Every slot the player has used. */
  listSlots(secret: string): Promise<CloudResult<RemoteSlot[]>>;
  /** One slot with its save text. */
  getSlot(secret: string, slot: SaveSlotId): Promise<CloudResult<SlotHead>>;
  /** Write a slot, based on `baseRevision`. */
  putSlot(
    secret: string,
    slot: SaveSlotId,
    raw: string,
    baseRevision: number | null,
  ): Promise<CloudResult<WriteOk>>;
  /** Delete a slot, based on `baseRevision`. */
  deleteSlot(secret: string, slot: SaveSlotId, baseRevision: number): Promise<CloudResult<WriteOk>>;
  /** A slot's recent checkpoints, newest first. */
  history(secret: string, slot: SaveSlotId): Promise<CloudResult<HistoryEntry[]>>;
  /** Make a checkpoint the slot's newest revision. */
  restore(secret: string, slot: SaveSlotId, revision: number): Promise<CloudResult<WriteOk>>;
}

/** Options for the HTTP client. */
export interface CloudApiOptions {
  /** Where the API lives (same origin by default). */
  base?: string;
  /** fetch (tests pass one that calls the server in-process). */
  fetch?: typeof fetch;
  /** Give up on a request after this long. */
  timeoutMs?: number;
}

/** The cloud-save API over HTTP. */
export class CloudApi implements CloudClient {
  private readonly base: string;
  private readonly fetchFn: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: CloudApiOptions = {}) {
    this.base = opts.base ?? '/api';
    this.fetchFn = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.timeoutMs = opts.timeoutMs ?? 8000;
  }

  health() {
    return this.call('GET', '/health', null, undefined, healthResponse);
  }
  createPlayer() {
    return this.call('POST', '/players', null, undefined, createPlayerResponse);
  }
  me(secret: string) {
    return this.call('GET', '/players/me', secret, undefined, meResponse);
  }
  async listSlots(secret: string): Promise<CloudResult<RemoteSlot[]>> {
    const r = await this.call('GET', '/slots', secret, undefined, listSlotsResponse);
    return r.kind === 'ok' ? { kind: 'ok', data: r.data.slots } : r;
  }
  getSlot(secret: string, slot: SaveSlotId) {
    return this.call('GET', `/slots/${slot}`, secret, undefined, getSlotResponse);
  }
  putSlot(secret: string, slot: SaveSlotId, raw: string, baseRevision: number | null) {
    return this.call('PUT', `/slots/${slot}`, secret, { raw, baseRevision }, writeOkResponse);
  }
  deleteSlot(secret: string, slot: SaveSlotId, baseRevision: number) {
    return this.call(
      'DELETE',
      `/slots/${slot}?baseRevision=${baseRevision}`,
      secret,
      undefined,
      writeOkResponse,
    );
  }
  async history(secret: string, slot: SaveSlotId): Promise<CloudResult<HistoryEntry[]>> {
    const r = await this.call('GET', `/slots/${slot}/history`, secret, undefined, historyResponse);
    return r.kind === 'ok' ? { kind: 'ok', data: r.data.entries } : r;
  }
  restore(secret: string, slot: SaveSlotId, revision: number) {
    return this.call('POST', `/slots/${slot}/restore`, secret, { revision }, writeOkResponse);
  }

  private async call<S extends z.ZodType>(
    method: string,
    path: string,
    secret: string | null,
    body: unknown,
    ok: S,
  ): Promise<CloudResult<z.output<S>>> {
    const headers: Record<string, string> = {};
    if (secret) headers.authorization = `Bearer ${secret}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    let res: Response;
    let json: unknown;
    try {
      res = await this.fetchFn(this.base + path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      json = await res.json().catch(() => null);
    } catch {
      return { kind: 'offline' };
    }
    if (res.ok) {
      const parsed = ok.safeParse(json);
      return parsed.success ? { kind: 'ok', data: parsed.data } : { kind: 'error', status: res.status };
    }
    switch (res.status) {
      case 409: {
        const c = conflictResponse.safeParse(json);
        return c.success ? { kind: 'conflict', current: c.data.current } : { kind: 'error', status: 409 };
      }
      case 422: {
        const r = rejectedResponse.safeParse(json);
        return r.success ? { kind: 'rejected', reason: r.data.reason } : { kind: 'error', status: 422 };
      }
      case 401:
        return { kind: 'unauthorized' };
      case 404:
        return { kind: 'missing' };
      case 502:
      case 503:
      case 504:
        return { kind: 'offline' };
      default:
        return { kind: 'error', status: res.status };
    }
  }
}
