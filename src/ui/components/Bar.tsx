import s from './Bar.module.css';

interface Props {
  /** Current value. */
  value: number;
  /** Maximum. */
  max: number;
  /** Text over the bar. */
  label?: string;
  /** Color scheme. */
  kind: 'heart' | 'funk' | 'groove' | 'enemy' | 'xp';
  /** Glow when full (Groove at 100). */
  full?: boolean;
  /** Slimmer (enemy cards). */
  compact?: boolean;
  /** Accessible name. */
  name: string;
}

/** A meter: Heart, Funk, Groove, enemy Heart or XP. */
export function Bar({ value, max, label, kind, full, compact, name }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((100 * value) / max))) : 0;
  return (
    <div
      className={[s.bar, s[kind], full && s.full, compact && s.compact].filter(Boolean).join(' ')}
      role="meter"
      aria-label={name}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.max(0, value)}
    >
      <i className={s.fill} style={{ width: `${pct}%` }} />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
}
