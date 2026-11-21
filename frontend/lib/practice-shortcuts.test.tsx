// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  SHORTCUTS_KEY,
  isSingleKey,
  readShortcutsEnabled,
  resolveShortcut,
  setShortcutsEnabled,
  usePracticeShortcuts,
  useShortcutsEnabled,
  type KeyEventLike,
  type ShortcutBinding,
} from "./practice-shortcuts";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  document.body.innerHTML = "";
});

const flip = vi.fn();
const missed = vi.fn();
const end = vi.fn();
const help = vi.fn();
const BINDINGS: ShortcutBinding[] = [
  { key: " ", action: flip },
  { key: "1", action: missed },
  { key: "Escape", action: end },
  { key: "?", action: help },
];

function key(name: string, extra: Partial<KeyEventLike> = {}): KeyEventLike {
  return {
    key: name,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    defaultPrevented: false,
    target: document.body,
    ...extra,
  };
}

const ON = { singleKeys: true, dialogOpen: false };

function element(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
}

describe("resolveShortcut", () => {
  it("UX-DR32: Mellomrom, 1, Esc og ? finner sin handling; andre taster ingenting", () => {
    expect(resolveShortcut(key(" "), BINDINGS, ON)?.action).toBe(flip);
    expect(resolveShortcut(key("1"), BINDINGS, ON)?.action).toBe(missed);
    expect(resolveShortcut(key("Escape"), BINDINGS, ON)?.action).toBe(end);
    expect(resolveShortcut(key("?"), BINDINGS, ON)?.action).toBe(help);
    expect(resolveShortcut(key("3"), BINDINGS, ON)).toBeNull();
    expect(resolveShortcut(key("Enter"), BINDINGS, ON)).toBeNull();
  });

  it("UX-DR32: ingenting når fokus står i et tekstfelt, heller ikke Esc", () => {
    for (const html of ["<input />", "<textarea></textarea>", "<select></select>", '<div contenteditable="true"></div>']) {
      const target = element(html);
      expect(resolveShortcut(key("1", { target }), BINDINGS, ON)).toBeNull();
      expect(resolveShortcut(key("Escape", { target }), BINDINGS, ON)).toBeNull();
    }
  });

  it("UX-DR32: ingenting når en dialog er åpen eller tasten alt er brukt", () => {
    expect(resolveShortcut(key("Escape"), BINDINGS, { ...ON, dialogOpen: true })).toBeNull();
    expect(resolveShortcut(key("1"), BINDINGS, { ...ON, dialogOpen: true })).toBeNull();
    expect(resolveShortcut(key("Escape", { defaultPrevented: true }), BINDINGS, ON)).toBeNull();
  });

  it("UX-DR32: ingenting med Ctrl, Alt eller Meta, eller når tasten holdes nede", () => {
    for (const extra of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { repeat: true }]) {
      expect(resolveShortcut(key("1", extra), BINDINGS, ON)).toBeNull();
    }
  });

  it("UX-DR32: Mellomrom på en knapp eller lenke gjør knappens egen handling, ikke snuing", () => {
    expect(resolveShortcut(key(" ", { target: element("<button>Avslutt økt</button>") }), BINDINGS, ON)).toBeNull();
    expect(resolveShortcut(key(" ", { target: element('<a href="/">Lenke</a>') }), BINDINGS, ON)).toBeNull();
    expect(resolveShortcut(key(" ", { target: element('<button role="switch"></button>') }), BINDINGS, ON)).toBeNull();
    // Other keys still work on a button.
    expect(resolveShortcut(key("1", { target: element("<button>Kunne</button>") }), BINDINGS, ON)?.action).toBe(missed);
  });

  it("UX-DR26: med bryteren av virker ingen enkelttaster, men Esc virker", () => {
    const off = { singleKeys: false, dialogOpen: false };
    for (const name of [" ", "1", "?"]) expect(resolveShortcut(key(name), BINDINGS, off)).toBeNull();
    expect(resolveShortcut(key("Escape"), BINDINGS, off)?.action).toBe(end);
    expect(isSingleKey("Escape")).toBe(false);
    expect(isSingleKey("?")).toBe(true);
  });
});

function Keys({ bindings, singleKeys = true }: { bindings: ShortcutBinding[]; singleKeys?: boolean }) {
  usePracticeShortcuts(bindings, { singleKeys });
  return <p>Økt</p>;
}

function press(name: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true });
  act(() => {
    document.body.dispatchEvent(event);
  });
  return event;
}

describe("usePracticeShortcuts", () => {
  it("NFR-8: kjører handlingen og hindrer rulling med Mellomrom", () => {
    const action = vi.fn();
    render(<Keys bindings={[{ key: " ", action }]} />);
    const event = press(" ");
    expect(action).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
  });

  it("UX-DR32: ingenting når en dialog er i DOM-en", () => {
    const action = vi.fn();
    render(<Keys bindings={[{ key: "Escape", action }]} />);
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    press("Escape");
    expect(action).not.toHaveBeenCalled();
  });

  it("UX-DR32: lytteren fjernes når siden lukkes, så tastene bare virker under øving", () => {
    const action = vi.fn();
    const { unmount } = render(<Keys bindings={[{ key: "1", action }]} />);
    unmount();
    press("1");
    expect(action).not.toHaveBeenCalled();
  });
});

function Enabled() {
  return <p>{useShortcutsEnabled() ? "på" : "av"}</p>;
}

describe("Bryteren «Bruk hurtigtaster»", () => {
  it("UX-DR26: på som standard, \"off\" i localStorage når den er av, og visningen oppdateres med en gang", () => {
    render(<Enabled />);
    expect(readShortcutsEnabled()).toBe(true);
    expect(screen.getByText("på")).toBeTruthy();
    act(() => setShortcutsEnabled(false));
    expect(window.localStorage.getItem(SHORTCUTS_KEY)).toBe("off");
    expect(screen.getByText("av")).toBeTruthy();
    act(() => setShortcutsEnabled(true));
    expect(window.localStorage.getItem(SHORTCUTS_KEY)).toBeNull();
    expect(screen.getByText("på")).toBeTruthy();
  });

  it("UX-DR26: kan lagringen leses, men ikke skrives, står bryteren av likevel", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(<Enabled />);
    act(() => setShortcutsEnabled(false));
    expect(readShortcutsEnabled()).toBe(false);
    expect(screen.getByText("av")).toBeTruthy();
    // Storage works again: back to the stored value.
    vi.restoreAllMocks();
    act(() => setShortcutsEnabled(true));
    expect(readShortcutsEnabled()).toBe(true);
  });

  it("UX-DR26: en endring i en annen fane slår igjennom med en gang", () => {
    render(<Enabled />);
    expect(screen.getByText("på")).toBeTruthy();
    window.localStorage.setItem(SHORTCUTS_KEY, "off");
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: SHORTCUTS_KEY, newValue: "off" }));
    });
    expect(screen.getByText("av")).toBeTruthy();
  });

  it("UX-DR26: kan ikke lagringen leses, er tastene på", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readShortcutsEnabled()).toBe(true);
  });
});
