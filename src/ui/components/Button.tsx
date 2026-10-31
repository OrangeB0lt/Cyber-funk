import type { ButtonHTMLAttributes, ReactNode } from 'react';
import s from './Button.module.css';

/** Visual variants (v1's .btn modifiers). */
export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'gold' | 'hint' | 'sel';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  /** Stable test id (tests and the Playwright MCP click by it). */
  testId: string;
  /** Visual style. */
  variant?: ButtonVariant;
  /** Compact inline button. */
  small?: boolean;
  /** Full width, centered text. */
  wide?: boolean;
  /** Center the label without full width. */
  center?: boolean;
  /**
   * Looks unavailable but stays tappable so the handler can explain why (v1 behavior:
   * e.g. tapping SOLO before 100 Groove toasts a hint).
   */
  inactive?: boolean;
  children: ReactNode;
}

/** The one button. Everything tappable in the game is a real <button>. */
export function Button({
  testId,
  variant,
  small,
  wide,
  center,
  inactive,
  className,
  children,
  ...rest
}: Props) {
  const cls = [
    s.btn,
    variant && s[variant],
    small && s.small,
    wide && s.wide,
    center && s.center,
    inactive && s.inactive,
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={cls}
      data-testid={testId}
      aria-disabled={inactive || undefined}
      {...rest}
    >
      {children}
    </button>
  );
}
