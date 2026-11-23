import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";

import { makePdf } from "../pdf";

// Shared helpers for the user-journey tests (EXPERIENCE.md, «Brukerreiser»).

export const PASSWORD = "hemmelig1";

// A new address per run, so the journeys can run again against the same database.
export function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

// Every page a journey visits is checked with axe (NFR-13, AR-17).
export async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The login page (01). Its status area is empty unless the login ran out in this tab.
export async function expectOnLoginPage(page: Page, message = "") {
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page).toHaveTitle("Logg inn – Studiekamerat");
  await expect(page.locator("main h1")).toHaveText("Logg inn");
  await expect(page.locator("main").getByRole("status")).toHaveText(message);
}

// The front page «Dine emner» (02) with the full top bar.
export async function expectOnHomePage(page: Page) {
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle("Dine emner – Studiekamerat");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("main h1")).toHaveText("Dine emner");
}

// A PDF made by the test itself (e2e/pdf.ts), so no real notes are used.
export type TestFile = { name: string; mimeType: string; buffer: Buffer };

// Pages in formulaPages (from 1) also get a formula drawn as vector curves,
// which the backend marks needs_image at upload (story 6.3, FR-40).
export function pdfFile(name: string, pages: string[], formulaPages: number[] = []): TestFile {
  return { name, mimeType: "application/pdf", buffer: makePdf({ pages, formulaPages }) };
}

// The start of a .docx file (a zip archive): not a PDF.
export const WORD_FILE: TestFile = {
  name: "merkevare-notater.docx",
  mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  buffer: Buffer.concat([Buffer.from("PK\u0003\u0004"), Buffer.alloc(200)]),
};

// A new student, logged in through the API in the page's browser context, who
// has accepted the terms. For flows that start after the account exists.
export async function registerWithTermsViaApi(page: Page): Promise<string> {
  const email = uniqueEmail();
  const response = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  return email;
}

export async function createSubjectViaApi(page: Page, name: string, examDate: string): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: examDate } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

export async function createLectureViaApi(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const response = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

export async function uploadViaApi(page: Page, lectureId: string, file: TestFile) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, { multipart: { file } });
  expect(response.status()).toBe(201);
}

export async function fileNamesViaApi(page: Page, lectureId: string): Promise<string[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/files`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as { original_name: string }[]).map((file) => file.original_name);
}

// Drags files from the desktop and drops them on the upload box (04), the way
// Klara does it in flow 1: dragenter, dragover and drop with the files.
export async function dropFiles(page: Page, files: TestFile[]) {
  const dataTransfer = await page.evaluateHandle(
    (items) => {
      const transfer = new DataTransfer();
      for (const item of items) {
        transfer.items.add(new File([new Uint8Array(item.bytes)], item.name, { type: item.mimeType }));
      }
      return transfer;
    },
    files.map((file) => ({ name: file.name, mimeType: file.mimeType, bytes: Array.from(file.buffer) })),
  );
  const zone = page.locator('[data-slot="upload-zone"]');
  await zone.dispatchEvent("dragenter", { dataTransfer });
  await zone.dispatchEvent("dragover", { dataTransfer });
  await zone.dispatchEvent("drop", { dataTransfer });
}

// The file rows on the lecture page (04).
export function fileRows(page: Page): Locator {
  return page.getByRole("list", { name: "Filer" }).getByRole("listitem");
}

// The lecture links in the sidebar.
export function sidebarLectures(page: Page): Locator {
  return page.getByRole("navigation", { name: "Emner" }).locator('a[href^="/forelesninger/"]');
}

// Today's date as dd.mm and dd.mm.åååå, in the browser's local time.
export async function today(page: Page): Promise<{ dayMonth: string; full: string }> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    const dayMonth = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}`;
    return { dayMonth, full: `${dayMonth}.${now.getFullYear()}` };
  });
}

// Makes flashcards from the lecture's files through the API (the mock model
// makes one card per definition sentence, «X er …») and waits until there are
// `expected` cards. For flows that start after the cards exist.
export async function makeFlashcardsViaApi(page: Page, lectureId: string, requested: 10 | 20 | 30, expected: number) {
  const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "flashcards", params: { requested } },
  });
  expect(response.status()).toBe(202);
  await expect
    .poll(async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).flashcards, {
      timeout: 15_000,
    })
    .toBe(expected);
}

export async function flashcardCountViaApi(page: Page, lectureId: string): Promise<number> {
  const response = await page.request.get(`/api/lectures/${lectureId}/flashcards`);
  expect(response.status()).toBe(200);
  return ((await response.json()) as unknown[]).length;
}

// The Flashcards row in «Lag og øv» on the lecture page (04). Since story 4.1
// the Quiz row stands under it with its own «Ingen ennå», status and buttons.
export function createSection(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Flashcards" });
}

// The Quiz row in «Lag og øv» on the lecture page (04).
export function quizRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Quiz" });
}

// Makes quiz questions from the lecture's files through the API, «Middels»,
// and waits until there are `expected`. The mock model makes one question per
// definition sentence, and nothing from fewer than four.
export async function makeQuizViaApi(page: Page, lectureId: string, requested: 10 | 20 | 30, expected: number) {
  const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "quiz", params: { requested, difficulty: "medium" } },
  });
  expect(response.status()).toBe(202);
  await expect
    .poll(
      async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).quiz_questions,
      { timeout: 15_000 },
    )
    .toBe(expected);
}

