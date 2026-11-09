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

/** What can take focus inside a sheet's body. */
const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The bottom-sheet frame: a modal dialog with a heading, back and close buttons, a scrolling body
 * and an optional footer.
 *
 * Focus moves in to `[data-autofocus]`, else the body's first control, else the body itself (it's
 * focusable so the keyboard can scroll it); SheetLayer gives focus back to the opener on close.
 * Escape closes the sheet unless a dialog is open on top of it (the dialog takes that Escape).
 */
export function Sheet({ title, lead, back, foot, children }: Props) {
  const app = useApp();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const card = ref.current;
    const body = card?.querySelector<HTMLElement>('.' + s.body);
    const target =
      card?.querySelector<HTMLElement>('[data-autofocus]') ??
      body?.querySelector<HTMLElement>(FOCUSABLE) ??
      body;
    target?.focus({ preventScroll: true });
    body?.scrollTo(0, 0);
  }, [title]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented || app.view.popups.length > 0) return;
      app.closeSheet();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [app]);
  return (
    <div className={s.backdrop} data-testid="sheet">
      <div ref={ref} className={s.card} role="dialog" aria-modal="true" aria-label={title}>
        <div className={s.head}>
          {lead}
          <h2>{title}</h2>
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
        <div className={s.body} tabIndex={0}>
          {children}
        </div>
        {foot && <div className={s.foot}>{foot}</div>}
      </div>
    </div>
  );
}
