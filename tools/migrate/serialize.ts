/**
 * Turns legacy table values into TypeScript source text. One-time migration tooling
 * (tools/migrate), deleted at cutover. The output is formatted afterwards by Prettier.
 */

/** Key renames applied while serializing (legacy name → 2.0 name). See ADR-0003. */
export const KEY_RENAMES: Record<string, string> = {
  fx: 'effects',
  k: 'kind',
  amt: 'amount',
  use: 'effects',
};

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export interface SerializeOptions {
  /** Called for function values; returns replacement source text. */
  fn?: (f: (...args: unknown[]) => unknown, path: string[]) => string;
  /** Rename keys (applied to every object). */
  renames?: Record<string, string>;
  /** Value rewrites by key, e.g. effect kind 'fn' → 'custom'. */
  rewrite?: (key: string, value: unknown, path: string[]) => unknown;
  /** Keys to drop entirely. */
  drop?: (key: string, path: string[]) => boolean;
}

export function serialize(value: unknown, opts: SerializeOptions = {}, path: string[] = []): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'function') {
    return opts.fn ? opts.fn(value as (...args: unknown[]) => unknown, path) : value.toString();
  }
  if (Array.isArray(value))
    return `[${value.map((v, i) => serialize(v, opts, [...path, String(i)])).join(', ')}]`;
  const entries: string[] = [];
  for (const [rawKey, rawVal] of Object.entries(value as Record<string, unknown>)) {
    if (opts.drop?.(rawKey, path)) continue;
    const key = opts.renames?.[rawKey] ?? rawKey;
    const val = opts.rewrite ? opts.rewrite(rawKey, rawVal, path) : rawVal;
    if (typeof val === 'function' && !opts.fn) {
      entries.push(val.toString());
      continue;
    }
    const k = IDENT.test(key) ? key : JSON.stringify(key);
    entries.push(`${k}: ${serialize(val, opts, [...path, key])}`);
  }
  return `{ ${entries.join(', ')} }`;
}

/** `[ 'a', 'b' ] as const` source for an id list. */
export function idList(ids: string[]): string {
  return `[${ids.map(i => JSON.stringify(i)).join(', ')}] as const`;
}
