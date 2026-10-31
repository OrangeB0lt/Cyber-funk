import { useView } from '../GameContext';
import s from './Toast.module.css';

/** The latest short message. Announced politely to screen readers. */
export function Toast() {
  const v = useView();
  return (
    <div aria-live="polite" aria-atomic="true">
      {v.toast && (
        <div key={v.toast.id} className={s.toast} data-testid="toast">
          {v.toast.text}
        </div>
      )}
    </div>
  );
}
