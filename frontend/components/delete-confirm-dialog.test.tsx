// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FileText } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import type { DeleteCount } from "@/lib/delete-text";
import { FALLBACK_MESSAGE } from "@/lib/messages";

import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { iconProps } from "./icon";

afterEach(cleanup);

type HarnessProps = {
  loadCounts?: () => Promise<DeleteCount[]>;
  remove?: () => Promise<void>;
  onDeleted?: () => void;
  withTarget?: boolean;
};

function Harness({
  loadCounts = async () => [],
  remove = async () => {},
  onDeleted = () => {},
  withTarget = false,
}: HarnessProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <h2 id="filer" tabIndex={-1}>
        Filer
      </h2>
      <button type="button" onClick={() => setOpen(true)}>
        Slett
      </button>
      <DeleteConfirmDialog
        open={open}
        title="Slette fila?"
        confirmLabel="Slett fila"
        item={{ name: "merkevare.pdf", detail: "12 sider · Uke 37: Merkevare", icon: <FileText {...iconProps} /> }}
        target="file"
        previewKey={["files", "f1"]}
        loadCounts={loadCounts}
        remove={remove}
        onClose={() => setOpen(false)}
        onDeleted={onDeleted}
        focusAfterDelete={withTarget ? () => document.getElementById("filer") : undefined}
      />
    </>
  );
}

function renderHarness(props: HarnessProps = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
  const opener = screen.getByRole("button", { name: "Slett" });
  return { opener, client };
}

function open(opener: HTMLElement) {
  opener.focus();
  fireEvent.click(opener);
  return screen.getByRole("dialog");
}

