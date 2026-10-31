/**
 * Lexicon linking: turns narration into text and term segments. Explicit [[key]] / [[key|display]]
 * markup links to a glossary entry; plain words that match a glossary key link automatically (longest
 * match first, once per text) unless the entry is `noauto`. Behavior matches v1's parseLex.
 */
import type { GlossaryId } from '@core/ids/world';
import { GLOSSARY } from '@content/index';

/** A run of text, linked to a lexicon term or not. */
export interface LexPart {
  /** The text shown. */
  text: string;
  /** The term it links to. */
  term?: GlossaryId;
}

let autoRe: RegExp | null = null;
function autoRegex(): RegExp {
  if (autoRe) return autoRe;
  const keys = (Object.keys(GLOSSARY) as GlossaryId[])
    .filter(k => !GLOSSARY[k].noauto)
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]"));
  autoRe = new RegExp('(^|[^\\p{L}\\p{N}])(' + keys.join('|') + ')(?![\\p{L}\\p{N}])', 'giu');
  return autoRe;
}

function auto(text: string, seen: Set<string>, out: LexPart[]): void {
  const re = autoRegex();
  re.lastIndex = 0;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = m[2]!.toLowerCase().replace(/\u2019/g, "'") as GlossaryId;
    if (!GLOSSARY[key] || seen.has(key)) continue;
    seen.add(key);
    const start = m.index + m[1]!.length;
    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ text: m[2]!, term: key });
    last = start + m[2]!.length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
}

/** Split text into plain and linked parts. */
export function parseLex(text: string): LexPart[] {
  const out: LexPart[] = [];
  const seen = new Set<string>();
  const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) auto(text.slice(last, m.index), seen, out);
    const key = m[1]!.trim().toLowerCase();
    seen.add(key);
    out.push({ text: m[2] || m[1]!, term: key in GLOSSARY ? (key as GlossaryId) : undefined });
    last = re.lastIndex;
  }
  if (last < text.length) auto(text.slice(last), seen, out);
  return out;
}

/** Text with markup removed (button labels). */
export function plainText(text: string): string {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_m, a: string, b?: string) => b || a);
}