// A quiz question as the API gives it, with the answer key (AR-15).
export type ApiQuestion = {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source: { file_name: string; page_no: number };
  lecture: { name: string };
};

// The quiz questions of a lecture (`lectures`) or a subject (`subjects`).
export async function quizQuestionsViaApi(
  page: Page,
  owner: "lectures" | "subjects",
  id: string,
): Promise<ApiQuestion[]> {
  const response = await page.request.get(`/api/${owner}/${id}/quiz-questions`);
  expect(response.status()).toBe(200);
  return (await response.json()) as ApiQuestion[];
}

// The question in the quiz session (09).
export function quizQuestion(page: Page): Locator {
  return page.locator('[data-slot="quiz-question"]');
}

// Answers the question on screen with A–D and Enter, right or wrong (the
// option after the correct one), and checks that the answer is shown only now,
// with the explanation and its source. Returns the question.
export async function answerQuizQuestion(page: Page, questions: ApiQuestion[], right: boolean): Promise<ApiQuestion> {
  const text = await quizQuestion(page).getByRole("heading", { level: 2 }).textContent();
  const question = questions.find((item) => item.question === text);
  expect(question).toBeDefined();
  const card = page.locator('[data-slot="explanation-card"]');
  await expect(card).toHaveCount(0);
  const chosen = right ? question!.correct_index : (question!.correct_index + 1) % 4;
  await page.keyboard.press("abcd"[chosen]);
  await expect(quizQuestion(page).getByRole("radio").nth(chosen)).toBeChecked();
  await page.keyboard.press("Enter");
  const correctLetter = "ABCD"[question!.correct_index];
  await expect(quizQuestion(page).getByRole("status")).toContainText(
    right ? "Riktig." : `Feil. Riktig svar er ${correctLetter}.`,
  );
  await expect(card).toContainText("Forklaring");
  await expect(card).toContainText(question!.explanation);
  await expect(card.locator('[data-slot="source-link"]')).toHaveText(
    `${question!.source.file_name}, side ${question!.source.page_no}`,
  );
  return question!;
}

// The session panel (07, 08), where the sidebar is during a session.
export function sessionPanel(page: Page): Locator {
  return page.getByRole("region", { name: "Flashcards" });
}

// The question on the card in the session (07).
export function cardFront(page: Page): Locator {
  return page.locator('[data-slot="flashcard"]').locator("p").nth(1);
}

// The path the session is saved to (FR-56).
export const SAVE_PATH = "/api/practice-sessions";

// A date `days` days from today (local date, as the app shows it): ISO for the
// API, dd.mm.åååå for the date fields, dd.mm and the weekday for the semester
// line (story 5.5). Relative to today, so the journeys keep working as time goes.
export type DayInfo = { iso: string; full: string; dayMonth: string; weekday: string };

const WEEKDAYS = ["søndag", "mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag"];

export function dayFromToday(days: number): DayInfo {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (value: number) => String(value).padStart(2, "0");
  const [y, m, d] = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())];
  return { iso: `${y}-${m}-${d}`, full: `${d}.${m}.${y}`, dayMonth: `${d}.${m}`, weekday: WEEKDAYS[date.getDay()] };
}

// The card «Semesterlinje» (02, 03, 04, story 5.5). The line itself is
// aria-hidden; screen readers get one list item per subject (sr-only).
export function semesterLine(page: Page): Locator {
  return page.getByRole("region", { name: "Semesterlinje" });
}

// The screen-reader text of the line, one item per subject.
export function semesterLineItems(page: Page): Locator {
  return semesterLine(page).getByRole("listitem");
}

// The visible, aria-hidden graphic of the line.
export function semesterLineGraphic(page: Page): Locator {
  return semesterLine(page).locator('[aria-hidden="true"]');
}

// The subject card on the front page (02, story 5.4).
export function subjectCard(page: Page, name: string): Locator {
  return page.locator('[data-slot="subject-card"]').filter({ has: page.getByRole("heading", { level: 2, name }) });
}

// The lecture link in the sidebar, whose name ends with its status dot (story 5.1).
export function sidebarLecture(page: Page, name: string): Locator {
  return page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: new RegExp(`^${name} (Øvd|Ikke øvd ennå)$`) });
}

// The formula flag (story 6.3, FR-41, UX-DR37), word for word.
export const FORMULA_FLAG_TEXT = "Inneholder formel – sjekk mot kilden";

// The formula flag inside `scope` (a card, an explanation or a missed-list row).
export function formulaFlag(scope: Locator): Locator {
  return scope.locator('[data-slot="formula-flag"]');
}

// The flag stands directly above the source, which names the file and page
// Klara looks up in her PDF.
export async function expectFormulaFlagAboveSource(scope: Locator, source: string) {
  const flag = formulaFlag(scope);
  await expect(flag).toHaveText(FORMULA_FLAG_TEXT);
  const next = flag.locator('xpath=following-sibling::*[1][@data-slot="source-link"]');
  await expect(next).toHaveText(source);
}
