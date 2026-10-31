import type { ToneId } from '@core/ids/combat';
import s from './Tone.module.css';

/** A tone badge: HOT, LOW, BLUE, FUNK, SWEET. */
export function Tone({ tone }: { tone: ToneId }) {
  return <span className={`${s.tone} ${s[tone]}`}>{tone}</span>;
}
