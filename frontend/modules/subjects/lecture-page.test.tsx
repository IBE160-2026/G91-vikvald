// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UploadedFile } from "@/modules/files/types";

import { LecturePage } from "./pages/lecture-page";
import type { Lecture, Subject } from "./types";

// The real notFound() throws to show app/(app)/not-found.tsx; here it only records the call.
const notFound = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => notFound() }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const MARKETING: Subject = {
  id: "a",
  name: "Markedsføring",
  exam_date: "2026-12-04",
  color_index: 0,
  lecture_count: 2,
  created_at: "2026-11-21T10:00:00Z",
};
const ECONOMICS: Subject = { ...MARKETING, id: "b", name: "Samfunnsøkonomi", color_index: 1, lecture_count: 0 };

// How the fake backend answers an upload: a rejection code (with details), or
// undefined to accept the file.
type UploadAnswer = { code: string; details?: Record<string, unknown> } | undefined;

let demoMode = true;
// The student's terms_accepted_at in the fake backend, and the status the terms call answers with.
let termsAcceptedAt: string | null = "2026-09-01T08:00:00Z";
let termsStatus = 200;
let uploadAnswer: (file: File) => UploadAnswer = () => undefined;
let files: UploadedFile[] = [];
// Lets a test hold the uploads until it has looked at the page.
let gate: Promise<void> = Promise.resolve();

function uploadedFile(name: string, pages: number, id = `f${files.length + 1}`): UploadedFile {
  return { id, lecture_id: "l2", original_name: name, page_count: pages, uploaded_at: "2026-09-12T08:00:00Z" };
}

// A small fake backend that sorts the lectures by date like the real one, and
// keeps the files of lecture l2.
function respond() {
  const lectures: Lecture[] = [
    { id: "l1", subject_id: "a", name: "Uke 37: Merkevare", date: "2026-09-11", created_at: "1" },
    { id: "l2", subject_id: "a", name: "Uke 38: Prising", date: "2026-09-18", created_at: "2" },
  ];
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (path === "/api/identity/me") {
      return jsonResponse(200, { id: "u1", email: "klara@eksempel.no", terms_accepted_at: termsAcceptedAt });
    }
    if (path === "/api/identity/terms" && init?.method === "POST") {
      if (termsStatus !== 200) return jsonResponse(termsStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      termsAcceptedAt ??= "2026-11-21T10:00:00Z";
      return jsonResponse(200, { id: "u1", email: "klara@eksempel.no", terms_accepted_at: termsAcceptedAt });
    }
    if (path === "/api/subjects") return jsonResponse(200, [MARKETING, ECONOMICS]);
    if (path === "/api/subjects/a/lectures") {
      const sorted = [...lectures].sort((x, y) => x.date.localeCompare(y.date) || x.created_at.localeCompare(y.created_at));
      return jsonResponse(200, sorted);
    }
    if (path === "/api/subjects/b/lectures") return jsonResponse(200, []);
    if (path === "/api/config") {
      return jsonResponse(200, { demo_mode: demoMode, feature_mnemonics: true, feature_freetext: true, feature_summary: true });
    }
    if (path === "/api/lectures/l2/files") {
      if (init?.method === "POST") {
        await gate;
        const file = (init.body as FormData).get("file") as File;
        const answer = uploadAnswer(file);
        if (answer) return jsonResponse(422, { error: { code: answer.code, details: answer.details ?? {} } });
        const created = uploadedFile(file.name, 3);
        files.push(created);
        return jsonResponse(201, created);
      }
      return jsonResponse(200, files);
    }
    if (path === "/api/lectures/l1/files") return jsonResponse(200, []);
    const found = lectures.find((lecture) => path === `/api/lectures/${lecture.id}`);
    if (!found) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
    if (init?.method === "PATCH") Object.assign(found, JSON.parse(String(init.body)));
    return jsonResponse(200, found);
  });
}

function renderPage(id = "l2") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LecturePage lectureId={id} />
    </QueryClientProvider>,
  );
}

function lectureHrefs(nav: HTMLElement): (string | null)[] {
  return within(nav)
    .getAllByRole("link")
    .map((link) => link.getAttribute("href"))
    .filter((href) => href?.startsWith("/forelesninger/"));
}

beforeEach(() => {
  demoMode = true;
  termsAcceptedAt = "2026-09-01T08:00:00Z";
  termsStatus = 200;
  uploadAnswer = () => undefined;
  files = [];
  gate = Promise.resolve();
  vi.stubGlobal("fetch", fetchMock);
  respond();
});

