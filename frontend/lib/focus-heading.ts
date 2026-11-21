"use client";

import { useEffect, type RefObject } from "react";

// Focus when the opener is gone (#75): after a lecture or a subject is deleted,
// the button that opened the confirmation is gone with the page. The flag is
// set before navigating, and the page she arrives at puts focus on its h1
// (tabIndex={-1}) once it is ready, then clears the flag.
//
// The flag expires after a few seconds, so a navigation that never lands
// cannot steal focus on a later, unrelated visit.

const VALID_MS = 5000;
let setAt: number | null = null;

function isPending(): boolean {
  return setAt !== null && Date.now() - setAt <= VALID_MS;
}

export function focusHeadingAfterNavigation(): void {
  setAt = Date.now();
}

// For tests: whether a page is still waiting to take focus.
export function headingFocusPending(): boolean {
  return isPending();
}

// For tests: forget the flag.
export function resetHeadingFocus(): void {
  setAt = null;
}

export function useFocusHeadingOnArrival(ref: RefObject<HTMLElement | null>, ready: boolean): void {
  useEffect(() => {
    if (!ready || !ref.current) return;
    const pending = isPending();
    setAt = null;
    if (pending) ref.current.focus();
  }, [ref, ready]);
}
