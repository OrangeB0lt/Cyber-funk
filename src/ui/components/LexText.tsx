import { useMemo } from 'react';
import { parseLex, type LexPart } from '@app/lexicon';
import { useApp } from '../GameContext';
import s from './LexText.module.css';

/**
 * Narration with lexicon links. `shown` reveals only the first N characters (the typewriter);
 * the rest is laid out but invisible, so the paragraph doesn't jump as it types. `inert` renders terms
 * as plain text (for the mid-typing copy hidden from screen readers).
 */
export function LexText({ text, shown, inert }: { text: string; shown?: number; inert?: boolean }) {
  const app = useApp();
  // Each part with its character offset, so `shown` can cut through the right one.
  const parts = useMemo(
    () =>
      parseLex(text).reduce<(LexPart & { start: number })[]>((acc, p) => {
        const last = acc[acc.length - 1];
        acc.push({ ...p, start: last ? last.start + last.text.length : 0 });
        return acc;
      }, []),
    [text],
  );
  return (
    <>
      {parts.map((p, i) => {
        const start = p.start;
        const visible =
          shown === undefined ? p.text.length : Math.max(0, Math.min(p.text.length, shown - start));
        const seen = p.text.slice(0, visible);
        const rest = p.text.slice(visible);
        const body = (
          <>
            {seen}
            {rest && (
              <span className={s.hidden} aria-hidden="true">
                {rest}
              </span>
            )}
          </>
        );
        return p.term && !inert ? (
          <button
            key={i}
            type="button"
            className={s.lex}
            data-testid={`lex:${p.term}`}
            onClick={e => {
              e.stopPropagation();
              app.showTerm(p.term!);
            }}
          >
            {body}
          </button>
        ) : (
          <span key={i}>{body}</span>
        );
      })}
    </>
  );
}
