"use client";

import { useEffect, type RefObject } from "react";

// Focus when the opener is gone (#75): after a lecture or a subject is deleted,
// the button that opened the confirmation is gone with the page. The flag is
// set before navigating, and the page she arrives at puts focus on its h1
// (tabIndex={-1}) once it is ready, then clears the flag.

let pending = false;

export function focusHeadingAfterNavigation(): void {
  pending = true;
}

// For tests: whether a page is still waiting to take focus.
export function headingFocusPending(): boolean {
  return pending;
}

export function useFocusHeadingOnArrival(ref: RefObject<HTMLElement | null>, ready: boolean): void {
  useEffect(() => {
    if (!pending || !ready || !ref.current) return;
    pending = false;
    ref.current.focus();
  }, [ref, ready]);
}
