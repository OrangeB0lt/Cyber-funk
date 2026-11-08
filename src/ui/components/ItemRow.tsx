import type { ReactNode } from 'react';
import s from './ItemRow.module.css';

/** A list row: an optional lead (a portrait), info, and an action (button or note) on the right. */
export function ItemRow({
  children,
  lead,
  action,
  equipped,
}: {
  children: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  equipped?: boolean;
}) {
  return (
    <div className={`${s.row} ${equipped ? s.equipped : ''}`}>
      {lead && <div className={s.lead}>{lead}</div>}
      <div className={s.info}>{children}</div>
      {action && <div className={s.action}>{action}</div>}
    </div>
  );
}
