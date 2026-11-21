// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  focusHeadingAfterNavigation,
  headingFocusPending,
  resetHeadingFocus,
  useFocusHeadingOnArrival,
} from "./focus-heading";

afterEach(() => {
  cleanup();
  resetHeadingFocus();
  vi.useRealTimers();
});

function Heading({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useFocusHeadingOnArrival(ref, ready);
  return (
    <h1 ref={ref} tabIndex={-1}>
      Dine emner
    </h1>
  );
}

describe("focus-heading", () => {
  it("#75: uten flagg får overskriften ikke fokus", () => {
    const { getByRole } = render(<Heading ready />);
    expect(document.activeElement).not.toBe(getByRole("heading"));
  });

  it("#75: med flagg får overskriften fokus når siden er klar, og flagget nullstilles", () => {
    focusHeadingAfterNavigation();
    const { getByRole, rerender } = render(<Heading ready={false} />);
    expect(document.activeElement).not.toBe(getByRole("heading"));
    expect(headingFocusPending()).toBe(true);
    rerender(<Heading ready />);
    expect(document.activeElement).toBe(getByRole("heading"));
    expect(headingFocusPending()).toBe(false);
  });

  it("#75: flagget går ut etter 5 sekunder og stjeler ikke fokus senere", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0));
    focusHeadingAfterNavigation();
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 6));
    expect(headingFocusPending()).toBe(false);
    const { getByRole } = render(<Heading ready />);
    expect(document.activeElement).not.toBe(getByRole("heading"));
  });

  it("#75: resetHeadingFocus fjerner flagget", () => {
    focusHeadingAfterNavigation();
    resetHeadingFocus();
    expect(headingFocusPending()).toBe(false);
  });
});
