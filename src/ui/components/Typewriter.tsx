import { useEffect, useMemo, useState } from 'react';
import { parseLex, plainText } from '@app/lexicon';
import { useApp } from '../GameContext';
import { LexText } from './LexText';

/** Milliseconds per character for each text speed. */
const SPEED = { slow: 34, normal: 16, fast: 7, instant: 0 } as const;

/**
 * Types a line out character by character, then reports it done. Screen readers get the whole line
 * at once (the visual characters are hidden from them).
 */
export function Typewriter({ id, text, typed }: { id: number; text: string; typed: boolean }) {
  const app = useApp();
  const length = useMemo(() => parseLex(text).reduce((n, p) => n + p.text.length, 0), [text]);
  const speed = SPEED[app.settings().textSpeed];
  const [shown, setShown] = useState(typed || !speed ? length : 0);

  useEffect(() => {
    app.sawTerms(parseLex(text).flatMap(p => (p.term ? [p.term] : [])));
  }, [app, text]);

  useEffect(() => {
    if (typed || shown >= length) {
      if (!typed) app.presenter.typed(id);
      return;
    }
    const t = setTimeout(() => setShown(n => n + 1), speed);
    return () => clearTimeout(t);
  }, [app, id, typed, shown, length, speed]);

  if (typed || shown >= length) return <LexText text={text} />;
  return (
    <>
      <span className="sr-only">{plainText(text)}</span>
      <span aria-hidden="true">
        <LexText text={text} shown={shown} inert />
      </span>
    </>
  );
}
