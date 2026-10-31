import type { Snapshot } from 'valtio';
import type { SlotPick, SlotView } from '@app/view';
import { CLASSES, DISTRICTS } from '@content/index';
import { Button } from '../components/Button';
import { useApp, useGame, useView } from '../GameContext';
import { Sheet } from './Sheet';
import s from './SavesSheet.module.css';

const TITLES: Record<SlotPick, string> = {
  continue: 'Continue',
  new: 'New game: pick a slot',
  import: 'Import into which slot?',
};

const SYNC_LABEL: Record<SlotView['sync'], string | null> = {
  local: null,
  synced: 'synced',
  pending: 'waiting to sync',
  conflict: 'changed on another device',
};

/** When a slot was saved, short enough for a 360px row. */
function savedAt(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function SlotRow({ sv, mode, raw }: { sv: Snapshot<SlotView>; mode: SlotPick; raw?: string }) {
  const app = useApp();
  const g = useGame();
  const cloud = useView().cloud;
  const sum = sv.summary;
  const badge = SYNC_LABEL[sv.sync];
  const playing = !!g && app.slots.active === sv.slot;
  // A slot the server has seen (even one deleted since) has checkpoints to restore.
  const history = cloud.linked && (!!sum || sv.sync !== 'local');
  return (
    <div className={s.row}>
      <Button
        testId={`save:${sv.slot}`}
        className={s.slot}
        variant={mode === 'continue' && sum ? 'sel' : undefined}
        inactive={mode === 'continue' && !sum}
        onClick={() => void app.pickSlot(sv.slot, mode, raw)}
      >
        <span className={s.label}>
          <span>Slot {sv.slot}</span>
          {badge && <span className={`${s.badge} ${s[sv.sync]}`}>{badge}</span>}
        </span>
        {sum ? (
          <>
            <span className={s.line}>
              <b>{sum.name}</b> · {CLASSES[sum.cls].name} · Lv {sum.level}
              {sum.ngPlus > 0 && ` · NG+${sum.ngPlus}`}
            </span>
            <span className={`${s.line} dim small`}>
              {DISTRICTS[sum.district].name} · {savedAt(sv.savedAt)}
            </span>
          </>
        ) : sv.problem ? (
          <span className={`${s.line} bad small`}>
            {sv.problem === 'too-new' ? 'Saved by a newer version of the game' : "This save can't be read"}
          </span>
        ) : (
          <span className={`${s.line} dim`}>Empty</span>
        )}
      </Button>
      {!playing && (sum || sv.problem || history) && (
        <div className={s.side}>
          {(sum || sv.problem) && (
            <Button
              testId={`save-del:${sv.slot}`}
              small
              variant="ghost"
              aria-label={`Delete slot ${sv.slot}`}
              onClick={() => void app.confirmDeleteSlot(sv.slot)}
            >
              🗑
            </Button>
          )}
          {history && (
            <Button
              testId={`save-history:${sv.slot}`}
              small
              variant="ghost"
              aria-label={`History of slot ${sv.slot}`}
              onClick={() => void app.openHistory(sv.slot)}
            >
              ⟲
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** The slot picker: Continue, New Game and Import all choose one of three slots here. */
export function SavesSheet({ mode, raw }: { mode: SlotPick; raw?: string }) {
  const v = useView();
  return (
    <Sheet title={TITLES[mode]}>
      <div className={s.list}>
        {v.saves.map(sv => (
          <SlotRow key={sv.slot} sv={sv} mode={mode} raw={raw} />
        ))}
      </div>
    </Sheet>
  );
}