function dangerButton(): HTMLButtonElement {
  return screen.getByRole("button", { name: "Slett fila" }) as HTMLButtonElement;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("DeleteConfirmDialog", () => {
  it("UX-DR22: viser boksen, setningen og «Det kan ikke angres.», med «Avbryt» i fokus", async () => {
    const { opener } = renderHarness({
      loadCounts: async () => [
        { kind: "flashcards", count: 18 },
        { kind: "quiz_questions", count: 11 },
      ],
    });
    const dialog = open(opener);
    expect(dialog.className).toContain("w-[560px]");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Avbryt" }));
    expect(screen.getByText("merkevare.pdf")).toBeTruthy();
    expect(screen.getByText("12 sider · Uke 37: Merkevare")).toBeTruthy();
    expect(dialog.querySelector(".bg-brand-tint svg")).not.toBeNull();
    expect(await screen.findByText("Dette sletter også 18 flashcards og 11 quizspørsmål laget fra fila.")).toBeTruthy();
    const undoable = screen.getByText("Det kan ikke angres.");
    expect(undoable.className).toContain("font-semibold");
    expect(dangerButton().disabled).toBe(false);
    expect(dangerButton().querySelector("svg")).not.toBeNull();
  });

  it("FR-12: en registrert type fra forhåndsvisningen står i teksten", async () => {
    const { opener } = renderHarness({ loadCounts: async () => [{ kind: "model_cards", count: 2 }] });
    open(opener);
    expect(await screen.findByText("Dette sletter også 2 modellkort laget fra fila.")).toBeTruthy();
  });

  it("E16: uten tellinger står bare «Det kan ikke angres.»", async () => {
    const { opener } = renderHarness({ loadCounts: async () => [] });
    const dialog = open(opener);
    await screen.findByText("Det kan ikke angres.");
    expect(dialog.textContent).not.toContain("Dette sletter også");
  });

  it("FR-12: mens tellingene lastes, er fareknappen av og ingen tekst vises", async () => {
    const counts = deferred<DeleteCount[]>();
    const { opener } = renderHarness({ loadCounts: () => counts.promise });
    const dialog = open(opener);
    expect(dangerButton().disabled).toBe(true);
    expect(dialog.textContent).not.toContain("Det kan ikke angres.");
    counts.resolve([{ kind: "files", count: 2 }]);
    await screen.findByText("Det kan ikke angres.");
    expect(dangerButton().disabled).toBe(false);
  });

  it("FR-12: feiler forhåndsvisningen, vises reserveteksten og fareknappen er av", async () => {
    const remove = vi.fn(async () => {});
    const { opener } = renderHarness({
      loadCounts: async () => {
        throw new ApiError(500, "INTERNAL_ERROR");
      },
      remove,
    });
    open(opener);
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(dangerButton().disabled).toBe(true);
    fireEvent.click(dangerButton());
    expect(remove).not.toHaveBeenCalled();
  });

  it("UX-DR21: Esc og «Avbryt» lukker uten sletting, og fokus går tilbake til knappen", async () => {
    const remove = vi.fn(async () => {});
    const { opener } = renderHarness({ remove, withTarget: true });
    const dialog = open(opener);
    await screen.findByText("Det kan ikke angres.");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(opener));
    open(opener);
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => expect(document.activeElement).toBe(opener));
    expect(remove).not.toHaveBeenCalled();
  });

  it("FR-12: tellingene hentes på nytt hver gang dialogen åpnes", async () => {
    const loadCounts = vi
      .fn<() => Promise<DeleteCount[]>>()
      .mockResolvedValueOnce([{ kind: "files", count: 1 }])
      .mockResolvedValueOnce([{ kind: "files", count: 3 }]);
    const { opener } = renderHarness({ loadCounts });
    open(opener);
    await screen.findByText("Dette sletter også 1 fil laget fra fila.");
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    open(opener);
    expect(screen.queryByText("Dette sletter også 1 fil laget fra fila.")).toBeNull();
    await screen.findByText("Dette sletter også 3 filer laget fra fila.");
    expect(loadCounts).toHaveBeenCalledTimes(2);
  });

  it("FR-14: vellykket sletting kaller onDeleted, lukker, og gir fokus til focusAfterDelete", async () => {
    const onDeleted = vi.fn();
    const { opener } = renderHarness({ onDeleted, withTarget: true });
    open(opener);
    await screen.findByText("Det kan ikke angres.");
    fireEvent.click(dangerButton());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onDeleted).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Filer" })));
  });

  it("FR-14: mens slettingen pågår, er begge knappene av, og Esc gjør ingenting", async () => {
    const removal = deferred<void>();
    const onDeleted = vi.fn();
    const { opener } = renderHarness({ remove: () => removal.promise, onDeleted });
    const dialog = open(opener);
    await screen.findByText("Det kan ikke angres.");
    fireEvent.click(dangerButton());
    await waitFor(() => expect(dangerButton().disabled).toBe(true));
    expect((screen.getByRole("button", { name: "Avbryt" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(dialog, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Lukk" }));
    expect(screen.queryByRole("dialog")).not.toBeNull();
    removal.resolve();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("FR-14: feiler slettingen, står dialogen med reserveteksten", async () => {
    const onDeleted = vi.fn();
    const { opener } = renderHarness({
      remove: async () => {
        throw new ApiError(500, "INTERNAL_ERROR");
      },
      onDeleted,
    });
    open(opener);
    await screen.findByText("Det kan ikke angres.");
    fireEvent.click(dangerButton());
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(dangerButton().disabled).toBe(false);
  });

  it("FR-14: 404 på sletting regnes som slettet", async () => {
    const onDeleted = vi.fn();
    const { opener } = renderHarness({
      remove: async () => {
        throw new ApiError(404, "NOT_FOUND");
      },
      onDeleted,
    });
    open(opener);
    await screen.findByText("Det kan ikke angres.");
    fireEvent.click(dangerButton());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("FR-4: 401 viser ikke reserveteksten (appens felles behandling tar den)", async () => {
    const { opener } = renderHarness({
      loadCounts: async () => {
        throw new ApiError(401, "UNAUTHENTICATED");
      },
    });
    open(opener);
    await waitFor(() => expect(dangerButton().disabled).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
