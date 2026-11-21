"use client";

import { useSyncExternalStore } from "react";

// A narrow screen (EXPERIENCE.md "Skjermstørrelse og plattform", NFR-14):
// 768 px or less, or text enlarged to 200 %. The media query is in em, so it
// follows the browser's text size: 48em is 768 px with normal text and wider
// when the text is enlarged. Wide is the default (on the server and where
// matchMedia is missing).
export const NARROW_QUERY = "(max-width: 48em)";

function query(): MediaQueryList | null {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(NARROW_QUERY)
    : null;
}

function subscribe(listener: () => void): () => void {
  const list = query();
  if (!list) return () => {};
  list.addEventListener("change", listener);
  return () => list.removeEventListener("change", listener);
}

function snapshot(): boolean {
  return query()?.matches ?? false;
}

export function useNarrowScreen(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
