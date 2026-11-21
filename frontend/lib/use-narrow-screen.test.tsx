// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NARROW_QUERY, useNarrowScreen } from "./use-narrow-screen";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Probe() {
  return <p>{useNarrowScreen() ? "smal" : "bred"}</p>;
}

// A matchMedia whose answer the test can change.
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const list = {
    matches: initial,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };
  const matchMedia = vi.fn(() => list);
  vi.stubGlobal("matchMedia", matchMedia);
  return {
    matchMedia,
    set(matches: boolean) {
      list.matches = matches;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

describe("useNarrowScreen", () => {
  it("UX-DR32: spør etter 48em, så både 768 px og 200 % tekst gir smal skjerm, og følger endringer", () => {
    const media = stubMatchMedia(false);
    render(<Probe />);
    expect(NARROW_QUERY).toBe("(max-width: 48em)");
    expect(media.matchMedia).toHaveBeenCalledWith("(max-width: 48em)");
    expect(screen.getByText("bred")).toBeTruthy();
    media.set(true);
    expect(screen.getByText("smal")).toBeTruthy();
  });

  it("UX-DR32: bred som standard når matchMedia mangler", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Probe />);
    expect(screen.getByText("bred")).toBeTruthy();
  });
});
