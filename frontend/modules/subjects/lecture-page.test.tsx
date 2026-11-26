// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { headingFocusPending, resetHeadingFocus } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import type { UploadedFile } from "@/modules/files/types";
import { OVERVIEW_QUERY_KEY } from "@/modules/practice/api";
import { JobWatcher } from "@/modules/generation/components/job-watcher";
import type { Job } from "@/modules/generation/types";

import { LecturePage } from "./pages/lecture-page";
import type { Lecture, Subject } from "./types";

// The real notFound() throws to show app/(app)/not-found.tsx; here it only records the call.
const notFound = vi.fn();
const push = vi.fn();
// The page the job watcher thinks she is on.
let pathname = "/forelesninger/l2";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  notFound: () => notFound(),
  usePathname: () => pathname,
}));

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
// The status the fake backend gives a file DELETE.
let deleteStatus = 204;
// How the fake backend answers a replace: a rejection code, a status, or undefined to accept.
let replaceAnswer: { status: number; code: string; details?: Record<string, unknown> } | undefined;
// Flashcards in lecture l2 and its latest flashcards job.
let cardCount = 0;
// Quiz questions in lecture l2.
let quizCount = 0;
// Model cards in lecture l2 (story 7.1), and the FEATURE_MNEMONICS switch.
let modelCount = 0;
let mnemonics = true;
// Free-text questions in lecture l2 (story 8.1), and the FEATURE_FREETEXT switch.
let freetextCount = 0;
let freetextFeature = true;
// Points in lecture l2's summary (story 9.1), and the FEATURE_SUMMARY switch.
let summaryCount = 0;
let summaryFeature = true;
let latestJob: Job | null = null;
// Latest jobs of other kinds in lecture l2 (shown with latestJob).
let otherJobs: Job[] = [];
// What a started job ends as. It ends the first time the job watcher asks for
// the running jobs after the start (unless holdJob is set).
let jobOutcome: { status: "done" | "failed"; created: number | null; error_code: string | null } = {
  status: "done",
  created: 20,
  error_code: null,
};
let holdJob = false;
let startStatus = 202;
// What GET /api/overview answers with: the lectures with these ids are practised
// (story 5.5), or a status code to fail with.
let practisedIds: string[] = [];
let overviewStatus = 200;

function job(changes: Partial<Job> = {}): Job {
  return {
    id: "j1",
    lecture_id: "l2",
    kind: "flashcards",
    // As stored by the backend: the same scope as requested.
    params: { requested: changes.requested ?? 20 },
    status: "running",
    requested: 20,
    created: null,
    discarded: null,
    error_code: null,
    started_at: "2026-11-21T10:00:00Z",
    finished_at: null,
    ...changes,
  };
}

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
    if (path === "/api/overview") {
      if (overviewStatus !== 200) return jsonResponse(overviewStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      const own = (subjectId: string) =>
        lectures
          .filter((lecture) => lecture.subject_id === subjectId)
          .sort((x, y) => x.date.localeCompare(y.date))
          .map((lecture) => ({
            id: lecture.id,
            name: lecture.name,
            date: lecture.date,
            practiced: practisedIds.includes(lecture.id),
            last_practiced_at: practisedIds.includes(lecture.id) ? "2026-11-03T10:00:00Z" : null,
          }));
      return jsonResponse(200, {
        subjects: [MARKETING, ECONOMICS].map((subject) => ({
          id: subject.id,
          name: subject.name,
          color_index: subject.color_index,
          exam_date: subject.exam_date,
          lectures: own(subject.id),
          last_session: null,
        })),
      });
    }
    if (path === "/api/subjects/a/lectures") {
      const sorted = [...lectures].sort((x, y) => x.date.localeCompare(y.date) || x.created_at.localeCompare(y.created_at));
      return jsonResponse(200, sorted);
    }
    if (path === "/api/subjects/b/lectures") return jsonResponse(200, []);
    if (path === "/api/config") {
      return jsonResponse(200, { demo_mode: demoMode, feature_mnemonics: mnemonics, feature_freetext: freetextFeature, feature_summary: summaryFeature });
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
    if (path === "/api/lectures/l2/jobs" && init?.method === "POST") {
      if (startStatus !== 202) {
        const code = startStatus === 409 ? "JOB_ALREADY_RUNNING" : "LECTURE_HAS_NO_FILES";
        return jsonResponse(startStatus, { error: { code, details: {} } });
      }
      const body = JSON.parse(String(init.body)) as Pick<Job, "kind" | "params">;
      otherJobs = [...otherJobs, ...(latestJob && latestJob.kind !== body.kind ? [latestJob] : [])].filter(
        (other) => other.kind !== body.kind,
      );
      latestJob = job({ id: `j${Date.now()}`, kind: body.kind, params: body.params, requested: body.params.requested });
      return jsonResponse(202, latestJob);
    }
    if (path === "/api/lectures/l2/jobs/latest") return jsonResponse(200, [...otherJobs, ...(latestJob ? [latestJob] : [])]);
    if (path === "/api/jobs/active") {
      if (latestJob?.status === "running" && !holdJob) {
        latestJob = { ...latestJob, ...jobOutcome, discarded: 0, finished_at: "2026-11-21T10:00:03Z" };
        if (jobOutcome.status === "done" && latestJob.kind === "quiz") quizCount += jobOutcome.created ?? 0;
        else if (jobOutcome.status === "done" && latestJob.kind === "models") modelCount += jobOutcome.created ?? 0;
        else if (jobOutcome.status === "done" && latestJob.kind === "freetext") freetextCount += jobOutcome.created ?? 0;
        // A new summary replaces the old one.
        else if (jobOutcome.status === "done" && latestJob.kind === "summary") summaryCount = jobOutcome.created ?? 0;
        else if (jobOutcome.status === "done") cardCount += jobOutcome.created ?? 0;
      }
      return jsonResponse(200, latestJob?.status === "running" ? [{ ...latestJob, lecture_name: "Uke 38: Prising" }] : []);
    }
    if (latestJob && path === `/api/jobs/${latestJob.id}`) {
      return jsonResponse(200, { ...latestJob, lecture_name: "Uke 38: Prising" });
    }
    if (path === "/api/lectures/l2/content-counts") {
      return jsonResponse(200, {
        flashcards: cardCount,
        quiz_questions: quizCount,
        model_cards: modelCount,
        freetext_questions: freetextCount,
        summary_points: summaryCount,
      });
    }
    if (/^\/api\/lectures\/l1\/(jobs\/latest|content-counts)$/.test(path)) {
      return jsonResponse(200, path.endsWith("latest") ? [] : { flashcards: 0, quiz_questions: 0, model_cards: 0, freetext_questions: 0, summary_points: 0 });
    }
    const filePreview = path.match(/^\/api\/files\/([^/]+)\/delete-preview$/);
    if (filePreview) {
      if (!files.some((file) => file.id === filePreview[1])) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, { counts: [] });
    }
    const fileReplace = path.match(/^\/api\/files\/([^/]+)\/replace$/);
    if (fileReplace && init?.method === "POST") {
      if (replaceAnswer) {
        return jsonResponse(replaceAnswer.status, {
          error: { code: replaceAnswer.code, details: replaceAnswer.details ?? {} },
        });
      }
      const index = files.findIndex((file) => file.id === fileReplace[1]);
      if (index < 0) return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
      const file = (init.body as FormData).get("file") as File;
      const created: UploadedFile = {
        id: `n${files.length + 1}`,
        lecture_id: "l2",
        original_name: file.name,
        page_count: 3,
        uploaded_at: "2026-11-21T10:00:00Z",
      };
      files = [...files.filter((_, other) => other !== index), created];
      return jsonResponse(201, created);
    }
    const fileDelete = path.match(/^\/api\/files\/([^/]+)$/);
    if (fileDelete && init?.method === "DELETE") {
      if (deleteStatus !== 204) return jsonResponse(deleteStatus, { error: { code: "INTERNAL_ERROR", details: {} } });
      files = files.filter((file) => file.id !== fileDelete[1]);
      return new Response(null, { status: 204 });
    }
    if (path === "/api/lectures/l2/delete-preview") {
      return jsonResponse(200, { counts: files.length > 0 ? [{ kind: "files", count: files.length }] : [] });
    }
    if (path === "/api/lectures/l2" && init?.method === "DELETE") {
      const index = lectures.findIndex((lecture) => lecture.id === "l2");
      if (index >= 0) lectures.splice(index, 1);
      return new Response(null, { status: 204 });
    }
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
      <JobWatcher>
        <LecturePage lectureId={id} />
      </JobWatcher>
    </QueryClientProvider>,
  );
  return client;
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
  deleteStatus = 204;
  replaceAnswer = undefined;
  cardCount = 0;
  quizCount = 0;
  modelCount = 0;
  mnemonics = true;
  freetextCount = 0;
  freetextFeature = true;
  summaryCount = 0;
  summaryFeature = true;
  latestJob = null;
  otherJobs = [];
  jobOutcome = { status: "done", created: 20, error_code: null };
  holdJob = false;
  pathname = "/forelesninger/l2";
  startStatus = 202;
  practisedIds = [];
  overviewStatus = 200;
  push.mockReset();
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

