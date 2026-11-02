import { useEffect } from 'react';

let locks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/**
 * Prevents the page behind a menu / drawer / dialog from scrolling (a common phone annoyance).
 * Reference-counted so overlapping surfaces (menu + search, drawer + quick navigate) cannot unlock each other,
 * and it compensates for the vanished desktop scrollbar so the layout does not jump.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (locks === 0) {
      previousOverflow = body.style.overflow;
      previousPaddingRight = body.style.paddingRight;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
      body.style.overflow = 'hidden';
    }
    locks += 1;
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) {
        body.style.overflow = previousOverflow;
        body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [active]);
}
