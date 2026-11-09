import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Give focus back to whatever opened a layer (a sheet, a dialog, an overlay) once it closes.
 *
 * The opener is captured in a layout effect, which runs before the layer's own passive effect moves
 * focus inside it. On close it's focused again if it's still on the page; otherwise focus goes to
 * the main region, so it never falls back to <body>.
 */
export function useFocusReturn(open: boolean): void {
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && !opener.current) {
      const el = document.activeElement;
      opener.current = el instanceof HTMLElement && el !== document.body ? el : null;
    }
  }, [open]);
  useEffect(() => {
    if (open) return;
    const el = opener.current;
    opener.current = null;
    if (el?.isConnected && !el.closest('[inert]')) el.focus({ preventScroll: true });
    else if (el) document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
  }, [open]);
}
