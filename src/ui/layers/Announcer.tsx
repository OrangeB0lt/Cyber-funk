import { useCallback, useEffect, useRef, useState } from 'react';
import { plainText } from '@app/lexicon';
import { useView } from '../GameContext';

/** How many announcements stay in the region (older ones are dropped; they were already read). */
const KEEP = 6;

/**
 * What a screen reader hears as the story goes: each new story line once, as it starts (with the
 * speaker's name), a new screen's title, the battle outcome, and timing results. It's a visually
 * hidden polite log outside the inert regions.
 *
 * The visible transcript isn't a live region: the Typewriter swaps its text when typing ends, which
 * made a live transcript read every line twice. The board (the crawfish race) isn't announced frame
 * by frame; the race's result is narrated as a line.
 */
export function Announcer() {
  const v = useView();
  const [said, setSaid] = useState<{ key: number; text: string }[]>([]);
  const lastLine = useRef(0);
  const count = useRef(0);
  const say = useCallback((text: string) => {
    const key = ++count.current;
    setSaid(s => [...s, { key, text }].slice(-KEEP));
  }, []);

  const lines = v.lines;
  useEffect(() => {
    for (const l of lines) {
      if (l.id <= lastLine.current) continue;
      lastLine.current = l.id;
      if (l.kind === 'board' || l.kind === 'you') continue;
      say((l.who ? `${l.who}: ` : '') + plainText(l.text));
    }
  }, [lines, say]);

  useEffect(() => {
    if (v.title) say(v.title);
  }, [v.title, say]);

  const outcome = v.outcome;
  useEffect(() => {
    if (!outcome) return;
    const text =
      outcome.kind === 'victory'
        ? [outcome.title, ...outcome.rows.map(r => `${r.label} ${r.value}`), ...outcome.notes].join('. ')
        : [outcome.title, outcome.text, outcome.cost].filter(Boolean).join(' ');
    say(text);
  }, [outcome, say]);

  const t = v.timing;
  const result = !t
    ? null
    : t.kind === 'auto'
      ? t.grade.label
      : t.kind === 'bar'
        ? (t.result?.label ?? null)
        : t.result;
  useEffect(() => {
    if (result) say(result);
  }, [result, t?.id, say]);

  return (
    <div className="sr-only" role="log" aria-live="polite" data-testid="announcer">
      {said.map(a => (
        <p key={a.key}>{a.text}</p>
      ))}
    </div>
  );
}
