"use client";

import { useEffect } from "react";

// The browser tab title for a page whose title depends on data loaded in the
// browser (such as «Markedsføring – Studiekamerat»). Next.js metadata cannot
// know it, and after a client-side navigation Next.js writes the layout's
// default title into <head> after the page has rendered. So the title is set
// here and set again whenever something in <head> changes it, for as long as
// the page is shown. `null` leaves the title alone (e.g. while loading).
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const apply = () => {
      if (document.title !== title) document.title = title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [title]);
}
