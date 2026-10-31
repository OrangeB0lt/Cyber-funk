import type { CSSProperties } from 'react';
import type { StatusId } from '@core/ids/combat';
import { STATUSES } from '@content/index';
import { useApp } from '../GameContext';
import s from './Chips.module.css';

/** Status chips. Tapping one explains it. */
export function StatusChips({
  statuses,
  guard,
}: {
  statuses: readonly { id: StatusId; turns: number }[];
  guard?: boolean;
}) {
  const app = useApp();
  return (
    <div className={s.chips}>
      {statuses.map(st => {
        const d = STATUSES[st.id];
        return (
          <button
            key={st.id}
            type="button"
            className={s.chip}
            style={{ '--c': d.color } as CSSProperties}
            data-testid={`status:${st.id}`}
            onClick={() => app.showStatus(st.id)}
          >
            {d.name}
            {d.untilTriggered ? '' : ` ${st.turns}`}
          </button>
        );
      })}
      {guard && (
        <span className={s.chip} style={{ '--c': 'var(--cyan)' } as CSSProperties}>
          Guarding
        </span>
      )}
    </div>
  );
}
