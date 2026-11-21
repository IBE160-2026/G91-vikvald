// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { flashcardAdapter } from "../adapter";
import { markCurrent, startSession, type SessionState } from "../session";
import type { Mark } from "../types";
import { SessionPanel } from "./session-panel";

afterEach(cleanup);

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `k${index + 1}`);
}

function run(state: SessionState, marks: Mark[]): SessionState {
  return marks.reduce(markCurrent, state);
}

function renderPanel(state: SessionState, onEnd = vi.fn(), extra: { aborted?: boolean; saved?: boolean } = {}) {
  return render(
    <SessionPanel
      adapter={flashcardAdapter}
      state={state}
      scopeName="Uke 37: Merkevare"
      colorIndex={0}
      onEnd={onEnd}
      {...extra}
    />,
  );
}

describe("SessionPanel", () => {
  it("UX-DR8: overlinje, tittel, forelesning, teller, stolpe, tellelinje, rutenett, forklaring og «Avslutt økt»", () => {
    const onEnd = vi.fn();
    const state = run(startSession(ids(24)), ["known", "known", "missed", "known", "known", "known"]);
    const { container } = renderPanel(state, onEnd);

    const panel = container.querySelector("[data-slot='session-panel']")!;
    expect(panel.className).toContain("w-sidebar-width");
    expect(panel.className).toContain("bg-paper");
    expect(panel.className).toContain("border-r");
    expect(screen.getByText("ØKT").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("heading", { level: 1, name: "Flashcards" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Flashcards" })).toBe(panel);
    expect(screen.getByText("Uke 37: Merkevare")).toBeTruthy();
    expect(panel.querySelector("[data-color-index='0']")).toBeTruthy();

    const counter = screen.getByText("7", { selector: ".text-session-counter" });
    expect(counter.className).toContain("text-session-counter");
    expect(screen.getByText("/ 24")).toBeTruthy();
    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-labelledby")).toBe(counter.parentElement!.id);
    expect(progress.className).toContain("bg-progress-track");
    expect(Number(progress.getAttribute("aria-valuenow"))).toBeCloseTo((7 / 24) * 100);
    expect(progress.getAttribute("aria-valuemax")).toBe("100");
    expect(progress.getAttribute("aria-valuetext")).toBe("7 / 24");
    expect(progress.querySelector("[data-slot='progress-indicator']")!.className).toContain("bg-brand");
    expect(screen.getByText("Kunne 5 · Kunne ikke 1")).toBeTruthy();
    expect(screen.queryByText(/Repeterer/)).toBeNull();

    expect(screen.getAllByRole("listitem").length).toBeGreaterThanOrEqual(24);
    expect(screen.getByText("Kunne ikke, kommer igjen")).toBeTruthy();
    expect(screen.getByText("Ikke vist ennå")).toBeTruthy();

    const end = screen.getByRole("button", { name: "Avslutt økt" });
    expect(end.dataset.variant).toBe("outline");
    fireEvent.click(end);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it("FR-25: telleren går aldri over totalen, og repetisjonen viser «Repeterer: 1 kort igjen»", () => {
    const state = run(startSession(["A", "B", "C"]), ["missed", "known", "known"]);
    renderPanel(state);
    expect(screen.getByText("3", { selector: ".text-session-counter" })).toBeTruthy();
    expect(screen.getByText("/ 3")).toBeTruthy();
    expect(screen.getByText("Repeterer: 1 kort igjen")).toBeTruthy();
    expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
  });

  it("FR-25: ferdig økt fyller alle ruter, viser ferdigforklaringen og ingen «Avslutt økt»", () => {
    const state = run(startSession(["A", "B", "C"]), ["missed", "known", "known", "known"]);
    renderPanel(state);
    const cells = screen.getAllByRole("listitem").filter((item) => item.closest("ol"));
    expect(cells.map((cell) => cell.dataset.mark)).toEqual(["missed", "known", "known"]);
    expect(screen.getByText("Kunne ikke, repetert")).toBeTruthy();
    expect(screen.queryByText("Ikke vist ennå")).toBeNull();
    expect(screen.queryByText("Kunne ikke, kommer igjen")).toBeNull();
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
    expect(screen.getByText("Kunne 2 · Kunne ikke 1")).toBeTruthy();
    const progress = screen.getByRole("progressbar");
    expect(progress.getAttribute("aria-valuenow")).toBe("100");
    expect(progress.getAttribute("aria-valuetext")).toBe("3 / 3");
    // Not saved (yet): nothing at the bottom.
    expect(screen.queryByText("Økten er ferdig og lagret")).toBeNull();
  });

  it("UX-DR8: ferdig og lagret økt viser «✓ Økten er ferdig og lagret» i stedet for «Avslutt økt»", () => {
    const state = run(startSession(["A", "B", "C"]), ["missed", "known", "known", "known"]);
    renderPanel(state, vi.fn(), { saved: true });
    const saved = screen.getByText("Økten er ferdig og lagret");
    expect(saved.className).toContain("text-meta");
    expect(saved.className).toContain("text-ink-muted");
    expect(saved.querySelector("svg")).toBeTruthy();
    expect(screen.getByText("Kunne ikke, repetert")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
  });

  it("UX-DR33: avbrutt økt har ingen «Avslutt økt», ingen «Repeterer», ingen gjeldende rute og egen forklaring", () => {
    // Every card marked once, one waiting to be repeated.
    const state = run(startSession(["A", "B", "C"]), ["missed", "known", "known"]);
    const { container } = renderPanel(state, vi.fn(), { aborted: true, saved: true });
    expect(screen.queryByRole("button", { name: "Avslutt økt" })).toBeNull();
    expect(screen.queryByText(/Repeterer/)).toBeNull();
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(screen.queryByText("Økten er ferdig og lagret")).toBeNull();
    const legend = Array.from(container.querySelectorAll("ul > li")).map((item) => item.textContent);
    expect(legend).toEqual(["Kunne", "Kunne ikke", "Ikke vist ennå"]);
  });

  it("UX-DR33: en avbrutt økt med kort som ikke er vist, viser dem som tomme ruter", () => {
    const state = run(startSession(["A", "B", "C"]), ["known"]);
    const { container } = renderPanel(state, vi.fn(), { aborted: true });
    expect(container.querySelector("[aria-current]")).toBeNull();
    expect(screen.getByText("Kort 2: ikke vist ennå")).toBeTruthy();
    expect(screen.getByText("Kort 3: ikke vist ennå")).toBeTruthy();
  });

  it("UX-DR9: over 120 kort vises verken rutenett eller forklaring, men teller, stolpe og tellelinje står", () => {
    const { container } = renderPanel(startSession(ids(121)));
    expect(container.querySelector("ol")).toBeNull();
    expect(screen.queryByText("Ikke vist ennå")).toBeNull();
    expect(screen.getByText("/ 121")).toBeTruthy();
    expect(screen.getByRole("progressbar")).toBeTruthy();
    expect(screen.getByText("Kunne 0 · Kunne ikke 0")).toBeTruthy();
  });

  it("UX-DR9: med 120 kort vises rutenettet", () => {
    const { container } = renderPanel(startSession(ids(120)));
    expect(container.querySelectorAll("ol > li")).toHaveLength(120);
  });
  it("UX-DR10: på smal skjerm er tittelen h2, så siden har sin egen h1", () => {
    render(
      <SessionPanel
        adapter={flashcardAdapter}
        state={startSession(ids(3))}
        scopeName="Uke 37: Merkevare"
        onEnd={vi.fn()}
        headingLevel={2}
      />,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("region", { name: "Flashcards" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Flashcards" })).toBeTruthy();
  });
});
