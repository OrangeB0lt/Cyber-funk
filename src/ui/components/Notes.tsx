import type { NoteId } from '@core/ids/enemies';
import { NOTE_IDS } from '@core/ids/enemies';
import { NOTES } from '@content/index';
import s from './Notes.module.css';

/** The six Blue Notes, lit when recovered. */
export function Notes({ have }: { have: readonly NoteId[] }) {
  return (
    <div className={s.notes} role="group" aria-label={`${have.length} of 6 Blue Notes`}>
      {NOTE_IDS.map(n => (
        <span key={n} className={`${s.note} ${have.includes(n) ? s.have : ''}`}>
          {NOTES[n].name}
        </span>
      ))}
    </div>
  );
}
