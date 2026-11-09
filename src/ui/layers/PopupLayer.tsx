import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { GLOSSARY, SKILLS, STATUSES } from '@content/index';
import { Button } from '../components/Button';
import { StatGrid } from '../components/StatGrid';
import { useFocusReturn } from '../components/useFocusReturn';
import { useApp, useView } from '../GameContext';
import s from './Dialog.module.css';

/**
 * A modal dialog: focus moves to its first button when it opens, Escape dismisses it, and the rest of
 * the app is inert behind it. PopupLayer gives focus back to the opener when the last one closes.
 */
function Dialog({
  title,
  onDismiss,
  children,
  className,
}: {
  title: string;
  onDismiss(): void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const dismiss = useRef(onDismiss);
  useLayoutEffect(() => {
    dismiss.current = onDismiss;
  });
  // Mount only (each popup is keyed by its id): re-running on every render pulled focus back to
  // the first button.
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      dismiss.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <div className={s.backdrop} data-testid="popup">
      <div
        ref={ref}
        className={`${s.card} ${className ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h4>{title}</h4>
        {children}
      </div>
    </div>
  );
}

/** The first queued dialog: confirm, level-up, lexicon term or status. */
export function PopupLayer() {
  const app = useApp();
  const v = useView();
  const p = v.popups[0];
  useFocusReturn(!!p);
  if (!p) return null;
  const done = (value?: unknown) => app.answerPopup(p.id, value);
  switch (p.kind) {
    case 'confirm':
      return (
        <Dialog key={p.id} title={p.title} onDismiss={() => done(false)}>
          <p>{p.body}</p>
          <div className={s.row}>
            <Button testId="no" variant="ghost" center onClick={() => done(false)}>
              {p.no}
            </Button>
            <Button testId="yes" variant="primary" onClick={() => done(true)}>
              {p.yes}
            </Button>
          </div>
        </Dialog>
      );
    case 'levelup': {
      const sk = p.up.newSkill ? SKILLS[p.up.newSkill] : null;
      return (
        <Dialog key={p.id} title={`LEVEL ${p.up.level}!`} onDismiss={() => done()} className={s.levelup}>
          <StatGrid stats={p.up.gains} gains />
          {sk && (
            <div className={s.newskill}>
              New skill: <b>{sk.name}</b>
              <div className="small">{sk.desc}</div>
            </div>
          )}
          <div className="small dim">Heart and Funk +30%.</div>
          <Button testId="ok" variant="primary" wide onClick={() => done()}>
            Play on ▸
          </Button>
        </Dialog>
      );
    }
    case 'lexicon': {
      const g = GLOSSARY[p.term];
      return (
        <Dialog key={p.id} title={g.term} onDismiss={() => done()}>
          {g.pron && <div className="dim">“{g.pron}”</div>}
          <p>{g.def}</p>
          <div className="dim small">{g.cat} · saved to your Lexicon</div>
          <Button testId="popup-close" variant="primary" wide onClick={() => done()}>
            OK
          </Button>
        </Dialog>
      );
    }
    case 'status': {
      const d = STATUSES[p.status];
      return (
        <Dialog key={p.id} title={d.name} onDismiss={() => done()}>
          <p>{d.desc}</p>
          <div className="dim small">
            {d.kind === 'good' ? 'Buff' : 'Debuff'} ·{' '}
            {d.untilTriggered ? 'until triggered' : `${d.turns} turns`}
          </div>
          <Button testId="popup-close" variant="primary" wide onClick={() => done()}>
            OK
          </Button>
        </Dialog>
      );
    }
  }
}
