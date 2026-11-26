// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FORMULA_FLAG_TEXT } from "@/components/formula-flag";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { JobWatcher } from "@/modules/generation/components/job-watcher";
import type { Job } from "@/modules/generation/types";
import type { Lecture, Subject } from "@/modules/subjects/types";

import type { Summary } from "../types";
import { SummaryPage, summarySubtitle } from "./summary-page";

const notFound = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => notFound(),
  usePathname: () => "/forelesninger/l1/sammendrag",
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function errorResponse(status: number, code: string): Response {
  return jsonResponse(status, { error: { code, details: {} } });
}

const SUBJECT: Subject = {
  id: "s1",
  name: "Markedsføring",
  exam_date: "2026-12-04",
  color_index: 0,
  lecture_count: 1,
  created_at: "2026-11-21T10:00:00Z",
};
const LECTURE: Lecture = { id: "l1", subject_id: "s1", name: "Uke 37: Merkevare", date: "2026-09-11", created_at: "1" };

function point(id: string, text: string, file: string, page: number, formula = false) {
  return {
    id,
    text,
    formula_flag: formula,
    source: { file_id: file === "merkevare-notater.pdf" ? "f1" : "f2", file_name: file, page_no: page },
  };
}

// Mockup 13: 7 points in 3 themes from 2 files, made 10.11.2026.
function oldSummary(): Summary {
  return {
    created_at: new Date(2026, 10, 10, 9, 30).toISOString(),
    point_count: 7,
    themes: [
      {
        title: "Hva er en merkevare",
        points: [
          point("p1", "En merkevare skiller et produkt fra konkurrentenes.", "merkevare-notater.pdf", 2),
          point("p2", "Kjente merker gir kunden en snarvei i valget.", "merkevare-notater.pdf", 3),
        ],
      },
      {
        title: "Merkevareekvitet",
        points: [
          point("p3", "Merkevareekvitet er merverdien et merke gir.", "merkevare-notater.pdf", 4, true),
          point("p4", "Den bygges av kjennskap og lojalitet.", "merkevare-notater.pdf", 4),
          point("p5", "Sterke assosiasjoner er vanskelige å kopiere.", "merkevare-notater.pdf", 5),
        ],
      },
      {
        title: "Merkevarestrategier",
        points: [
          point("p6", "<b>Merkevareutvidelse</b> bruker et kjent merke.", "merkevare-forelesning2.pdf", 2),
          point("p7", "Produsentmerket eies av produsenten.", "merkevare-forelesning2.pdf", 3),
        ],
      },
    ],
    files: [
      { file_id: "f1", file_name: "merkevare-notater.pdf", page_count: 12 },
      { file_id: "f2", file_name: "merkevare-forelesning2.pdf", page_count: 6 },
    ],
  };
}

const NEW_SUMMARY: Summary = {
  created_at: new Date(2026, 10, 26, 8, 0).toISOString(),
  point_count: 5,
  themes: [
    {
      title: "Nytt tema",
      points: [1, 2, 3, 4, 5].map((n) => point(`n${n}`, `Nytt punkt ${n}.`, "merkevare-notater.pdf", n)),
    },
  ],
  files: [{ file_id: "f1", file_name: "merkevare-notater.pdf", page_count: 12 }],
};

let summary: Summary;
// 200, or an error code for GET …/summary.
let summaryError: { status: number; code: string } | null;
let lectureStatus: number;
let latestJobs: Job[];
// What a started summary job ends as, and whether it is held running.
let outcome: { status: "done" | "failed"; created: number | null; error_code: string | null };
let holdJob: boolean;
let startError: { status: number; code: string } | null;
let running: Job | null;

function job(changes: Partial<Job> = {}): Job {
  return {
    id: "j1",
    lecture_id: "l1",
    kind: "summary",
    params: { requested: 15 },
    status: "running",
    requested: 15,
    created: null,
    discarded: null,
    error_code: null,
    started_at: "2026-11-21T10:00:00Z",
    finished_at: null,
    ...changes,
  };
}

function posts() {
  return fetchMock.mock.calls
    .filter(([url, init]) => String(url) === "/api/lectures/l1/jobs" && init?.method === "POST")
    .map(([, init]) => JSON.parse(String(init!.body)));
}

