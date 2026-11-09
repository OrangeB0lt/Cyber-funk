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
  /**
   * Inside a button (the Topbar, an enemy card): no meter role, because a button flattens its
   * children's roles and the meter's name would replace its visible numbers in the button's name.
   * The button says what the bar is in visually hidden text.
   */
  decorative?: boolean;
}

/** A meter: Heart, Funk, Groove, enemy Heart or XP. */
export function Bar({ value, max, label, kind, full, compact, name, decorative }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((100 * value) / max))) : 0;
  const meter = decorative
    ? {}
    : {
        role: 'meter',
        'aria-label': name,
        'aria-valuemin': 0,
        'aria-valuemax': max,
        'aria-valuenow': Math.max(0, value),
      };
  return (
    <div
      className={[s.bar, s[kind], full && s.full, compact && s.compact].filter(Boolean).join(' ')}
      {...meter}
    >
      <i className={s.fill} style={{ width: `${pct}%` }} />
      {label && <span className={s.label}>{label}</span>}
    </div>
  );
}
