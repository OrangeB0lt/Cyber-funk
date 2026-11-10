# Server and cloud saves

*How saves get from a phone to PostgreSQL and back: the API, the database, the sync rules, and where each piece lives. Why it's built this way: [ADR-0006](../adr/0006-server-and-cloud-saves.md). How to run it: [docker.md](../guides/docker.md).*

## The pieces

```
Browser                                                     server/ (Node, Fastify)            PostgreSQL
───────                                                     ───────────────────────            ──────────
Session.save() ─► SaveSlots (localStorage, sync) ─► CloudSync ─► CloudApi ─HTTP─► routes/ ─► repo/saves.ts ─► players
                     src/app/save/slots.ts        sync.ts      cloud.ts           (Zod: protocol.ts)          saves
                                                                                  decodeSave (format.ts)      save_history
```

| File | Role |
|---|---|
| `src/app/save/format.ts` | The save envelope, its Zod schema, `decodeSave`, `summarize`. Shared with the server. |
| `src/app/save/protocol.ts` | The API contract (Zod schemas) and the player-code encoding. Shared with the server. |
| `src/app/save/slots.ts` | Three slots on the device, plus sync bookkeeping per slot. |
| `src/app/save/cloud.ts` | The HTTP client. Every call resolves: offline is a result, not an exception. |
| `src/app/save/sync.ts` | `CloudSync`: upload, download, conflicts, linking. No React. |
| `server/app.ts` | `buildApp()`: routes, rate limits, security headers, static files. |
| `server/routes/*.ts` | Health, players, slots. Thin: parse, authenticate, call the repo. |
| `server/repo/saves.ts` | The rules, in SQL transactions. |
| `server/db/schema.ts` | The tables (Drizzle). Migrations are in `server/db/migrations/`. |
| `server/index.ts` | Startup: env → migrate (with retries) → listen → daily pruning. |

Import rules (dependency-cruiser):
- `server/` may use `src/core/*` and the two shared save files, nothing else from the game.
- `format.ts` and `protocol.ts` import only core and Zod.
- `src/` never imports `server/`.

## API

All routes are under `/api`, with JSON in and out. Every route except `health` and `POST /players` needs `Authorization: Bearer <secret>`; the formatted player code is accepted too. Responses are `Cache-Control: no-store`.

| Route | Answer |
|---|---|
| `GET /health` | `{ok, db, version}`; 503 if the database is unreachable |
| `POST /players` | 201 `{playerId, secret}`; 10 per hour per IP |
| `GET /players/me` | `{playerId, createdAt}` (checks a code before linking) |
| `GET /slots` | `{slots: [{slot, revision, savedAt, summary \| null}]}`. A null summary means deleted. |
| `GET /slots/:slot` | `{revision, savedAt, raw \| null}` or 404 |
| `PUT /slots/:slot` | body `{raw, baseRevision}` → 200 `{revision, savedAt}` · 409 `{error:'conflict', current}` · 422 `{error:'rejected', reason}` |
| `DELETE /slots/:slot?baseRevision=n` | 200 · 409 · 404 |
| `GET /slots/:slot/history` | `{entries: [{revision, savedAt, summary}]}`, newest first, up to 20 |
| `POST /slots/:slot/restore` | body `{revision}` → 200 (a new head) or 404 |

Bodies are capped at 256 KB (a save is a few KB). The whole API allows 300 requests a minute per IP.

## Database

```
players      id uuid PK · secret_hash text UNIQUE · created_at · last_seen_at
saves        (player_id, slot) PK · revision · format_version · saved_at · data json (NULL = deleted)
             · name · cls · level · act · step · district · ng_plus · updated_at
save_history id · player_id · slot · revision · saved_at · data json · summary jsonb · created_at
```

- **`data` is `json`, not `jsonb`.** It keeps the envelope's text exactly as the game wrote it. You can still query into it: `data->'game'->>'name'`.
- **The summary columns** answer everyday questions without parsing saves:

  ```sql
  select cls, count(*) from saves where data is not null group by cls;
  ```
- **Players are deleted with their saves** (`on delete cascade`). Players older than 30 days that never kept a save are pruned daily.