beforeEach(() => {
  summary = oldSummary();
  summaryError = null;
  lectureStatus = 200;
  latestJobs = [];
  outcome = { status: "done", created: 5, error_code: null };
  holdJob = false;
  startError = null;
  running = null;
  notFound.mockReset();
  push.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url);
    if (path === "/api/lectures/l1") {
      if (lectureStatus !== 200) return errorResponse(lectureStatus, "NOT_FOUND");
      return jsonResponse(200, LECTURE);
    }
    if (path === "/api/subjects/s1") return jsonResponse(200, SUBJECT);
    if (path === "/api/subjects") return jsonResponse(200, [SUBJECT]);
    if (path === "/api/subjects/s1/lectures") return jsonResponse(200, [LECTURE]);
    if (path === "/api/overview") return jsonResponse(200, { subjects: [] });
    if (path === "/api/lectures/l1/summary") {
      if (summaryError) return errorResponse(summaryError.status, summaryError.code);
      return jsonResponse(200, summary);
    }
    if (path === "/api/lectures/l1/jobs/latest") return jsonResponse(200, running ? [...latestJobs.filter((other) => other.kind !== "summary"), running] : latestJobs);
    if (path === "/api/lectures/l1/content-counts") {
      return jsonResponse(200, { flashcards: 0, quiz_questions: 0, model_cards: 0, freetext_questions: 0, summary_points: summary.point_count });
    }
    if (path === "/api/lectures/l1/jobs" && init?.method === "POST") {
      if (startError) return errorResponse(startError.status, startError.code);
      running = job({ id: `j${posts().length}` });
      return jsonResponse(202, running);
    }
    if (path === "/api/jobs/active") {
      if (running?.status === "running" && !holdJob) {
        running = { ...running, ...outcome, discarded: 0, finished_at: "2026-11-21T10:00:03Z" };
        if (outcome.status === "done") summary = NEW_SUMMARY;
      }
      return jsonResponse(200, running?.status === "running" ? [{ ...running, lecture_name: LECTURE.name }] : []);
    }
    if (running && path === `/api/jobs/${running.id}`) return jsonResponse(200, { ...running, lecture_name: LECTURE.name });
    return errorResponse(404, "NOT_FOUND");
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.title = "";
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <JobWatcher>
        <SummaryPage lectureId="l1" />
      </JobWatcher>
    </QueryClientProvider>,
  );
}

async function heading() {
  return screen.findByRole("heading", { level: 1, name: "Sammendrag" });
}

function card() {
  return screen.getByRole("complementary", { name: "Om sammendraget" });
}

