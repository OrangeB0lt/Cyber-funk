import s from './Segmented.module.css';

interface Props<V extends string | boolean> {
  /** Row label. */
  label: string;
  /** Test id prefix (each option gets `<prefix>:<value>`). */
  testId: string;
  /** Options. */
  options: readonly { value: V; label: string }[];
  /** Current value. */
  value: V;
  /** Picked. */
  onChange(v: V): void;
}

/** A labeled row of mutually exclusive options (settings). */
export function Segmented<V extends string | boolean>({ label, testId, options, value, onChange }: Props<V>) {
  return (
    <div className={s.row} role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <div className={s.seg}>
        {options.map(o => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={`${s.opt} ${o.value === value ? s.on : ''}`}
            data-testid={`${testId}:${String(o.value)}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
