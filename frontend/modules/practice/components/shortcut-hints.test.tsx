// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { FLASHCARD_HINTS, ShortcutHints } from "./shortcut-hints";

afterEach(cleanup);

describe("ShortcutHints", () => {
  it("UX-DR26: tastene i kbd og teksten i dempet grå, i skissens rekkefølge, bare tekst og sentrert", () => {
    render(<ShortcutHints hints={FLASHCARD_HINTS} />);
    const list = screen.getByRole("list", { name: "Hurtigtaster" });
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "1 Kunne ikke",
      "2 Kunne",
      "Mellomrom snu kortet",
      "Esc avslutt",
    ]);
    for (const item of items) {
      expect(item.className).toContain("text-body-sm");
      expect(item.className).toContain("text-ink-muted");
      const key = item.querySelector("kbd")!;
      expect(key.className).toContain("bg-surface");
      expect(key.className).toContain("border-border-card");
      expect(key.className).toContain("rounded-kbd");
      expect(key.className).toContain("text-kbd");
    }
    expect(list.querySelectorAll("button, a")).toHaveLength(0);
    expect(list.className).toContain("justify-center");
    expect(list.className).toContain("flex-wrap");
  });
});