// The upload zone's live region (the «Lag og øv» row has its own).
function uploadStatus() {
  return within(screen.getByRole("region", { name: "Filer" })).getByRole("status");
}

function uploadCalls() {
  return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/files") && init?.method === "POST");
}

afterEach(() => {
  resetHeadingFocus();
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
    const current = await within(nav).findByRole("link", { name: "Uke 38: Prising Ikke øvd ennå" });
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.className).toContain("bg-brand-tint");
    expect(within(nav).getByRole("link", { name: "Uke 37: Merkevare Ikke øvd ennå" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("link", { name: "Markedsføring" }).hasAttribute("aria-current")).toBe(false);
    expect(within(nav).getByRole("button", { name: "Markedsføring" }).getAttribute("aria-expanded")).toBe("true");
    expect(within(nav).getByRole("button", { name: "Samfunnsøkonomi" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("FR-15: «Endre dato» viser dagens dato, lagrer og flytter raden i sidemenyen uten omlasting", async () => {
    renderPage();
    const nav = await screen.findByRole("navigation", { name: "Emner" });
    await within(nav).findByRole("link", { name: "Uke 38: Prising Ikke øvd ennå" });
    expect(lectureHrefs(nav)).toEqual(["/forelesninger/l1", "/forelesninger/l2"]);
    // The semester line (story 5.5) starts in September before the change.
    const timeline = await screen.findByRole("region", { name: "Semesterlinje" });
    const station = () => timeline.querySelector('[data-station="l2"] circle:not([data-part])')?.getAttribute("cx");
    await waitFor(() => expect(station()).toBeTruthy());
    const before = station();
    expect(within(timeline).queryByText("AUG")).toBeNull();

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
    // The overview is refetched: the line now starts in August and the station has moved.
    expect(await within(timeline).findByText("AUG")).toBeTruthy();
    expect(station()).not.toBe(before);
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
    expect(await within(nav).findByRole("link", { name: "Uke 38: Pris Ikke øvd ennå" })).toBeTruthy();
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
      "merkevare-notater.pdf12 sider · lastet opp 12.09ErstattErstatt merkevare-notater.pdfSlettSlett merkevare-notater.pdf",
      "merkevare-forelesning2.pdf6 sider · lastet opp 12.09ErstattErstatt merkevare-forelesning2.pdfSlettSlett merkevare-forelesning2.pdf",
    ]);
    // The name is cut off with CSS; the whole name is in the DOM and the tooltip.
    const name = within(rows[0]).getByText("merkevare-notater.pdf", { selector: "p" });
    expect(name.className).toContain("truncate");
    expect(name.getAttribute("title")).toBe("merkevare-notater.pdf");
    expect(rows[0].firstElementChild!.className).toContain("h-file-row");
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

    const status = uploadStatus();
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
    await waitFor(() => expect(uploadStatus().textContent).toBe(""));
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

  it("NFR-5: med Gemini står personvernmerknaden fra skisse 04 under opplastingsfeltet", async () => {
    demoMode = false;
    renderPage();
    const first = await screen.findByText("Notatene sendes til Googles språkmodell i EU.");
    const surface = first.closest('[data-slot="note-surface"]')!;
    expect(surface.className).toContain("bg-surface-note");
    expect(
      within(surface as HTMLElement).getByText("Ikke last opp personopplysninger, f.eks. navn på medstudenter."),
    ).toBeTruthy();
    expect(screen.queryByText("I demomodus sendes ingenting ut.")).toBeNull();
    const zone = document.querySelector('[data-slot="upload-zone"]')!;
    expect(zone.compareDocumentPosition(surface) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("FR-8: filer sluppet på feltet lastes opp på samme måte", async () => {
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");
    const zone = document.querySelector('[data-slot="upload-zone"]')!;
    fireEvent.drop(zone, { dataTransfer: { files: [pdf("sluppet.pdf")] } });
    expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
    expect(screen.getByText("sluppet.pdf", { selector: "p" })).toBeTruthy();
  });

  it("FR-4: utlogget under opplasting stopper løkka, så resten av filene sendes ikke", async () => {
    uploadAnswer = () => ({ code: "UNAUTHENTICATED" });
    renderPage();
    await screen.findByText("Forelesning fredag 18.09.2026 · 0 filer · 0 sider");

    choose(pdf("en.pdf"), pdf("to.pdf"), pdf("tre.pdf"));

    await waitFor(() => expect(uploadCalls()).toHaveLength(1));
    await waitFor(() => expect(uploadStatus().textContent).toBe(""));
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

    it("FR-11: Esc mens vilkårskallet pågår lukker ikke dialogen, og fila lastes opp når svaret kommer", async () => {
      let release!: () => void;
      const hold = new Promise<void>((resolve) => (release = resolve));
      const fallback = fetchMock.getMockImplementation()!;
      fetchMock.mockImplementation(async (url, init) => {
        if (String(url) === "/api/identity/terms") await hold;
        return fallback(url, init);
      });
      renderPage();
      await pageReady();
      choose(pdf("notater.pdf"));
      const dialog = await screen.findByRole("dialog", { name: "Før du laster opp" });
      fireEvent.click(within(dialog).getByRole("checkbox"));
      fireEvent.click(within(dialog).getByRole("button", { name: "Godta og last opp" }));
      await waitFor(() => expect(termsCalls()).toHaveLength(1));

      fireEvent.keyDown(dialog, { key: "Escape" });
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(screen.getByRole("dialog", { name: "Før du laster opp" })).toBeTruthy();
      expect(uploadCalls()).toHaveLength(0);

      release();
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 3 sider")).toBeTruthy();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(uploadCalls()).toHaveLength(1);
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
  describe("sletting", () => {
    it("FR-14: «Slett» på en fil viser dialogen med filnavn, sider og forelesning, og sletter bare den", async () => {
      files = [uploadedFile("merkevare-notater.pdf", 12, "f1"), uploadedFile("prising.pdf", 6, "f2")];
      renderPage();
      await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 18 sider");
      const button = screen.getByRole("button", { name: "Slett merkevare-notater.pdf" });
      expect(button.className).toContain("text-danger");
      button.focus();
      fireEvent.click(button);

      const dialog = screen.getByRole("dialog", { name: "Slette fila?" });
      expect(within(dialog).getByText("merkevare-notater.pdf")).toBeTruthy();
      expect(within(dialog).getByText("12 sider · Uke 38: Prising")).toBeTruthy();
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
      await within(dialog).findByText("Det kan ikke angres.");
      expect(dialog.textContent).not.toContain("Dette sletter også");
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett fila" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const list = screen.getByRole("list", { name: "Filer" });
      expect(within(list).getAllByRole("listitem")).toHaveLength(1);
      expect(within(list).queryByText("merkevare-notater.pdf")).toBeNull();
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 1 fil · 6 sider")).toBeTruthy();
      // The row is gone, so focus goes to «Filer» (#75).
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Filer" })),
      );
      const deletes = fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE");
      expect(deletes.map(([url]) => String(url))).toEqual(["/api/files/f1"]);
    });

    it("UX-DR21: Esc på fildialogen sletter ingenting, og fokus går tilbake til «Slett»", async () => {
      files = [uploadedFile("merkevare-notater.pdf", 12, "f1")];
      renderPage();
      const button = await screen.findByRole("button", { name: "Slett merkevare-notater.pdf" });
      button.focus();
      fireEvent.click(button);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button));
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    });

    it("FR-14: feiler slettingen, står dialogen med reserveteksten og fila står igjen", async () => {
      deleteStatus = 500;
      files = [uploadedFile("merkevare-notater.pdf", 12, "f1")];
      renderPage();
      fireEvent.click(await screen.findByRole("button", { name: "Slett merkevare-notater.pdf" }));
      const dialog = screen.getByRole("dialog");
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett fila" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
      // The page behind the dialog is hidden from screen readers while it is open.
      expect(screen.getByRole("button", { name: "Slett merkevare-notater.pdf", hidden: true })).toBeTruthy();
    });

    it("FR-7: «Slett forelesningen» viser filene som går med, og tar henne til emnesiden", async () => {
      files = [uploadedFile("a.pdf", 2, "f1"), uploadedFile("b.pdf", 3, "f2")];
      renderPage();
      await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 5 sider");
      const buttons = within(screen.getByRole("button", { name: "Nytt navn" }).parentElement!)
        .getAllByRole("button")
        .map((button) => button.textContent);
      expect(buttons).toEqual(["Nytt navn", "Endre dato", "Slett forelesningen"]);
      const button = screen.getByRole("button", { name: "Slett forelesningen" });
      expect(button.className).toContain("text-danger");
      fireEvent.click(button);

      const dialog = screen.getByRole("dialog", { name: "Slette forelesningen?" });
      expect(within(dialog).getByText("Uke 38: Prising")).toBeTruthy();
      expect(await within(dialog).findByText("Dette sletter også 2 filer.")).toBeTruthy();
      expect(within(dialog).getByText("Det kan ikke angres.")).toBeTruthy();
      fireEvent.click(within(dialog).getByRole("button", { name: "Slett forelesningen" }));

      await waitFor(() => expect(push).toHaveBeenCalledWith("/emner/a"));
      expect(headingFocusPending()).toBe(true);
      // The page does not show «Fant ikke siden» before she has left it.
      expect(notFound).not.toHaveBeenCalled();
    });
  });

  describe("erstatning", () => {
    function replaceCalls() {
      return fetchMock.mock.calls.filter(([url, init]) => String(url).endsWith("/replace") && init?.method === "POST");
    }

    async function pickReplacement(name: string, replacement: File) {
      const button = await screen.findByRole("button", { name: `Erstatt ${name}` });
      button.focus();
      fireEvent.click(button);
      const id = files.find((file) => file.original_name === name)!.id;
      fireEvent.change(screen.getByTestId(`replace-input-${id}`), { target: { files: [replacement] } });
      return button;
    }

    it("FR-13: «Erstatt» står foran «Slett» i ultramarin og åpner sin egen skjulte filvelger", async () => {
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      const button = await screen.findByRole("button", { name: "Erstatt merkevare.pdf" });
      expect(button.className).not.toContain("text-danger");
      const row = button.closest("li")!;
      expect(within(row).getAllByRole("button").map((other) => other.textContent)).toEqual([
        "ErstattErstatt merkevare.pdf",
        "SlettSlett merkevare.pdf",
      ]);
      const input = screen.getByTestId("replace-input-f1") as HTMLInputElement;
      expect(input.type).toBe("file");
      expect(input.multiple).toBe(false);
      expect(input.hasAttribute("accept")).toBe(false);
      const click = vi.spyOn(input, "click");
      fireEvent.click(button);
      expect(click).toHaveBeenCalledTimes(1);
      expect(row.querySelector("[aria-live=polite]")).not.toBeNull();
    });

    it("FR-13: godtatt erstatning viser den nye fila sist, oppdaterer linja og gir fokus til «Filer»", async () => {
      files = [uploadedFile("merkevare.pdf", 2, "f1"), uploadedFile("prising.pdf", 6, "f2")];
      renderPage();
      await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 8 sider");
      await pickReplacement("merkevare.pdf", pdf("ny.pdf"));

      const dialog = screen.getByRole("dialog", { name: "Erstatte fila?" });
      expect(within(dialog).getByText("merkevare.pdf")).toBeTruthy();
      expect(within(dialog).getByText("2 sider · Uke 38: Prising")).toBeTruthy();
      expect(within(dialog).getByText("Erstattes med ny.pdf.")).toBeTruthy();
      expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Avbryt" }));
      await within(dialog).findByText("Det kan ikke angres.");
      expect(replaceCalls()).toHaveLength(0);
      fireEvent.click(within(dialog).getByRole("button", { name: "Erstatt fila" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const list = screen.getByRole("list", { name: "Filer" });
      const names = within(list)
        .getAllByRole("listitem")
        .map((item) => item.querySelector("p")?.textContent);
      expect(names).toEqual(["prising.pdf", "ny.pdf"]);
      expect(within(list).getByText("3 sider · lastet opp 21.11")).toBeTruthy();
      expect(await screen.findByText("Forelesning fredag 18.09.2026 · 2 filer · 9 sider")).toBeTruthy();
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("heading", { level: 2, name: "Filer" })),
      );
      expect(replaceCalls().map(([url]) => String(url))).toEqual(["/api/files/f1/replace"]);
      const sent = (replaceCalls()[0][1]!.body as FormData).get("file") as File;
      expect(sent.name).toBe("ny.pdf");
    });

    it("E18: avbrutt filvelger åpner ingen dialog og sender ingenting", async () => {
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      await screen.findByRole("button", { name: "Erstatt merkevare.pdf" });
      fireEvent.change(screen.getByTestId("replace-input-f1"), { target: { files: [] } });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(replaceCalls()).toHaveLength(0);
    });

    it("FR-13: «Avbryt» sender ingenting, og fokus går tilbake til «Erstatt»", async () => {
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      const button = await pickReplacement("merkevare.pdf", pdf("ny.pdf"));
      const dialog = screen.getByRole("dialog", { name: "Erstatte fila?" });
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Avbryt" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(document.activeElement).toBe(button));
      expect(replaceCalls()).toHaveLength(0);
    });

    it("E17: avvist ny fil lukker dialogen, viser meldingen ved raden og gir fokus til «Erstatt»", async () => {
      replaceAnswer = { status: 422, code: "NOT_PDF" };
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      const button = await pickReplacement("merkevare.pdf", pdf("ny.docx"));
      const dialog = screen.getByRole("dialog", { name: "Erstatte fila?" });
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Erstatt fila" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const row = button.closest("li")!;
      const live = row.querySelector("[aria-live=polite]")!;
      expect(live.textContent).toBe(
        "ny.docx: Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.",
      );
      expect(within(row).getByText("merkevare.pdf")).toBeTruthy();
      await waitFor(() => expect(document.activeElement).toBe(button));

      // A new pick on the row clears the message.
      replaceAnswer = undefined;
      fireEvent.change(screen.getByTestId("replace-input-f1"), { target: { files: [pdf("ny.pdf")] } });
      expect(live.textContent).toBe("");
    });

    it.each([
      {
        code: "NO_READABLE_TEXT",
        details: {},
        text: "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.",
      },
      {
        code: "TOO_MANY_PAGES",
        details: { page_count: 51 },
        text: "Fila har 51 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.",
      },
      {
        code: "FILE_TOO_LARGE",
        details: { size_mb: 23, limit_mb: 20 },
        text: "Fila er på 23 MB. Grensen er 20 MB. Lagre den på nytt med mindre bilder, eller del den opp.",
      },
      {
        code: "PDF_UNREADABLE",
        details: {},
        text: "Vi klarte ikke å åpne denne PDF-en. Den kan være låst med passord eller skadet. Lagre den på nytt som PDF uten passord og prøv igjen.",
      },
    ])("E17: $code ved erstatning gir meldingen ved raden med tallene fylt inn", async ({ code, details, text }) => {
      replaceAnswer = { status: 422, code, details };
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      const button = await pickReplacement("merkevare.pdf", pdf("ny.pdf"));
      const dialog = screen.getByRole("dialog", { name: "Erstatte fila?" });
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Erstatt fila" }));

      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
      const live = button.closest("li")!.querySelector("[aria-live=polite]")!;
      expect(live.textContent).toBe(`ny.pdf: ${text}`);
      await waitFor(() => expect(document.activeElement).toBe(button));
    });

    it("FR-13: serverfeil viser reserveteksten i dialogen, og fila står", async () => {
      replaceAnswer = { status: 500, code: "INTERNAL_ERROR" };
      files = [uploadedFile("merkevare.pdf", 2, "f1")];
      renderPage();
      await pickReplacement("merkevare.pdf", pdf("ny.pdf"));
      const dialog = screen.getByRole("dialog", { name: "Erstatte fila?" });
      await within(dialog).findByText("Det kan ikke angres.");
      fireEvent.click(within(dialog).getByRole("button", { name: "Erstatt fila" }));
      expect((await within(dialog).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
      expect(screen.getByRole("dialog", { name: "Erstatte fila?" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Erstatt merkevare.pdf", hidden: true })).toBeTruthy();
    });
  });
});

describe("Lag og øv (story 3.1 og 3.2)", () => {
  const FAILED = "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.";

  // The Flashcards row (the Quiz row stands under it in the same region).
  function createRegion() {
    return screen.getByRole("group", { name: "Flashcards" });
  }
  function rowStatus() {
    return within(createRegion()).getByRole("status");
  }
  function posts() {
    return fetchMock.mock.calls
      .filter(([url, init]) => String(url) === "/api/lectures/l2/jobs" && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
  }
  async function openDialog(name = "Lag flashcards") {
    const region = await screen.findByRole("group", { name: "Flashcards" });
    const button = await within(region).findByRole("button", { name });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    button.focus();
    fireEvent.click(button);
    return { button, dialog: await screen.findByRole("dialog", { name: "Lag flashcards" }) };
  }
  async function startJobWith(scope: "Rask" | "Vanlig" | "Dyp", opener = "Lag flashcards") {
    const { dialog } = await openDialog(opener);
    fireEvent.click(within(dialog).getByRole("radio", { name: scope }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag flashcards" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }

  it("UX-DR18: «Lag og øv» står ved siden av «Filer» med Flashcards-raden, «Ingen ennå» og «Lag flashcards»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    expect(await screen.findByRole("heading", { level: 2, name: "Lag og øv" })).toBeTruthy();
    const region = await waitFor(() => createRegion());
    expect(within(region).getByRole("heading", { level: 3, name: "Flashcards" })).toBeTruthy();
    expect(await within(region).findByText("Ingen ennå")).toBeTruthy();
    const create = await within(region).findByRole("button", { name: "Lag flashcards" });
    await waitFor(() => expect((create as HTMLButtonElement).disabled).toBe(false));
    expect(create.dataset.variant).toBe("outline");
    expect(within(region).queryByRole("button", { name: "Øv nå" })).toBeNull();
    expect(screen.getByRole("region", { name: "Lag og øv" }).parentElement!.className).toContain("flex-wrap");
  });

  it("FR-23: «Øv nå» åpner flashcard-økten for forelesningen", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    cardCount = 24;
    renderPage();
    const region = await waitFor(() => createRegion());
    const practice = (await within(region).findByRole("button", { name: "Øv nå" })) as HTMLButtonElement;
    expect(practice.disabled).toBe(false);
    fireEvent.click(practice);
    expect(push).toHaveBeenCalledWith("/forelesninger/l2/flashcards");
  });

  it("UX-DR24: dialogen viser forelesningen med filer og sider, Omfang med «Vanlig» valgt og fokusert, og ventetiden i demomodus", async () => {
    files = [uploadedFile("merkevare.pdf", 3), uploadedFile("pris.pdf", 15)];
    renderPage();
    const { dialog } = await openDialog();
    expect(within(dialog).getByText("Uke 38: Prising · 2 filer, 18 sider")).toBeTruthy();
    expect(within(dialog).queryByText(/legges til/)).toBeNull();
    const group = within(dialog).getByRole("radiogroup", { name: "Omfang" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((radio) => radio.getAttribute("aria-labelledby") && document.getElementById(radio.getAttribute("aria-labelledby")!)!.textContent)).toEqual(["Rask", "Vanlig", "Dyp"]);
    expect(within(dialog).getByText("Inntil 10 kort")).toBeTruthy();
    expect(within(dialog).getByText("Inntil 20 kort")).toBeTruthy();
    expect(within(dialog).getByText("Inntil 30 kort")).toBeTruthy();
    const usual = within(group).getByRole("radio", { name: "Vanlig" });
    expect(usual.getAttribute("aria-checked")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(usual));
    expect(within(dialog).getByText("Tar noen sekunder.")).toBeTruthy();
    expect(within(dialog).getByText("Du kan bruke resten av appen imens.")).toBeTruthy();
    const buttons = within(dialog).getAllByRole("button").map((button) => button.textContent);
    expect(buttons.slice(-2)).toEqual(["Avbryt", "Lag flashcards"]);
    expect(group.className).toContain("min-[640px]:grid-cols-3");
  });

  it("UX-DR24: med kort står «Nye kort legges til de 24 du har fra før.», og uten demomodus den lengre ventetiden", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    cardCount = 24;
    demoMode = false;
    renderPage();
    await screen.findByText("24 kort");
    const { dialog } = await openDialog("Lag flere");
    expect(within(dialog).getByText("Nye kort legges til de 24 du har fra før.")).toBeTruthy();
    expect(await within(dialog).findByText("Tar vanligvis under to minutter.")).toBeTruthy();
  });

  it("UX-DR21: Esc lukker dialogen uten å starte noe, og fokus går tilbake til knappen", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const { button, dialog } = await openDialog();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(posts()).toEqual([]);
  });

  it("FR-17: «Rask» sender requested 10; «Lager flashcards …», så kortene og ferdigteksten uten omlasting", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "done", created: 10, error_code: null };
    renderPage();
    await startJobWith("Rask");
    const region = createRegion();
    expect(await within(region).findByText("Lager flashcards …", { selector: "p" })).toBeTruthy();
    expect(within(region).getByText("Du kan bruke resten av appen imens.")).toBeTruthy();
    await waitFor(() => expect(rowStatus().textContent).toBe("Lager flashcards …"));
    expect(posts()).toEqual([{ kind: "flashcards", params: { requested: 10 } }]);
    // Focus is on the row, not lost, now that the button is gone.
    expect(document.activeElement).toBe(screen.getByRole("group", { name: "Flashcards" }));

    expect(await within(region).findByText("10 kort", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(region).getByRole("button", { name: "Øv nå" })).toBeTruthy();
    expect(within(region).queryByText("Lager flashcards …")).toBeNull();
    expect(rowStatus().textContent).toBe("Flashcardene er ferdige: 10 kort i Uke 38: Prising.");
    expect(within(region).queryByRole("alert")).toBeNull();
  });

  it("FR-18, UX-DR44: færre enn valgt står på merknadsflaten og leses opp, og står til neste jobb starter", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "done", created: 1, error_code: null };
    renderPage();
    await startJobWith("Vanlig");
    const text = "Det ble laget 1 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.";
    await waitFor(() => expect(rowStatus().textContent).toBe(text), { timeout: 3000 });
    const note = within(createRegion()).getByText(text, { selector: "p" });
    expect(note.closest('[data-slot="note-surface"]')).toBeTruthy();
    expect(within(createRegion()).queryByRole("alert")).toBeNull();

    // The next job takes the message away.
    holdJob = true;
    await startJobWith("Vanlig", "Lag flere");
    expect(await within(createRegion()).findByText("Lager flashcards …", { selector: "p" })).toBeTruthy();
    expect(within(createRegion()).queryByText(text, { selector: "p" })).toBeNull();
  });

  it("FR-18: færre enn valgt fra en tidligere jobb står etter omlasting, uten å leses opp", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    cardCount = 12;
    latestJob = job({ status: "done", created: 12, discarded: 0, finished_at: "2026-11-21T10:00:03Z" });
    renderPage();
    const text = "Det ble laget 12 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.";
    const region = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(region).findByText(text)).toBeTruthy();
    expect(rowStatus().textContent).toBe("");
  });

  it("FR-18, FR-22, UX-DR44: ingen nye kort gir «Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.» synlig og opplest", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    cardCount = 24;
    jobOutcome = { status: "done", created: 0, error_code: null };
    renderPage();
    await screen.findByText("24 kort");
    await startJobWith("Vanlig", "Lag flere");
    const text = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";
    await waitFor(() => expect(rowStatus().textContent).toBe(text), { timeout: 3000 });
    const note = within(createRegion()).getByText(text, { selector: "p" });
    expect(note.closest('[data-slot="note-surface"]')).toBeTruthy();
    expect(within(createRegion()).getByText("24 kort")).toBeTruthy();
  });

  it.each(["GENERATION_FAILED", "GENERATION_TIMEOUT", "JOB_INTERRUPTED"])(
    "FR-21, UX-DR44: en jobb som feiler med %s, gir feilteksten som varsel og «Prøv igjen» med samme omfang",
    async (code) => {
      files = [uploadedFile("merkevare.pdf", 3)];
      jobOutcome = { status: "failed", created: null, error_code: code };
      renderPage();
      await startJobWith("Dyp");
      const region = createRegion();
      expect((await within(region).findByRole("alert", {}, { timeout: 3000 })).textContent).toBe(FAILED);
      // Read by the alert, not twice.
      expect(rowStatus().textContent).toBe("");
      expect(within(region).getByText("Ingen ennå")).toBeTruthy();
      expect(region.querySelector('[data-slot="note-surface"]')).toBeNull();

      jobOutcome = { status: "done", created: 3, error_code: null };
      fireEvent.click(within(region).getByRole("button", { name: "Prøv igjen" }));
      // The button goes away: focus is on the row, not lost.
      expect(document.activeElement).toBe(screen.getByRole("group", { name: "Flashcards" }));
      // No dialog: a new job with the same scope at once.
      expect(screen.queryByRole("dialog")).toBeNull();
      await waitFor(() => expect(posts()).toHaveLength(2));
      expect(posts()[1]).toEqual({ kind: "flashcards", params: { requested: 30 } });
      expect(await within(region).findByText("Lager flashcards …", { selector: "p" })).toBeTruthy();
      expect(within(region).queryByRole("alert")).toBeNull();
    },
  );

  it("FR-21: en feilet jobb fra før står med «Prøv igjen» når siden åpnes", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    latestJob = job({ status: "failed", requested: 10, error_code: "JOB_INTERRUPTED", finished_at: "2026-11-21T10:00:03Z" });
    renderPage();
    const region = await screen.findByRole("group", { name: "Flashcards" });
    expect((await within(region).findByRole("alert")).textContent).toBe(FAILED);
    fireEvent.click(within(region).getByRole("button", { name: "Prøv igjen" }));
    expect(document.activeElement).toBe(screen.getByRole("group", { name: "Flashcards" }));
    await waitFor(() => expect(posts()).toEqual([{ kind: "flashcards", params: { requested: 10 } }]));
  });

  it("SK-21: en jobb som allerede pågår, gir teksten fra 3.7, uten «Prøv igjen»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    startStatus = 409;
    renderPage();
    await startJobWith("Vanlig");
    const region = createRegion();
    expect((await within(region).findByRole("alert")).textContent).toBe(
      "Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.",
    );
    expect(within(region).queryByRole("button", { name: "Prøv igjen" })).toBeNull();
  });

  it("UX-DR19: en jobb som kjører når siden åpnes, vises med job-status", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    latestJob = job();
    holdJob = true;
    renderPage();
    const region = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(region).findByText("Lager flashcards …", { selector: "p" })).toBeTruthy();
    expect(within(region).queryByRole("button")).toBeNull();
  });

  it("AR-5: raden spør ikke etter siste jobb hvert sekund mens jobben kjører", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    latestJob = job();
    holdJob = true;
    renderPage();
    await within(await screen.findByRole("group", { name: "Flashcards" })).findByText("Lager flashcards …", { selector: "p" });
    const latestCalls = () => fetchMock.mock.calls.filter(([url]) => String(url) === "/api/lectures/l2/jobs/latest").length;
    const before = latestCalls();
    const activeBefore = fetchMock.mock.calls.filter(([url]) => String(url) === "/api/jobs/active").length;
    await new Promise((resolve) => setTimeout(resolve, 2200));
    expect(latestCalls()).toBe(before);
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === "/api/jobs/active").length).toBeGreaterThan(activeBefore);
  });

  it("FR-14: tellingen i «Lag og øv» hentes på nytt når fila slettes", async () => {
    files = [uploadedFile("merkevare.pdf", 3, "f1")];
    cardCount = 5;
    renderPage();
    const region = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(region).findByText("5 kort")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Slett merkevare.pdf" }));
    const dialog = screen.getByRole("dialog", { name: "Slette fila?" });
    await within(dialog).findByText("Det kan ikke angres.");
    // The cards go with the file in the backend (ON DELETE CASCADE).
    cardCount = 0;
    fireEvent.click(within(dialog).getByRole("button", { name: "Slett fila" }));
    expect(await within(region).findByText("Ingen ennå")).toBeTruthy();
    expect(within(region).queryByText("5 kort")).toBeNull();
  });

  it("UX-DR18: uten filer er knappen ikke aktiv, og «Last opp notater først.» er koblet til den", async () => {
    renderPage();
    const region = await screen.findByRole("group", { name: "Flashcards" });
    const reason = await within(region).findByText("Last opp notater først.");
    const create = within(region).getByRole("button", { name: "Lag flashcards" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.getAttribute("aria-describedby")).toBe(reason.id);
  });
});

describe("Quiz-raden (story 4.1)", () => {
  function quizRow() {
    return screen.getByRole("group", { name: "Quiz" });
  }
  function posts() {
    return fetchMock.mock.calls
      .filter(([url, init]) => String(url) === "/api/lectures/l2/jobs" && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
  }
  async function openQuizDialog(name = "Lag quiz") {
    const row = await screen.findByRole("group", { name: "Quiz" });
    const button = await within(row).findByRole("button", { name });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    button.focus();
    fireEvent.click(button);
    return { button, dialog: await screen.findByRole("dialog", { name: "Lag quiz" }) };
  }

  it("FR-28, UX-DR18: Quiz-raden står under Flashcards med skillelinje, «Ingen ennå» og «Lag quiz»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const row = await screen.findByRole("group", { name: "Quiz" });
    expect(within(row).getByRole("heading", { level: 3, name: "Quiz" })).toBeTruthy();
    expect(await within(row).findByText("Ingen ennå")).toBeTruthy();
    const create = within(row).getByRole("button", { name: "Lag quiz" }) as HTMLButtonElement;
    await waitFor(() => expect(create.disabled).toBe(false));
    expect(create.dataset.variant).toBe("outline");
    const card = row.parentElement!;
    expect(card.className).toContain("divide-y");
    expect(card.className).toContain("divide-divider");
    // With FEATURE_FREETEXT and FEATURE_SUMMARY on, the Fritekstspørsmål row
    // (story 8.1) and then the Sammendrag row (story 9.1) come last.
    const freetext = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    const summary = await screen.findByRole("group", { name: "Sammendrag" });
    expect(Array.from(card.children)).toEqual([
      screen.getByRole("group", { name: "Flashcards" }),
      row,
      freetext,
      summary,
    ]);
  });

  it("FR-28, FR-32: med spørsmål viser raden «15 spørsmål», «Lag flere» og «Øv nå», som åpner quizøkten", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    quizCount = 15;
    renderPage();
    const row = await screen.findByRole("group", { name: "Quiz" });
    expect(await within(row).findByText("15 spørsmål")).toBeTruthy();
    const practice = within(row).getByRole("button", { name: "Øv nå" }) as HTMLButtonElement;
    await waitFor(() => expect(practice.disabled).toBe(false));
    fireEvent.click(practice);
    expect(push).toHaveBeenCalledWith("/forelesninger/l2/quiz");
    const { dialog } = await openQuizDialog("Lag flere");
    expect(within(dialog).getByText("Nye spørsmål legges til de 15 du har fra før.")).toBeTruthy();
  });

  it("FR-29, UX-DR24: dialogen «Lag quiz» med bare tastatur: «Vanlig» og «Middels» valgt, Esc lukker uten jobb og fokus går tilbake", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const { button, dialog } = await openQuizDialog();
    expect(within(dialog).getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("radio", { name: "Middels" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(posts()).toEqual([]);
  });

  it("FR-28, FR-30, UX-DR19: «Lag quiz» sender omfang og vanskelighetsgrad, Flashcards-raden venter, så kommer spørsmålene", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "done", created: 20, error_code: null };
    holdJob = true;
    renderPage();
    const { dialog } = await openQuizDialog();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Vanskelig" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag quiz" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(posts()).toEqual([{ kind: "quiz", params: { requested: 20, difficulty: "hard" } }]);
    expect(await within(quizRow()).findByText("Lager quizspørsmål …", { selector: "p" })).toBeTruthy();
    expect(within(quizRow()).getByRole("status").textContent).toBe("Lager quizspørsmål …");

    // The Flashcards row waits, with the reason tied to its button.
    const flashcards = screen.getByRole("group", { name: "Flashcards" });
    const reason = await within(flashcards).findByText("Venter til quizspørsmålene er ferdige");
    const create = within(flashcards).getByRole("button", { name: "Lag flashcards" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.getAttribute("aria-describedby")).toBe(reason.id);

    holdJob = false;
    expect(await within(quizRow()).findByText("20 spørsmål", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(quizRow()).getByRole("status").textContent).toBe(
      "Quizspørsmålene er ferdige: 20 spørsmål i Uke 38: Prising.",
    );
    await waitFor(() => expect(within(flashcards).queryByText("Venter til quizspørsmålene er ferdige")).toBeNull());
    expect((within(flashcards).getByRole("button", { name: "Lag flashcards" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("UX-DR19: en flashcardsjobb som kjører, gjør «Lag quiz» inaktiv med «Venter til flashcardene er ferdige»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    latestJob = job();
    holdJob = true;
    renderPage();
    const row = await screen.findByRole("group", { name: "Quiz" });
    const reason = await within(row).findByText("Venter til flashcardene er ferdige");
    const create = within(row).getByRole("button", { name: "Lag quiz" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.getAttribute("aria-describedby")).toBe(reason.id);
  });

  it("FR-30: færre enn valgt og ingenting har quiztekstene", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    quizCount = 12;
    otherJobs = [
      job({ kind: "quiz", status: "done", created: 12, discarded: 0, finished_at: "2026-11-21T10:00:03Z" }),
    ];
    renderPage();
    const row = await screen.findByRole("group", { name: "Quiz" });
    expect(
      await within(row).findByText("Det ble laget 12 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere."),
    ).toBeTruthy();
  });

  it("FR-21: en feilet quizjobb gir feilteksten og «Prøv igjen» med samme omfang og vanskelighetsgrad", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    otherJobs = [
      job({
        kind: "quiz",
        params: { requested: 10, difficulty: "easy" },
        requested: 10,
        status: "failed",
        error_code: "GENERATION_TIMEOUT",
        finished_at: "2026-11-21T10:00:03Z",
      }),
    ];
    renderPage();
    const row = await screen.findByRole("group", { name: "Quiz" });
    expect((await within(row).findByRole("alert")).textContent).toBe(
      "Vi klarte ikke å lage quizspørsmålene. Ingenting er lagret. Prøv igjen.",
    );
    fireEvent.click(within(row).getByRole("button", { name: "Prøv igjen" }));
    expect(document.activeElement).toBe(row);
    await waitFor(() => expect(posts()).toEqual([{ kind: "quiz", params: { requested: 10, difficulty: "easy" } }]));
  });
});

describe("Modellkort (story 7.1)", () => {
  function flashcardsRow() {
    return screen.getByRole("group", { name: "Flashcards" });
  }
  function posts() {
    return fetchMock.mock.calls
      .filter(([url, init]) => String(url) === "/api/lectures/l2/jobs" && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
  }
  async function modelButton() {
    const row = await screen.findByRole("group", { name: "Flashcards" });
    const button = (await within(row).findByRole("button", { name: "Lag modellkort" })) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    return button;
  }

  it("FR-42, UX-DR18: «Lag modellkort» er en tekstknapp på Flashcards-raden, både med og uten flashcards", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const button = await modelButton();
    expect(button.dataset.variant).toBe("text");
    expect(within(flashcardsRow()).getByRole("button", { name: "Lag flashcards" })).toBeTruthy();
    cleanup();

    cardCount = 24;
    renderPage();
    const withCards = await modelButton();
    expect(withCards.dataset.variant).toBe("text");
    expect(within(flashcardsRow()).getByRole("button", { name: "Lag flere" })).toBeTruthy();
    // No separate Huskeregler row.
    expect(screen.queryByRole("group", { name: "Huskeregler" })).toBeNull();
  });

  it("FR-42: uten filer er «Lag modellkort» ikke aktiv", async () => {
    renderPage();
    const row = await screen.findByRole("group", { name: "Flashcards" });
    const button = (await within(row).findByRole("button", { name: "Lag modellkort" })) as HTMLButtonElement;
    await within(row).findByText("Last opp notater først.");
    expect(button.disabled).toBe(true);
  });

  it("FR-42, UX-DR19: knappen starter jobben uten dialog, Quiz venter, og etterpå teller raden modellkortene med", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    cardCount = 5;
    holdJob = true;
    jobOutcome = { status: "done", created: 2, error_code: null };
    renderPage();
    await screen.findByText("5 kort");
    fireEvent.click(await modelButton());
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(posts()).toEqual([{ kind: "models", params: { requested: 30 } }]));
    const row = flashcardsRow();
    expect(await within(row).findByText("Lager modellkort …", { selector: "p" })).toBeTruthy();
    await waitFor(() => expect(within(row).getByRole("status").textContent).toBe("Lager modellkort …"));
    expect(document.activeElement).toBe(row);

    const quiz = screen.getByRole("group", { name: "Quiz" });
    const reason = await within(quiz).findByText("Venter til modellkortene er ferdige");
    const create = within(quiz).getByRole("button", { name: "Lag quiz" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.getAttribute("aria-describedby")).toBe(reason.id);

    holdJob = false;
    expect(await within(row).findByText("7 kort", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(row).getByRole("status").textContent).toBe("Modellkortene er ferdige: 2 modellkort i Uke 38: Prising.");
    // No «fewer than chosen» note: she chose no number.
    expect(within(row).queryByText(/av inntil/)).toBeNull();
  });

  it("FR-47: ingen modeller funnet gir teksten i det levende området og ingen «Prøv igjen»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "done", created: 0, error_code: null };
    renderPage();
    fireEvent.click(await modelButton());
    const row = flashcardsRow();
    const text = "Vi fant ingen modeller eller lister i denne forelesningen.";
    await waitFor(() => expect(within(row).getByRole("status").textContent).toBe(text), { timeout: 3000 });
    expect(within(row).getByText(text, { selector: "p" })).toBeTruthy();
    expect(within(row).queryByRole("alert")).toBeNull();
    expect(within(row).queryByRole("button", { name: "Prøv igjen" })).toBeNull();
  });

  it("FR-21: en feilet modellkortjobb gir feilteksten, og «Prøv igjen» starter modellkort på nytt", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    otherJobs = [job({ kind: "flashcards", status: "done", created: 20, started_at: "2026-11-21T09:00:00Z" })];
    latestJob = job({
      id: "jm",
      kind: "models",
      params: { requested: 30 },
      requested: 30,
      status: "failed",
      error_code: "GENERATION_TIMEOUT",
      finished_at: "2026-11-21T10:00:03Z",
    });
    renderPage();
    const row = await screen.findByRole("group", { name: "Flashcards" });
    expect((await within(row).findByRole("alert")).textContent).toBe(
      "Vi klarte ikke å lage modellkortene. Ingenting er lagret. Prøv igjen.",
    );
    fireEvent.click(within(row).getByRole("button", { name: "Prøv igjen" }));
    await waitFor(() => expect(posts()).toEqual([{ kind: "models", params: { requested: 30 } }]));
  });

  it("AR-11: med FEATURE_MNEMONICS av vises ikke knappen", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    mnemonics = false;
    renderPage();
    const row = await screen.findByRole("group", { name: "Flashcards" });
    const create = (await within(row).findByRole("button", { name: "Lag flashcards" })) as HTMLButtonElement;
    await waitFor(() => expect(create.disabled).toBe(false));
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/config")).toBe(true));
    expect(within(row).queryByRole("button", { name: "Lag modellkort" })).toBeNull();
  });

  it("FR-42, FR-56: med bare modellkort teller raden dem, og «Øv nå» er aktiv (story 7.2)", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    modelCount = 2;
    renderPage();
    const row = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(row).findByText("2 kort")).toBeTruthy();
    await waitFor(() =>
      expect((within(row).getByRole("button", { name: "Øv nå" }) as HTMLButtonElement).disabled).toBe(false),
    );
    cleanup();

    cardCount = 3;
    renderPage();
    const withCards = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(withCards).findByText("5 kort")).toBeTruthy();
    await waitFor(() =>
      expect((within(withCards).getByRole("button", { name: "Øv nå" }) as HTMLButtonElement).disabled).toBe(false),
    );
  });

  it("FR-42: med bryteren av følger raden likevel en modellkortjobb som går, og venter ikke på seg selv", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    mnemonics = false;
    holdJob = true;
    latestJob = job({ id: "jm", kind: "models", status: "running", params: { requested: 30 }, requested: 30 });
    renderPage();
    const row = await screen.findByRole("group", { name: "Flashcards" });
    expect(await within(row).findByText("Lager modellkort …", { selector: "p" })).toBeTruthy();
    expect(within(row).queryByText("Venter til modellkortene er ferdige")).toBeNull();
  });
});

describe("Fritekstspørsmål (story 8.1)", () => {
  function freetextRow() {
    return screen.getByRole("group", { name: "Fritekstspørsmål" });
  }
  function posts() {
    return fetchMock.mock.calls
      .filter(([url, init]) => String(url) === "/api/lectures/l2/jobs" && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
  }
  async function openFreetextDialog(name = "Lag fritekstspørsmål") {
    const row = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    const button = await within(row).findByRole("button", { name });
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    button.focus();
    fireEvent.click(button);
    return { button, dialog: await screen.findByRole("dialog", { name: "Lag fritekstspørsmål" }) };
  }

  it("FR-48, UX-DR18: raden står etter Quiz med «Ingen ennå» og omrissknappen «Lag fritekstspørsmål»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const row = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    expect(within(row).getByRole("heading", { level: 3, name: "Fritekstspørsmål" })).toBeTruthy();
    expect(await within(row).findByText("Ingen ennå")).toBeTruthy();
    const create = within(row).getByRole("button", { name: "Lag fritekstspørsmål" }) as HTMLButtonElement;
    await waitFor(() => expect(create.disabled).toBe(false));
    expect(create.dataset.variant).toBe("outline");
    expect(row.previousElementSibling).toBe(screen.getByRole("group", { name: "Quiz" }));
    expect(within(row).queryByRole("button", { name: "Øv nå" })).toBeNull();
  });

  it("FR-48, FR-50: med spørsmål viser raden «12 spørsmål», «Lag flere» og «Øv nå», som åpner fritekst-økten", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    freetextCount = 12;
    renderPage();
    const row = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    expect(await within(row).findByText("12 spørsmål")).toBeTruthy();
    expect(within(row).getByRole("button", { name: "Lag flere" })).toBeTruthy();
    const practice = within(row).getByRole("button", { name: "Øv nå" }) as HTMLButtonElement;
    await waitFor(() => expect(practice.disabled).toBe(false));
    fireEvent.click(practice);
    expect(push).toHaveBeenCalledWith("/forelesninger/l2/fritekst");
    const { dialog } = await openFreetextDialog("Lag flere");
    expect(within(dialog).getByText("Nye spørsmål legges til de 12 du har fra før.")).toBeTruthy();
  });

  it("AR-11: med FEATURE_FREETEXT av vises ikke raden", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    freetextFeature = false;
    renderPage();
    const quiz = await screen.findByRole("group", { name: "Quiz" });
    await within(quiz).findByText("Ingen ennå");
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/config")).toBe(true));
    expect(screen.queryByRole("group", { name: "Fritekstspørsmål" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lag fritekstspørsmål" })).toBeNull();
  });

  it("FR-48, UX-DR24: dialogen med bare tastatur: «Kortsvar» og «Vanlig» valgt, Esc lukker uten jobb og fokus går tilbake", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    renderPage();
    const { button, dialog } = await openFreetextDialog();
    expect(within(dialog).getByRole("radio", { name: "Kortsvar" }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).getByRole("radio", { name: "Vanlig" }).getAttribute("aria-checked")).toBe("true");
    expect(within(dialog).queryByRole("radiogroup", { name: "Vanskelighetsgrad" })).toBeNull();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(button));
    expect(posts()).toEqual([]);
  });

  it("FR-48, UX-DR19: Langsvar og Rask sender question_kind og 5, de andre radene venter, så kommer spørsmålene", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "done", created: 5, error_code: null };
    holdJob = true;
    renderPage();
    const { dialog } = await openFreetextDialog();
    fireEvent.click(within(dialog).getByRole("radio", { name: "Langsvar" }));
    fireEvent.click(within(dialog).getByRole("radio", { name: "Rask" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag fritekstspørsmål" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(posts()).toEqual([{ kind: "freetext", params: { requested: 5, question_kind: "long" } }]);
    expect(await within(freetextRow()).findByText("Lager fritekstspørsmål …", { selector: "p" })).toBeTruthy();
    expect(within(freetextRow()).getByRole("status").textContent).toBe("Lager fritekstspørsmål …");

    for (const [name, label] of [
      ["Flashcards", "Lag flashcards"],
      ["Quiz", "Lag quiz"],
    ]) {
      const other = screen.getByRole("group", { name });
      const reason = await within(other).findByText("Venter til fritekstspørsmålene er ferdige");
      const create = within(other).getByRole("button", { name: label }) as HTMLButtonElement;
      expect(create.disabled).toBe(true);
      expect(create.getAttribute("aria-describedby")).toBe(reason.id);
    }

    holdJob = false;
    expect(await within(freetextRow()).findByText("5 spørsmål", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(freetextRow()).getByRole("status").textContent).toBe(
      "Fritekstspørsmålene er ferdige: 5 spørsmål i Uke 38: Prising.",
    );
    expect(within(freetextRow()).getByRole("button", { name: "Lag flere" })).toBeTruthy();
    expect(within(freetextRow()).getByRole("button", { name: "Øv nå" })).toBeTruthy();
  });

  it("FR-48: «Lag flere» uten nye spørsmål gir «ingenting»-teksten", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    freetextCount = 7;
    jobOutcome = { status: "done", created: 0, error_code: null };
    renderPage();
    const { dialog } = await openFreetextDialog("Lag flere");
    fireEvent.click(within(dialog).getByRole("button", { name: "Lag fritekstspørsmål" }));
    const text = "Notatene ga ikke grunnlag for fritekstspørsmål. Ingenting er lagret.";
    await waitFor(() => expect(within(freetextRow()).getByRole("status").textContent).toBe(text), { timeout: 3000 });
    expect(within(freetextRow()).getByText(text, { selector: "p" })).toBeTruthy();
    expect(within(freetextRow()).getByText("7 spørsmål")).toBeTruthy();
  });

  it("FR-48: færre enn valgt gir den godkjente teksten", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    freetextCount = 7;
    otherJobs = [
      job({
        kind: "freetext",
        params: { requested: 15, question_kind: "short" },
        requested: 15,
        status: "done",
        created: 7,
        discarded: 0,
        finished_at: "2026-11-21T10:00:03Z",
      }),
    ];
    renderPage();
    const row = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    expect(
      await within(row).findByText("Det ble laget 7 av inntil 15 spørsmål. Notatene ga ikke grunnlag for flere."),
    ).toBeTruthy();
  });

  it("FR-21: en feilet jobb gir feilteksten, og «Prøv igjen» sender samme type og omfang", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    otherJobs = [
      job({
        kind: "freetext",
        params: { requested: 15, question_kind: "long" },
        requested: 15,
        status: "failed",
        error_code: "GENERATION_FAILED",
        finished_at: "2026-11-21T10:00:03Z",
      }),
    ];
    renderPage();
    const row = await screen.findByRole("group", { name: "Fritekstspørsmål" });
    expect((await within(row).findByRole("alert")).textContent).toBe(
      "Vi klarte ikke å lage fritekstspørsmålene. Ingenting er lagret. Prøv igjen.",
    );
    fireEvent.click(within(row).getByRole("button", { name: "Prøv igjen" }));
    await waitFor(() =>
      expect(posts()).toEqual([{ kind: "freetext", params: { requested: 15, question_kind: "long" } }]),
    );
  });
});