describe("SummaryPage", () => {
  it("FR-54, UX-DR38: én h1, brødsmulene som lenker og underteksten med antall, temaer, dato og filer", async () => {
    renderPage();
    await heading();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const crumbs = screen.getByRole("navigation", { name: "Brødsmuler" });
    expect(await within(crumbs).findByRole("link", { name: "Markedsføring" })).toBeTruthy();
    expect(within(crumbs).getByRole("link", { name: "Markedsføring" }).getAttribute("href")).toBe("/emner/s1");
    expect(within(crumbs).getByRole("link", { name: "Uke 37: Merkevare" }).getAttribute("href")).toBe("/forelesninger/l1");
    expect(screen.getByText("7 punkter i 3 temaer · laget 10.11.2026 fra 2 filer")).toBeTruthy();
    await waitFor(() => expect(document.title).toBe("Sammendrag – Uke 37: Merkevare – Studiekamerat"));
  });

  it("FR-54: undertekst i entall for ett punkt, ett tema og én fil", () => {
    const one: Summary = {
      created_at: new Date(2026, 0, 2, 12).toISOString(),
      point_count: 1,
      themes: [{ title: "A", points: [point("p", "Tekst.", "a.pdf", 1)] }],
      files: [{ file_id: "f1", file_name: "a.pdf", page_count: 1 }],
    };
    expect(summarySubtitle(one)).toBe("1 punkt i 1 tema · laget 02.01.2026 fra 1 fil");
  });

  it("FR-54: temaene er h2 i rekkefølge, punktene en liste med kilde under teksten og formelmerket", async () => {
    renderPage();
    await heading();
    const article = screen.getByRole("article");
    const themes = within(article).getAllByRole("heading", { level: 2 });
    expect(themes.map((theme) => theme.textContent)).toEqual([
      "Hva er en merkevare",
      "Merkevareekvitet",
      "Merkevarestrategier",
    ]);
    const lists = within(article).getAllByRole("list");
    expect(lists.map((list) => within(list).getAllByRole("listitem").length)).toEqual([2, 3, 2]);
    const first = within(lists[0]).getAllByRole("listitem")[0];
    expect(first.textContent).toBe(
      "En merkevare skiller et produkt fra konkurrentenes.merkevare-notater.pdf, side 2",
    );
    const flagged = within(lists[1]).getAllByRole("listitem")[0];
    expect(within(flagged).getByText(FORMULA_FLAG_TEXT)).toBeTruthy();
    expect(within(lists[1]).getAllByText(FORMULA_FLAG_TEXT)).toHaveLength(1);
    expect(within(flagged).getByText("merkevare-notater.pdf, side 4")).toBeTruthy();
    // The article column is at most 568 px.
    expect(article.parentElement!.className).toContain("max-w-article-width");
  });

  it("FR-54: generert tekst vises som ren tekst", async () => {
    renderPage();
    await heading();
    expect(screen.getByText("<b>Merkevareutvidelse</b> bruker et kjent merke.")).toBeTruthy();
    expect(document.querySelector("article b")).toBeNull();
  });

  it("UX-DR38: innholdskortet etter artikkelen med INNHOLD, KILDER, knappen, teksten og merknaden", async () => {
    renderPage();
    await heading();
    const aside = card();
    // After the article in the DOM.
    expect(screen.getByRole("article").compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const content = within(aside).getByRole("heading", { level: 2, name: "Innhold" });
    expect(content.className).toContain("text-overline");
    const [themes, files] = within(aside).getAllByRole("list");
    expect(within(themes).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Hva er en merkevare2 punkter",
      "Merkevareekvitet3 punkter",
      "Merkevarestrategier2 punkter",
    ]);
    expect(within(aside).getByRole("heading", { level: 2, name: "Kilder" })).toBeTruthy();
    expect(within(files).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "merkevare-notater.pdf12 sider",
      "merkevare-forelesning2.pdf6 sider",
    ]);
    const remake = await within(aside).findByRole("button", { name: "Lag nytt sammendrag" });
    expect(remake.dataset.variant).toBe("outline");
    expect(remake.querySelector("svg")).toBeTruthy();
    expect(within(aside).getByText("Det nye sammendraget erstatter dette. Det gamle blir ikke lagret.")).toBeTruthy();
    const note = within(aside).getByText("Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.");
    expect(note.closest("[data-slot=note-surface]")).toBeTruthy();
  });

  it("FR-55: «Lag nytt sammendrag» starter jobben, det gamle står med jobbstatus, så kommer det nye", async () => {
    holdJob = true;
    renderPage();
    await heading();
    const remake = await within(card()).findByRole("button", { name: "Lag nytt sammendrag" });
    remake.focus();
    fireEvent.click(remake);
    await waitFor(() => expect(posts()).toEqual([{ kind: "summary", params: { requested: 15 } }]));
    expect(await within(card()).findByText("Lager sammendrag …", { selector: "p" })).toBeTruthy();
    expect(within(card()).queryByRole("button", { name: "Lag nytt sammendrag" })).toBeNull();
    const area = within(card()).getByRole("group", { name: "Nytt sammendrag" });
    expect(document.activeElement).toBe(area);
    expect(within(area).getByRole("status").textContent).toBe("Lager sammendrag …");
    // The old summary stays while the job runs.
    expect(screen.getByText("En merkevare skiller et produkt fra konkurrentenes.")).toBeTruthy();

    holdJob = false;
    expect(await screen.findByText("Nytt punkt 1.", {}, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByText("En merkevare skiller et produkt fra konkurrentenes.")).toBeNull();
    expect(screen.getByText(/^5 punkter i 1 tema · laget 26\.11\.2026 fra 1 fil$/)).toBeTruthy();
    await waitFor(() =>
      expect(within(card()).getByRole("status").textContent).toBe(
        "Sammendraget er ferdig: 5 punkter i Uke 37: Merkevare.",
      ),
    );
    expect(within(card()).getByRole("button", { name: "Lag nytt sammendrag" })).toBeTruthy();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("FR-55: TOO_FEW_SUMMARY_POINTS beholder det gamle med feilteksten og «Prøv igjen»", async () => {
    outcome = { status: "failed", created: null, error_code: "TOO_FEW_SUMMARY_POINTS" };
    renderPage();
    await heading();
    fireEvent.click(await within(card()).findByRole("button", { name: "Lag nytt sammendrag" }));
    const alert = await within(card()).findByRole("alert", {}, { timeout: 3000 });
    expect(alert.textContent).toBe(
      "Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.",
    );
    expect(screen.getByText("En merkevare skiller et produkt fra konkurrentenes.")).toBeTruthy();
    expect(within(card()).queryByRole("button", { name: "Lag nytt sammendrag" })).toBeNull();
    const retry = within(card()).getByRole("button", { name: "Prøv igjen" });
    // The failure is read by the alert, not twice.
    expect(within(card()).getByRole("status").textContent).toBe("");

    outcome = { status: "done", created: 5, error_code: null };
    fireEvent.click(retry);
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]).toEqual({ kind: "summary", params: { requested: 15 } });
    expect(await screen.findByText("Nytt punkt 1.", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(card()).queryByRole("alert")).toBeNull();
  });

  it("FR-21: en feilet sammendragsjobb fra før viser feilteksten og «Prøv igjen» etter innlasting", async () => {
    latestJobs = [job({ status: "failed", error_code: "GENERATION_TIMEOUT", finished_at: "2026-11-21T10:00:03Z" })];
    renderPage();
    await heading();
    expect((await within(card()).findByRole("alert")).textContent).toBe(
      "Vi klarte ikke å lage sammendraget. Ingenting er lagret. Prøv igjen.",
    );
    expect(within(card()).getByRole("button", { name: "Prøv igjen" })).toBeTruthy();
  });

  it("UX-DR18: en annen types jobb gjør knappen inaktiv med ventetekst", async () => {
    latestJobs = [job({ kind: "flashcards", params: { requested: 20 }, requested: 20 })];
    renderPage();
    await heading();
    const reason = await within(card()).findByText("Venter til flashcardene er ferdige");
    const remake = within(card()).getByRole("button", { name: "Lag nytt sammendrag" }) as HTMLButtonElement;
    expect(remake.disabled).toBe(true);
    expect(remake.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("AR-12: en feil fra selve startkallet vises med meldingen for koden, og knappen står", async () => {
    startError = { status: 409, code: "JOB_ALREADY_RUNNING" };
    renderPage();
    await heading();
    fireEvent.click(await within(card()).findByRole("button", { name: "Lag nytt sammendrag" }));
    const alert = await within(card()).findByRole("alert");
    expect(alert.textContent).not.toBe(FALLBACK_MESSAGE);
    expect(alert.textContent!.length).toBeGreaterThan(0);
    expect(within(card()).getByRole("button", { name: "Lag nytt sammendrag" })).toBeTruthy();
  });

  it("FR-54: uten sammendrag (404 NOT_FOUND) vises «Fant ikke siden»", async () => {
    summaryError = { status: 404, code: "NOT_FOUND" };
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("AR-11: med bryteren av (404 FEATURE_DISABLED) vises «Fant ikke siden»", async () => {
    summaryError = { status: 404, code: "FEATURE_DISABLED" };
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-54: en annens forelesning (404 NOT_FOUND) vises som «Fant ikke siden»", async () => {
    lectureStatus = 404;
    summaryError = { status: 404, code: "NOT_FOUND" };
    renderPage();
    await waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("FR-56: siden lagrer ingen økt", async () => {
    renderPage();
    await heading();
    await within(card()).findByRole("button", { name: "Lag nytt sammendrag" });
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("practice-sessions"))).toBe(false);
    expect(fetchMock.mock.calls.every(([, init]) => !init?.method || init.method === "GET")).toBe(true);
  });

  it("andre feil enn 404 gir feilmeldingen", async () => {
    summaryError = { status: 500, code: "INTERNAL_ERROR" };
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
    expect(notFound).not.toHaveBeenCalled();
  });
});
