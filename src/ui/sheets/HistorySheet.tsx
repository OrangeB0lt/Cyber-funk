import { CLASSES, DISTRICTS } from '@content/index';
import type { SaveSlotId } from '@core/ids/saves';
import { Button } from '../components/Button';
import { ItemRow } from '../components/ItemRow';
import { useApp, useView } from '../GameContext';
import { Sheet } from './Sheet';

/** A slot's checkpoints on the server, newest first, each one restorable. */
export function HistorySheet({ slot }: { slot: SaveSlotId }) {
  const app = useApp();
  const h = useView().history;
  const entries = h?.slot === slot ? h.entries : null;
  return (
    <Sheet title={`Slot ${slot}: history`}>
      <p className="small dim">
        The server keeps your last 20 saves in this slot. Restoring one makes it the newest.
      </p>
      {h?.failed ? (
        <p className="bad small">Couldn't load the history. Check your connection.</p>
      ) : !entries ? (
        <p className="dim small">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="dim small">Nothing saved to the cloud in this slot yet.</p>
      ) : (
        entries.map((e, i) => (
          <ItemRow
            key={e.revision}
            action={
              i === 0 ? (
                <span className="dim small">current</span>
              ) : (
                <Button
                  testId={`restore:${e.revision}`}
                  small
                  onClick={() => void app.confirmRestore(slot, e.revision, e.summary, e.savedAt)}
                >
                  Restore
                </Button>
              )
            }
          >
            <b>{e.summary.name}</b> · {CLASSES[e.summary.cls].name} · Lv {e.summary.level}
            <div className="dim small">
              {DISTRICTS[e.summary.district].name} ·{' '}
              {new Date(e.savedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </div>
          </ItemRow>
        ))
      )}
    </Sheet>
  );
}