describe("Sammendrag (story 9.1 og 9.2)", () => {
  function summaryRow() {
    return screen.getByRole("group", { name: "Sammendrag" });
  }
  function posts() {
    return fetchMock.mock.calls
      .filter(([url, init]) => String(url) === "/api/lectures/l2/jobs" && init?.method === "POST")
      .map(([, init]) => JSON.parse(String(init!.body)));
  }
  async function createButton() {
    const row = await screen.findByRole("group", { name: "Sammendrag" });
    const button = (await within(row).findByRole("button", { name: "Lag sammendrag" })) as HTMLButtonElement;
    await waitFor(() => expect(button.disabled).toBe(false));
    return button;
  }

  it("FR-53, UX-DR18: raden står etter Fritekstspørsmål med «Ikke laget» og omrissknappen «Lag sammendrag»", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    renderPage();
    const row = await screen.findByRole("group", { name: "Sammendrag" });
    expect(within(row).getByRole("heading", { level: 3, name: "Sammendrag" })).toBeTruthy();
    expect(await within(row).findByText("Ikke laget")).toBeTruthy();
    const create = await createButton();
    expect(create.dataset.variant).toBe("outline");
    expect(row.previousElementSibling).toBe(screen.getByRole("group", { name: "Fritekstspørsmål" }));
    expect(within(row).queryByRole("button", { name: "Øv nå" })).toBeNull();
  });

  it("FR-53, FR-54: med sammendrag viser raden antallet punkter og omrissknappen «Les sammendrag», som åpner siden", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    summaryCount = 7;
    renderPage();
    const row = await screen.findByRole("group", { name: "Sammendrag" });
    expect(await within(row).findByText("7 punkter")).toBeTruthy();
    const read = within(row).getByRole("button", { name: "Les sammendrag" }) as HTMLButtonElement;
    expect(read.dataset.variant).toBe("outline");
    expect(read.className).toContain("min-w-[184px]");
    expect(within(row).getAllByRole("button")).toEqual([read]);
    fireEvent.click(read);
    expect(push).toHaveBeenCalledWith("/forelesninger/l2/sammendrag");
  });

  it("FR-53: ett punkt står i entall", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    summaryCount = 1;
    renderPage();
    expect(await within(await screen.findByRole("group", { name: "Sammendrag" })).findByText("1 punkt")).toBeTruthy();
  });

  it("AR-11: med FEATURE_SUMMARY av vises ikke raden", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    summaryFeature = false;
    renderPage();
    await screen.findByRole("group", { name: "Fritekstspørsmål" });
    expect(screen.queryByRole("group", { name: "Sammendrag" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Lag sammendrag" })).toBeNull();
  });

  it("FR-53: uten filer er «Lag sammendrag» ikke aktiv", async () => {
    renderPage();
    const row = await screen.findByRole("group", { name: "Sammendrag" });
    const create = (await within(row).findByRole("button", { name: "Lag sammendrag" })) as HTMLButtonElement;
    await within(row).findByText("Last opp notater først.");
    expect(create.disabled).toBe(true);
  });

  it("FR-53, UX-DR19: knappen starter jobben direkte uten dialog, de andre radene venter, så kommer punktene", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    jobOutcome = { status: "done", created: 6, error_code: null };
    holdJob = true;
    renderPage();
    const create = await createButton();
    create.focus();
    fireEvent.click(create);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(posts()).toEqual([{ kind: "summary", params: { requested: 15 } }]));
    expect(await within(summaryRow()).findByText("Lager sammendrag …", { selector: "p" })).toBeTruthy();
    expect(within(summaryRow()).getByRole("status").textContent).toBe("Lager sammendrag …");
    // The button went away, so the row keeps the focus.
    expect(document.activeElement).toBe(summaryRow());

    for (const [name, label] of [
      ["Flashcards", "Lag flashcards"],
      ["Quiz", "Lag quiz"],
      ["Fritekstspørsmål", "Lag fritekstspørsmål"],
    ]) {
      const other = screen.getByRole("group", { name });
      const reason = await within(other).findByText("Venter til sammendraget er ferdig");
      const button = within(other).getByRole("button", { name: label }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-describedby")).toBe(reason.id);
    }

    holdJob = false;
    expect(await within(summaryRow()).findByText("6 punkter", {}, { timeout: 3000 })).toBeTruthy();
    expect(within(summaryRow()).getByRole("status").textContent).toBe(
      "Sammendraget er ferdig: 6 punkter i Uke 38: Prising.",
    );
    expect(within(summaryRow()).getByRole("button", { name: "Les sammendrag" })).toBeTruthy();
  });

  it("FR-53: for få punkter gir meldingen for TOO_FEW_SUMMARY_POINTS og «Prøv igjen»", async () => {
    files = [uploadedFile("merkevare.pdf", 3)];
    jobOutcome = { status: "failed", created: null, error_code: "TOO_FEW_SUMMARY_POINTS" };
    renderPage();
    fireEvent.click(await createButton());
    const alert = await within(summaryRow()).findByRole("alert", {}, { timeout: 3000 });
    expect(alert.textContent).toBe(
      "Notatene ga ikke grunnlag for et sammendrag med minst 5 punkter. Det gamle sammendraget er beholdt.",
    );
    expect(alert.textContent).not.toContain("færre enn");
    fireEvent.click(within(summaryRow()).getByRole("button", { name: "Prøv igjen" }));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(posts()[1]).toEqual({ kind: "summary", params: { requested: 15 } });
  });

  it("FR-21: en feilet jobb gir feilteksten for sammendraget og «Prøv igjen»", async () => {
    files = [uploadedFile("merkevare.pdf", 6)];
    otherJobs = [
      job({
        kind: "summary",
        params: { requested: 15 },
        requested: 15,
        status: "failed",
        error_code: "GENERATION_TIMEOUT",
        finished_at: "2026-11-21T10:00:03Z",
      }),
    ];
    renderPage();
    const row = await screen.findByRole("group", { name: "Sammendrag" });
    expect((await within(row).findByRole("alert")).textContent).toBe(
      "Vi klarte ikke å lage sammendraget. Ingenting er lagret. Prøv igjen.",
    );
    fireEvent.click(within(row).getByRole("button", { name: "Prøv igjen" }));
    await waitFor(() => expect(posts()).toEqual([{ kind: "summary", params: { requested: 15 } }]));
  });
});