**Changing the schema:**
1. Edit `server/db/schema.ts`.
2. Run `npm run db:generate`; it writes `server/db/migrations/NNNN_*.sql`.
3. Review the SQL and commit both.
4. The server applies pending migrations at startup, under an advisory lock.
5. Never edit a migration that has shipped.

## Sync rules

Each slot on the device has bookkeeping (`cyberfunk_sync_v2:<slot>`):
- `baseRevision`: the server revision this copy is based on.
- `dirty`: the device has changes the server hasn't seen. A dirty slot with no save is a delete waiting to upload.

**Upload.** It runs after every save, debounced by 1 s, one slot at a time. It sends the slot with its `baseRevision`.

| Server answers | Device does |
|---|---|
| 200 | stores the new revision; clean, unless another save landed meanwhile, which uploads next |
| 409 | records a **conflict** for that slot and stops uploading it until the player chooses |
| 422 | stops retrying that slot until it changes (a save this server can't read) |
| 401 | the server forgot this player: start a new one and upload everything |
| no answer | marks itself offline and retries after 2 s, 4 s, 8 s … up to 5 minutes, and immediately when the browser reports it's back online |

**Download.** It runs at boot, when going back to the title, when the page becomes visible, and on reconnecting. It lists the server's slots and compares each one:

| Server vs device | Result |
|---|---|
| same revision | nothing (upload if dirty) |
| server moved on, device clean, not being played | take the server's copy |
| server moved on, device dirty | conflict |
| server moved on, but the slot is the running game's | conflict (never swap a save under a running game) |
| server deleted it, device has changes | the device wins: a write over a deletion always succeeds |
| server has never seen the slot | anything on the device uploads |

**The server's side.** `putSlot` locks the slot row (`SELECT … FOR UPDATE`). It refuses a write whose base isn't the live revision, but always accepts writes over an empty or deleted slot. Every successful write also adds a history row, and the slot's history is trimmed to 20.

**Conflicts in the UI.** `GameApp.settleConflicts` asks about one slot at a time, never during a battle (it waits for the route to settle):
- The running game's slot: **Load theirs**, or **Keep mine** (the next save replaces theirs).
- Any other slot: **Use theirs** or **Keep mine**.
- The prompt is cancelled when going to the title, and asked again after the next sync.

**Player codes.**
- The secret is 15 random bytes in Crockford base32: 24 characters, shown as `CFP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX`.
- Typing is forgiving: any case, with or without dashes, I and L read as 1, O as 0.
- **Linking** a device clears its revisions and reconciles every slot: slots only on the device upload, slots only on the server download, slots on both ask.
- **Unlinking** forgets the player on the device. The saves stay on the server and on the device, and the device starts a new player at its next save.

## Security notes

- Secrets are random, so a SHA-256 is enough; a slow hash isn't needed. A leaked database can't be used to load anyone's saves.
- Bearer tokens, no cookies, same origin, no CORS headers. CSRF has nothing to ride on.
- The CSP allows `'self'` only, plus inline styles for React's style attributes. `X-Frame-Options: DENY` and `nosniff` are set too.
- Uploads are size-capped and validated with the game's own schema before they touch the database.
- Rate limits: 300 requests per minute per IP, and 10 new players per hour per IP. The stack runs the app behind Caddy with `TRUST_PROXY=true`, so these see the client's IP.
- TLS: Caddy terminates it in front of the app (compose.yaml, [docker.md](../guides/docker.md#play-and-install-on-your-phone)).
- **Optional Google sign-in gateway** ([ADR-0008](../adr/0008-google-sign-in-gateway.md), [docker.md](../guides/docker.md#require-google-sign-in)). `compose.auth.yaml` puts oauth2-proxy in front of everything except the manifest and icons, and only allowlisted Google accounts get in. The server doesn't know it's there. A signed-out `/api` request gets **503** `{"error":"signed-out"}` from Caddy, not 401, because a 401 makes `CloudSync` forget the device's player. A 503 reads as offline. The service worker leaves `/oauth2/*` navigations to the network, so an installed app can still sign in again.
- **Not covered yet:** rotating a leaked code. A future `POST /players/me/rotate`.
