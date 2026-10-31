/**
 * Loads the full legacy game (legacy/dist/cyberfunk.html) into jsdom with a controllable
 * Math.random, for the two oracles that need code living in the legacy UI layer:
 *
 * - the rule oracle calls UI-resident rules directly (buildEnemies, useFieldItem, shop pricing…)
 * - the transcript oracle runs scenes and records every line, choice, toast and sheet they produce
 *
 * Top-level `function` declarations are window globals; `const`/`let` globals are reached through
 * `window.CF` (S, UI, the tables) or by evaluating an expression in the page (`evaluate`).
 * Deleted at cutover.
 */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';
import { LEGACY_SRC } from './legacy';

const HTML = path.join(LEGACY_SRC, '..', 'dist', 'cyberfunk.html');

export interface LegacyDom {
  /** The page's window. Globals declared with `function` live here. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  w: any;
  /** Replace the page's Math.random source. */
  setRandom(fn: () => number): void;
  /** Evaluate an expression in the page's global scope (reaches `const` globals like G or S). */
  evaluate<T = unknown>(expr: string): T;
  /** Errors the page logged or threw. */
  errors: string[];
  close(): void;
}

export function loadLegacyDom(): LegacyDom {
  let random: () => number = () => 0.5;
  const errors: string[] = [];
  const vc = new VirtualConsole();
  vc.on('error', (...a: unknown[]) => errors.push(a.map(String).join(' ')));
  vc.on('jsdomError', (e: Error) => {
    if (/Could not load|Not implemented/.test(String(e))) return;
    errors.push(`jsdomError: ${e.message}`);
  });
  const dom = new JSDOM(fs.readFileSync(HTML, 'utf8'), {
    url: 'https://cyberfunk.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      Object.defineProperty(window.Math, 'random', { value: () => random(), configurable: true });
    },
  });
  const w = dom.window as unknown as Record<string, unknown> & { eval(src: string): unknown };
  return {
    w,
    setRandom(fn) {
      random = fn;
    },
    evaluate: <T>(expr: string) => w.eval(expr) as T,
    errors,
    close: () => dom.window.close(),
  };
}