describe("Semesterlinja på forelesningssiden (story 5.5)", () => {
  beforeEach(() => {
    // Tuesday 10.11.2026 at noon, as in mockup 02.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 10, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function timeline(): HTMLElement {
    return screen.getByRole("region", { name: "Semesterlinje" });
  }

  it("UX-DR11: linja for emnet står mellom knapperaden og «Filer», med «Du er her» ved denne forelesningen", async () => {
    renderPage();
    expect(
      await screen.findByText("Markedsføring: 0 av 2 forelesninger øvd. Eksamen fredag 04.12, om 3 uker."),
    ).toBeTruthy();
    const buttons = screen.getByRole("button", { name: "Slett forelesningen" });
    const files = screen.getByRole("heading", { level: 2, name: "Filer" });
    expect(buttons.compareDocumentPosition(timeline()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(timeline().compareDocumentPosition(files) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const hidden = timeline().querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(within(hidden).getByText("Du er her")).toBeTruthy();
    expect(hidden.querySelector('[data-station="l2"] [data-part="current"]')).toBeTruthy();
    expect(hidden.querySelector('[data-station="l1"] [data-part="current"]')).toBeNull();
    // Only the lecture's subject.
    expect(within(timeline()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(hidden).queryByText("Samfunnsøkonomi")).toBeNull();
  });

  it("SK-22: ny status vises uten omlasting når oversikten ugyldiggjøres", async () => {
    const client = renderPage();
    expect(await screen.findByText(/^Markedsføring: 0 av 2 forelesninger øvd/)).toBeTruthy();
    practisedIds = ["l2"];
    await act(async () => {
      await client.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
    });
    expect(await screen.findByText(/^Markedsføring: 1 av 2 forelesninger øvd/)).toBeTruthy();
    expect(timeline().querySelector('[data-station="l2"]')?.getAttribute("data-practiced")).toBe("true");
  });

  it("FR-57: når oversikten feiler, står reserveteksten i linja", async () => {
    overviewStatus = 500;
    renderPage();
    await screen.findByRole("heading", { level: 1, name: "Uke 38: Prising" });
    expect((await within(timeline()).findByRole("alert")).textContent).toBe(FALLBACK_MESSAGE);
  });
});
