import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { useApp } from '../GameContext';
import s from './Sheet.module.css';

interface Props {
  /** Heading. */
  title: string;
  /** Shown before the heading (a shopkeeper's portrait). */
  lead?: ReactNode;
  /** Show "‹ Menu" (sheets opened from the menu). */
  back?: boolean;
  /** Pinned footer (e.g. How to Play's start button). */
  foot?: ReactNode;
  children: ReactNode;
}

/**
 * The bottom-sheet frame: a modal dialog with a heading, back and close buttons, a scrolling body
 * and an optional footer. Escape closes it.
 */
export function Sheet({ title, lead, back, foot, children }: Props) {
  const app = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus({ preventScroll: true });
    ref.current?.querySelector('.' + s.body)?.scrollTo(0, 0);
  }, [title]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') app.closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app]);
  return (
    <div className={s.backdrop} data-testid="sheet">
      <div ref={ref} className={s.card} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.head}>
          {lead}
          <h3>{title}</h3>
          {back && (
            <Button testId="sheet-back" small variant="ghost" onClick={() => app.openSheet({ kind: 'menu' })}>
              ‹ Menu
            </Button>
          )}
          <Button
            testId="sheet-close"
            small
            variant="ghost"
            className={s.close}
            aria-label="Close"
            onClick={() => app.closeSheet()}
          >
            ✕
          </Button>
        </div>
        <div className={s.body}>{children}</div>
        {foot && <div className={s.foot}>{foot}</div>}
      </div>
    </div>
  );
}
