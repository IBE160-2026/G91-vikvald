"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// Keyboard shortcuts during practice (EXPERIENCE.md "Hurtigtaster", story 3.4).
//
// One shared function decides what a keydown does, from the key, where focus
// is and whether single keys are on. Each practice page (flashcards now, quiz
// and free text later) sends its own list of keys and actions to the hook, and
// the hook is only used on practice pages, so the keys only work there.
//
// The rules:
// - Nothing while focus is in a text field (input, textarea, select or an
//   element with contenteditable), not even Esc: she may be writing.
// - Nothing while a dialog or the side panel is open ([role="dialog"] in the
//   DOM), or when something has already handled the key (defaultPrevented;
//   Radix has then closed its dialog with Esc).
// - Nothing with Ctrl, Alt or Meta, or while a key is held down (repeat).
// - Space does nothing while focus is on a control (button, link, switch ...),
//   so the control's own action happens instead.
// - Single keys (Space, digits, letters, «?») only work with the switch «Bruk
//   hurtigtaster» on (WCAG 2.1.4). Esc is not a single key and always works.

export type ShortcutBinding = {
  // KeyboardEvent.key: " " for Space, "1", "Escape", "?" ...
  key: string;
  action: () => void;
};

export type KeyEventLike = Pick<
  KeyboardEvent,
  "key" | "ctrlKey" | "altKey" | "metaKey" | "repeat" | "defaultPrevented" | "target"
>;

type Options = {
  // The switch «Bruk hurtigtaster».
  singleKeys: boolean;
  // A dialog or the side panel is open.
  dialogOpen: boolean;
};

const TEXT_FIELD = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
const CONTROL =
  'button, a[href], summary, [role="button"], [role="link"], [role="switch"], [role="checkbox"], [role="radio"], [role="menuitem"], [role="tab"], [role="option"]';

// A single key is one character: Space, digits, letters and «?». Esc (and
// Enter, Tab ...) have longer names.
export function isSingleKey(key: string): boolean {
  return key.length === 1;
}

function closest(target: EventTarget | null, selector: string): boolean {
  return typeof Element !== "undefined" && target instanceof Element && target.closest(selector) !== null;
}

// The pure rule: which binding (if any) a keydown should run.
export function resolveShortcut(
  event: KeyEventLike,
  bindings: readonly ShortcutBinding[],
  { singleKeys, dialogOpen }: Options,
): ShortcutBinding | null {
  if (event.defaultPrevented || dialogOpen) return null;
  if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return null;
  if (closest(event.target, TEXT_FIELD)) return null;
  const binding = bindings.find((item) => item.key === event.key);
  if (!binding) return null;
  if (isSingleKey(binding.key) && !singleKeys) return null;
  if (binding.key === " " && closest(event.target, CONTROL)) return null;
  return binding;
}

// Listens for keydown on the document while the page is shown. `bindings` may
// change on every render (the latest list is used).
export function usePracticeShortcuts(bindings: readonly ShortcutBinding[], { singleKeys }: { singleKeys: boolean }) {
  const latest = useRef({ bindings, singleKeys });
  useEffect(() => {
    latest.current = { bindings, singleKeys };
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const binding = resolveShortcut(event, latest.current.bindings, {
        singleKeys: latest.current.singleKeys,
        dialogOpen: document.querySelector('[role="dialog"]') !== null,
      });
      if (!binding) return;
      // Space would otherwise scroll the page.
      event.preventDefault();
      binding.action();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}

// The switch «Bruk hurtigtaster», kept in localStorage under sk_shortcuts:
// "off" when it is off, nothing when it is on (the default). Storage can be
// missing or throw (private windows, blocked site data): then the keys are on,
// and turning them off lasts only until the page is loaded again.
export const SHORTCUTS_KEY = "sk_shortcuts";

const listeners = new Set<() => void>();
// Used when storage cannot be written, so the switch still moves.
let fallback: boolean | null = null;

export function readShortcutsEnabled(): boolean {
  try {
    return window.localStorage.getItem(SHORTCUTS_KEY) !== "off";
  } catch {
    return fallback ?? true;
  }
}

export function setShortcutsEnabled(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.removeItem(SHORTCUTS_KEY);
    else window.localStorage.setItem(SHORTCUTS_KEY, "off");
    fallback = null;
  } catch {
    fallback = enabled;
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed the switch.
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === SHORTCUTS_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// The switch, updated at once wherever it is shown (dialog, hint line, keys).
export function useShortcutsEnabled(): boolean {
  return useSyncExternalStore(subscribe, readShortcutsEnabled, () => true);
}
