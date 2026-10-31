import type { ReactNode } from 'react';
import s from './ItemRow.module.css';

/** A list row: info on the left, an action (button or note) on the right. */
export function ItemRow({
  children,
  action,
  equipped,
}: {
  children: ReactNode;
  action?: ReactNode;
  equipped?: boolean;
}) {
  return (
    <div className={`${s.row} ${equipped ? s.equipped : ''}`}>
      <div className={s.info}>{children}</div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}
