// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CreateRow, type CreateRowProps } from "./create-row";

afterEach(cleanup);

function props(changes: Partial<CreateRowProps> = {}): CreateRowProps {
  return {
    title: "Flashcards",
    countText: "Ingen ennå",
    hasContent: false,
    state: "idle",
    createLabel: "Lag flashcards",
    onCreate: vi.fn(),
    onCreateMore: vi.fn(),
    jobText: "Lager flashcards …",
    announcement: "",
    ...changes,
  };
}

describe("CreateRow", () => {
  it("UX-DR18: uten innhold står «Ingen ennå», hul prikk og omrissknappen «Lag flashcards»", () => {
    const onCreate = vi.fn();
    render(<CreateRow {...props({ onCreate })} />);
    expect(screen.getByRole("heading", { level: 3, name: "Flashcards" })).toBeTruthy();
    expect(screen.getByText("Ingen ennå")).toBeTruthy();
    expect(screen.getByTestId("content-dot").className).toContain("bg-transparent");
    const button = screen.getByRole("button", { name: "Lag flashcards" });
    expect(button.dataset.variant).toBe("outline");
    fireEvent.click(button);
    expect(onCreate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Øv nå" })).toBeNull();
  });

  it("UX-DR18: med innhold står «24 kort», fylt prikk, «Lag flere» og «Øv nå» (ikke aktiv før 3.3)", () => {
    const onCreateMore = vi.fn();
    render(<CreateRow {...props({ hasContent: true, countText: "24 kort", onCreateMore })} />);
    expect(screen.getByText("24 kort")).toBeTruthy();
    expect(screen.getByTestId("content-dot").className).toContain("bg-ink-muted");
    const more = screen.getByRole("button", { name: "Lag flere" });
    expect(more.dataset.variant).toBe("text");
    fireEvent.click(more);
    expect(onCreateMore).toHaveBeenCalledOnce();
    const practice = screen.getByRole("button", { name: "Øv nå" }) as HTMLButtonElement;
    expect(practice.dataset.variant).toBe("primary");
    expect(practice.disabled).toBe(true);
  });

  it("UX-DR19: running viser job-status i stedet for knappene", () => {
    render(<CreateRow {...props({ state: "running" })} />);
    expect(screen.getByText("Lager flashcards …")).toBeTruthy();
    expect(screen.getByText("Du kan bruke resten av appen imens.")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    const spinner = document.querySelector("[data-slot=spinner]")!;
    expect(spinner.getAttribute("aria-hidden")).toBe("true");
    expect(spinner.getAttribute("class")).toContain("motion-safe:animate-spin");
  });

  it("UX-DR18: to rader der den ene har en jobb – den andre venter, knappen er ikke aktiv og grunnen er koblet til", () => {
    render(
      <>
        <CreateRow {...props({ state: "running" })} />
        <CreateRow
          {...props({
            title: "Quiz",
            createLabel: "Lag quiz",
            state: "waiting",
            reason: "Venter til flashcardene er ferdige",
          })}
        />
      </>,
    );
    const reason = screen.getByText("Venter til flashcardene er ferdige");
    const button = screen.getByRole("button", { name: "Lag quiz" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-describedby")).toBe(reason.id);
    expect(screen.getAllByText("Lager flashcards …")).toHaveLength(1);
  });

  it("UX-DR19: levende område er alltid montert og leser announcement; melding og feil vises under raden", () => {
    const { rerender } = render(<CreateRow {...props()} />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("");
    expect(status.className).toContain("sr-only");
    rerender(<CreateRow {...props({ announcement: "Lager flashcards …", message: "Ingenting er lagret.", error: "Feil." })} />);
    expect(screen.getByRole("status")).toBe(status);
    expect(status.textContent).toBe("Lager flashcards …");
    expect(screen.getByText("Ingenting er lagret.")).toBeTruthy();
    expect(within(screen.getByRole("alert")).getByText("Feil.")).toBeTruthy();
  });
});