function pdf(name: string): File {
  return new File(["%PDF-1.7"], name, { type: "application/pdf" });
}

function choose(...chosen: File[]) {
  fireEvent.change(screen.getByTestId("upload-input"), { target: { files: chosen } });
}

function termsCalls() {
  return fetchMock.mock.calls.filter(([url]) => String(url) === "/api/identity/terms");
}

// Waits until the page and «me» have loaded.
async function pageReady() {
  await screen.findByText(/^Forelesning fredag 18\.09\.2026/);
  await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/identity/me")).toBe(true));
}

function uploadCalls() {
  return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/files") && init?.method === "POST");
}

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  notFound.mockClear();
  vi.unstubAllGlobals();
});

describe("forelesningssiden", () => {
  it("FR-7: h1 navnet, «Forelesning fredag 18.09.2026», knappene og tittelen", async () => {
    renderPage();
    expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Uke 38: Prising");
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nytt navn" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Endre dato" })).toBeTruthy();
    await waitFor(() => expect(document.title).toBe("Uke 38: Prising – Studiekamerat"));
  });

  it("UX-DR7: sidemenyen har emnet åpent og forelesningen valgt, emnelenken er ikke valgt", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    const current = await within(nav).findByRole("link", { name: "Uke 38: Prising" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.className).toContain("bg-brand-tint");
    expect(within(nav).getByRole("link", { name: "Uke 37: Merkevare" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("link", { name: "Markedsføring" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("button", { name: "Markedsføring" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("button", { name: "Samfunnsøkonomi" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("FR-15: «Endre dato» viser dagens dato, lagrer og flytter raden i sidemenyen uten omlasting", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    await within(nav).findByRole("link", { name: "Uke 38: Prising" });
    expect(lectureHrefs(nav)).toEqual(["/forelesninger/l1", "/forelesninger/l2"]);

    fireEvent.click(screen.getByRole("button", { name: "Endre dato" }));
    const dialog = screen.getByRole("dialog", { name: "Endre dato" });
    const date = within(dialog).getByLabelText("Dato") as HTMLInputElement;
    expect(date.value).toBe("18.09.2026");
    expect(within(dialog).queryByLabelText("Navn")).toBeNull();
    fireEvent.change(date, { target: { value: "21.08.2026" } });
    fireEvent.keyDown(date, { key: "Enter" });

    expect(await screen.findByText("Forelesning fredag 21.08.2026 · 0 filer · 0 sider")).toBeTruthy();
    await waitFor(() => expect(lectureHrefs(nav)).toEqual(["/forelesninger/l2", "/forelesninger/l1"]));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("FR-7: «Nytt navn» viser dagens navn og oppdaterer h1 og sidemenyen", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Nytt navn" }));
    const dialog = screen.getByRole("dialog", { name: "Nytt navn" });
    const name = within(dialog).getByLabelText("Navn") as HTMLInputElement;
    expect(name.value).toBe("Uke 38: Prising");
    fireEvent.change(name, { target: { value: " Uke 38: Pris " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Uke 38: Pris"));
    const nav = screen.getByRole("navigation", { name: "Emner" });
    expect(await within(nav).findByRole("link", { name: "Uke 38: Pris" })).toBeTruthy();
  });

  it("FR-7: ugyldig dato gir «Skriv inn datoen, for eksempel 11.09.2026.» og ingen PATCH", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Endre dato" }));
    const date = screen.getByLabelText("Dato");
    fireEvent.change(date, { target: { value: "31.02.2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(date.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(date.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Skriv inn datoen, for eksempel 11.09.2026.",
    );
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
  });

  it("FR-4: ukjent eller andres forelesning gir «Fant ikke siden»", async () => {
    renderPage("finnes-ikke");
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-7: datofeil fra backenden vises under «Dato» med forelesningsteksten, og fokus flyttes dit", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Endre dato" }));
    fetchMock.mockImplementation(async (url, init) => {
      if (init?.method === "PATCH") {
        return jsonResponse(422, { error: { code: "VALIDATION_ERROR", details: { fields: { date: "value_error" } } } });
      }
      return jsonResponse(200, []);
    });
    const date = screen.getByLabelText("Dato");
    fireEvent.change(date, { target: { value: "12.09.2026" } });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => expect(date.getAttribute("aria-invalid")).toBe("true"));
    expect(document.getElementById(date.getAttribute("aria-describedby")!)?.textContent).toBe(
      "Skriv inn datoen, for eksempel 11.09.2026.",
    );
    await waitFor(() => expect(document.activeElement).toBe(date));
    expect(screen.getByRole("dialog", { name: "Endre dato" })).toBeTruthy();
  });

  it("UX-DR16: «Filer» viser én rad per fil i API-rekkefølgen, og linja under h1 teller filer og sider", async () => {
    files = [uploadedFile("merkevare-notater.pdf", 12, "f1"), uploadedFile("merkevare-forelesning2.pdf", 6, "f2")];
    renderPage();
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 18 sider")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Filer" })).toBeTruthy();
    const list = screen.getByRole("list", { name: "Filer" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      "merkevare-notater.pdf12 sider · lastet opp 12.09",
      "merkevare-forelesning2.pdf6 sider · lastet opp 12.09",
    ]);
    // The name is cut off with CSS; the whole name is in the DOM and the tooltip.
    const name = within(rows[0]).getByText("merkevare-notater.pdf");
    expect(name.className).toContain("truncate");
    expect(name.getAttribute("title")).toBe("merkevare-notater.pdf");
    expect(rows[0].className).toContain("h-file-row");
    expect(screen.queryByRole("button", { name: /Slett|Erstatt/ })).toBeNull();
  });

  it("UX-DR16: entall «1 fil · 1 side»", async () => {
    files = [uploadedFile("a.pdf", 1, "f1")];
    renderPage();
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 1 side")).toBeTruthy();
    expect(screen.getByText("1 side · lastet opp 12.09")).toBeTruthy();
  });

  it("UX-DR17: opplastingsfeltet har tekstene og «Velg PDF» åpner den skjulte filvelgeren", async () => {
    renderPage();
    expect(await screen.findByText("Dra og slipp PDF-filer hit")).toBeTruthy();
    expect(screen.getByText("Bare PDF. Hver fil får sin egen kilde med sidetall.")).toBeTruthy();
    const input = screen.getByTestId("upload-input") as HTMLInputElement;
    expect(input.type).toBe("file");
    expect(input.multiple).toBe(true);
    expect(input.hidden).toBe(true);
    const click = vi.spyOn(input, "click");
    fireEvent.click(screen.getByRole("button", { name: "Velg PDF" }));
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("FR-8: to PDF-er lastes opp én og én, «Laster opp …» står mens det pågår, og begge kommer i lista uten omlasting", async () => {
    let release!: () => void;
    gate = new Promise((resolve) => (release = resolve));
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");

    choose(pdf("en.pdf"), pdf("to.pdf"));

    const status = screen.getByRole("status");
    await waitFor(() => expect(status.textContent).toBe("Laster opp …"));
    const button = screen.getByRole("button", { name: "Velg PDF" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const click = vi.spyOn(screen.getByTestId("upload-input") as HTMLInputElement, "click");
    fireEvent.click(button);
    expect(click).not.toHaveBeenCalled();

    release();
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 6 sider")).toBeTruthy();
    await waitFor(() => expect(status.textContent).toBe(""));
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    const names = within(screen.getByRole("list", { name: "Filer" })).getAllByRole("listitem").map(
      (row) => row.querySelector("p")?.textContent,
    );
    expect(names).toEqual(["en.pdf", "to.pdf"]);
    // One call per file, each with the file in the field «file».
    expect(uploadCalls().map(([, init]) => ((init?.body as FormData).get("file") as File).name)).toEqual([
      "en.pdf",
      "to.pdf",
    ]);
  });

  it("FR-9: en avvist fil får sin egen linje med filnavnet, og linjene står til neste opplasting starter", async () => {
    uploadAnswer = (file) => (file.name.endsWith(".docx") ? { code: "NOT_PDF" } : undefined);
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");

    choose(pdf("notater.pdf"), new File(["PK"], "notater.docx"));

    const line =
      "notater.docx: Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";
    const message = await screen.findByText(line);
    expect(message.closest("[aria-live]")).toBeTruthy();
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(""));
    // Still there after the upload has finished.
    expect(screen.getByText(line)).toBeTruthy();

    let release!: () => void;
    gate = new Promise((resolve) => (release = resolve));
    choose(pdf("neste.pdf"));
    await waitFor(() => expect(screen.queryByText(line)).toBeNull());
    release();
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 6 sider")).toBeTruthy();
  });

  it("NFR-16: hver avvist fil får meldingen med tallene fylt inn", async () => {
    uploadAnswer = (file) =>
      file.name === "stor.pdf"
        ? { code: "FILE_TOO_LARGE", details: { size_mb: 21, limit_mb: 20 } }
        : file.name === "lang.pdf"
          ? { code: "TOO_MANY_PAGES", details: { page_count: 63 } }
          : { code: "INTERNAL_ERROR" };
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");

    choose(pdf("stor.pdf"), pdf("lang.pdf"), pdf("rar.pdf"));

    expect(
      await screen.findByText(
        "stor.pdf: Fila er på 21 MB. Grensen er 20 MB. Lagre den på nytt med mindre bilder, eller del den opp.",
      ),
    ).toBeTruthy();
    expect(
      await screen.findByText(
        "lang.pdf: Fila har 63 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.",
      ),
    ).toBeTruthy();
    expect(await screen.findByText("rar.pdf: Noe gikk galt. Prøv igjen.")).toBeTruthy();
  });

  it("UX-DR20: i demomodus står «I demomodus sendes ingenting ut.» i merknadsflaten under opplastingsfeltet", async () => {
    renderPage();
    const note = await screen.findByText("I demomodus sendes ingenting ut.");
    const surface = note.closest('[data-slot="note-surface"]')!;
    expect(surface.className).toContain("bg-surface-note");
    expect(surface.className).toContain("rounded-option");
    expect(surface.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    const zone = document.querySelector('[data-slot="upload-zone"]')!;
    expect(zone.compareDocumentPosition(surface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("UX-DR20: utenfor demomodus vises ingen merknad ennå", async () => {
    demoMode = false;
    renderPage();
    await screen.findByText("Dra og slipp PDF-filer hit");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/config")).toBe(true));
    expect(screen.queryByText("I demomodus sendes ingenting ut.")).toBeNull();
    expect(document.querySelector('[data-slot="note-surface"]')).toBeNull();
  });

  it("FR-8: filer sluppet på feltet lastes opp på samme måte", async () => {
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");
    const zone = document.querySelector('[data-slot="upload-zone"]')!;
    fireEvent.drop(zone, { dataTransfer: { files: [pdf("sluppet.pdf")] } });
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
    expect(screen.getByText("sluppet.pdf")).toBeTruthy();
  });

  it("FR-4: utlogget under opplasting stopper løkka, så resten av filene sendes ikke", async () => {
    uploadAnswer = () => ({ code: "UNAUTHENTICATED" });
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");

    choose(pdf("en.pdf"), pdf("to.pdf"), pdf("tre.pdf"));

    await waitFor(() => expect(uploadCalls()).toHaveLength(1));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(""));
    expect(uploadCalls()).toHaveLength(1);
    expect(screen.queryByText(/^en\.pdf:/)).toBeNull();
  });

  describe("vilkårene før første opplasting", () => {
    beforeEach(() => {
      termsAcceptedAt = null;
    });

    it("FR-11: én valgt fil åpner «Før du laster opp» med filnavnet, og ingenting lastes opp ennå", async () => {
      renderPage();
      await pageReady();

      choose(pdf("notater.pdf"));

      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(dialog.className).toContain("w-[640px]");
      expect(
        within(dialog).getByText("Du har valgt notater.pdf. Vi viser dette bare før den første opplastingen."),
      ).toBeTruthy();
      expect(within(dialog).getByRole("heading", { level: 3, name: "DITT ANSVAR" })).toBeTruthy();
      expect(within(dialog).getByRole("heading", { level: 3, name: "HVOR NOTATENE SENDES" })).toBeTruthy();
      // Focus is in the dialog, on the checkbox.
      expect(document.activeElement).toBe(
        within(dialog).getByRole("checkbox", {
          name: "Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke.",
        }),
      );
      expect(uploadCalls()).toHaveLength(0);
      expect(termsCalls()).toHaveLength(0);
    });

    it("FR-11: tre filer gir «Du har valgt 3 filer.»", async () => {
      renderPage();
      await pageReady();
      choose(pdf("en.pdf"), pdf("to.pdf"), pdf("tre.pdf"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(
        within(dialog).getByText("Du har valgt 3 filer. Vi viser dette bare før den første opplastingen."),
      ).toBeTruthy();
    });

    it("UX-DR23: «Godta og last opp» er ikke aktiv før boksen er krysset av", async () => {
      renderPage();
      await pageReady();
      choose(pdf("notater.pdf"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      const accept = within(dialog).getByRole("button", { name: "Godta og last opp" }) as HTMLButtonElement;
      expect(accept.disabled).toBe(true);
      expect(accept.querySelector("svg")).not.toBeNull();
      fireEvent.click(accept);
      expect(termsCalls()).toHaveLength(0);

      const box = within(dialog).getByRole("checkbox");
      fireEvent.click(box);
      expect(box.getAttribute("aria-checked")).toBe("true");
      expect(accept.disabled).toBe(false);
      fireEvent.click(box);
      expect(accept.disabled).toBe(true);
    });

    it("FR-11: godta lagrer vilkårene, laster opp filene og viser avviste filer som før", async () => {
      uploadAnswer = (file) => (file.name.endsWith(".docx") ? { code: "NOT_PDF" } : undefined);
      renderPage();
      await pageReady();
      choose(pdf("notater.pdf"), new File(["PK"], "notater.docx"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      fireEvent.click(within(dialog).getByRole("checkbox"));
      fireEvent.click(within(dialog).getByRole("button", { name: "Godta og last opp" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      expect(termsCalls()).toHaveLength(1);
      expect(termsCalls()[0][1]?.body).toBeUndefined();
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
      expect(
        await screen.findByText(
          "notater.docx: Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.",
        ),
      ).toBeTruthy();
      expect(uploadCalls()).toHaveLength(2);

      // Next time: no dialog, the file goes straight up.
      choose(pdf("neste.pdf"));
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 6 sider")).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(termsCalls()).toHaveLength(1);
    });

    it("FR-11: «Avbryt», lukkekrysset og Esc laster ingenting opp og kaller ikke vilkårsruten", async () => {
      renderPage();
      await pageReady();
      const picker = screen.getByRole("button", { name: "Velg PDF" });
      for (const close of [
        (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" })),
        (dialog: HTMLElement) => fireEvent.click(within(dialog).getByRole("button", { name: "Lukk" })),
        (dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" }),
      ]) {
        picker.focus();
        choose(pdf("notater.pdf"));
        const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
        fireEvent.click(within(dialog).getByRole("checkbox"));
        close(dialog);
        expect(screen.queryByRole("dialog")).toBeNull();
        await waitFor(() => expect(document.activeElement).toBe(picker));
      }
      expect(uploadCalls()).toHaveLength(0);
      expect(termsCalls()).toHaveLength(0);

      // The tick does not survive: the box is empty when the dialog opens again.
      choose(pdf("notater.pdf"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(within(dialog).getByRole("checkbox").getAttribute("aria-checked")).toBe("false");
      expect((within(dialog).getByRole("button", { name: "Godta og last opp" }) as HTMLButtonElement).disabled).toBe(
        true,
      );
    });

    it("FR-11: feiler vilkårskallet, står dialogen med «Noe gikk galt. Prøv igjen.» og ingenting lastes opp", async () => {
      termsStatus = 500;
      renderPage();
      await pageReady();
      choose(pdf("notater.pdf"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      fireEvent.click(within(dialog).getByRole("checkbox"));
      fireEvent.click(within(dialog).getByRole("button", { name: "Godta og last opp" }));

      const alert = await within(dialog).findByRole("alert");
      expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
      expect(screen.getByRole("dialog", { name: "Før du laster opp" })).toBeTruthy();
      expect(uploadCalls()).toHaveLength(0);

      // A new try that works uploads the file.
      termsStatus = 200;
      fireEvent.click(within(dialog).getByRole("button", { name: "Godta og last opp" }));
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("FR-11: filer sluppet på feltet går også gjennom vilkårsdialogen", async () => {
      renderPage();
      await pageReady();
      const zone = document.querySelector('[data-slot="upload-zone"]')!;
      fireEvent.drop(zone, { dataTransfer: { files: [pdf("sluppet.pdf")] } });
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(within(dialog).getByText(/^Du har valgt sluppet\.pdf\./)).toBeTruthy();
      expect(uploadCalls()).toHaveLength(0);
    });

    it("NFR-6: i demomodus står «I demomodus sendes ingenting ut.» i dialogen, ellers ikke", async () => {
      renderPage();
      await pageReady();
      choose(pdf("notater.pdf"));
      let dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(await within(dialog).findByText("I demomodus sendes ingenting ut.")).toBeTruthy();
      cleanup();

      demoMode = false;
      renderPage();
      await pageReady();
      await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/config")).toHaveLength(2));
      choose(pdf("notater.pdf"));
      dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      expect(within(dialog).getByText("Google kan logge forespørslene en periode for å oppdage misbruk.")).toBeTruthy();
      expect(within(dialog).queryByText("I demomodus sendes ingenting ut.")).toBeNull();
    });
  });
});
