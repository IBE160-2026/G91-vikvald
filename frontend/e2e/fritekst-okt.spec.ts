import { expect, test, type Locator, type Page, type Request } from "@playwright/test";

import {
  createLectureViaApi,
  createSubjectViaApi,
  expectNoAxeViolations,
  pdfFile,
  registerWithTermsViaApi,
  SAVE_PATH,
  uploadViaApi,
} from "./brukerreiser/felles";

// Story 8.2: the free-text session with self-assessment, in the browser
// against the app in demo mode with FEATURE_FREETEXT on (the default). The
// mock model makes one question «Forklar [begrep].» per definition sentence,
// with the whole sentence as the model answer.

const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 768, height: 1024 };
const LECTURE_NAME = "Uke 37: Merkevare";
// Three definitions: three questions.
const THREE = ["Merkevare er et navn. Pris er det kunden betaler.", "Segment er en gruppe kunder."];

function freetextRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Fritekstspørsmål" });
}

function answerField(page: Page): Locator {
  return page.getByRole("textbox", { name: "Ditt svar" });
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// axe in 1280 and 768 px (NFR-13, NFR-14).
async function axeInBothWidths(page: Page) {
  await page.setViewportSize(WIDE);
  await expectNoAxeViolations(page);
  await page.setViewportSize(NARROW);
  await expectNoAxeViolations(page);
  await page.setViewportSize(WIDE);
}

// A new student with one lecture that has three free-text questions.
async function lectureWithFreetext(page: Page): Promise<string> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
  const lectureId = await createLectureViaApi(page, subjectId, LECTURE_NAME, "2026-09-11");
  await uploadViaApi(page, lectureId, pdfFile("fritekst.pdf", THREE));
  const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "freetext", params: { requested: 10, question_kind: "short" } },
  });
  expect(response.status()).toBe(202);
  await expect
    .poll(
      async () =>
        ((await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()) as { freetext_questions: number })
          .freetext_questions,
      { timeout: 15_000 },
    )
    .toBe(3);
  return lectureId;
}

// Every POST /api/practice-sessions the page sends.
function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

// With focus in «Ditt svar»: write, Tab to «Vis modellsvar» and press Enter.
async function writeAndReveal(page: Page, text = "Et kort svar") {
  await expect(answerField(page)).toBeFocused();
  await page.keyboard.type(text);
  // Past «Slett» (story 8.3), which stands to the left of «Vis modellsvar».
  await tabTo(page, page.getByRole("button", { name: "Vis modellsvar" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeFocused();
}

test.describe("Fritekst-økt (story 8.2)", () => {
  test("NFR-8, FR-50, FR-51, FR-56: hele økten med bare tastatur, ◐ med 2, resultatet, lagret én gang og «øvd», axe i 1280 og 768 px", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    const lectureId = await lectureWithFreetext(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}`);
    const practice = freetextRow(page).getByRole("button", { name: "Øv nå" });
    await expect(practice).toBeEnabled();
    await tabTo(page, practice);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}/fritekst$`));

    const panel = page.getByRole("region", { name: "Fritekst" });
    await expect(panel.getByRole("heading", { level: 1, name: "Fritekst" })).toBeVisible();
    await expect(panel.getByText(LECTURE_NAME)).toBeVisible();
    await expect(panel.getByText("/ 3")).toBeVisible();
    await expect(panel.getByText("Ingen vurdert ennå")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 3")).toBeVisible();
    await expect(answerField(page)).toBeFocused();
    await expect(page.getByRole("button", { name: "Vis modellsvar" })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Modellsvar" })).toHaveCount(0);
    await axeInBothWidths(page);

    // 1/2/3 in the field are just text (E27).
    await answerField(page).focus();
    await page.keyboard.type("  To  ord\nher 2 ");
    await expect(answerField(page)).toHaveValue("  To  ord\nher 2 ");
    await expect(panel.getByText("Ingen vurdert ennå")).toBeVisible();
    await tabTo(page, page.getByRole("button", { name: "Vis modellsvar" }));
    await page.keyboard.press("Enter");
    const modelTitle = page.getByRole("heading", { level: 3, name: "Modellsvar" });
    await expect(modelTitle).toBeFocused();
    await expect(page.getByText("Levert · 4 ord")).toBeVisible();
    await expect(answerField(page)).toHaveAttribute("readonly", "");
    const card = page.locator('[data-slot="model-answer"]');
    await expect(card.getByText(/fritekst\.pdf, side \d/)).toBeVisible();
    await expect(card.getByText(LECTURE_NAME)).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Hvordan gikk det?" })).toBeVisible();
    for (const name of ["Feil", "Delvis riktig", "Riktig"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    }
    await axeInBothWidths(page);

    // 2 = «Delvis riktig»: ◐ in the grid and on to the next question.
    await modelTitle.focus();
    await page.keyboard.press("2");
    await expect(page.getByText("SPØRSMÅL 2 AV 3")).toBeVisible();
    await expect(panel.getByText("1 delvis riktig")).toBeVisible();
    await expect(panel.locator('[data-mark="partial"]')).toHaveCount(1);
    await expect(panel.getByText("Spørsmål 1: delvis riktig")).toBeAttached();
    await expect(answerField(page)).toBeFocused();
    await expect(answerField(page)).toHaveValue("");

    await writeAndReveal(page);
    await page.keyboard.press("3");
    await expect(page.getByText("SPØRSMÅL 3 AV 3")).toBeVisible();
    await writeAndReveal(page);
    await page.keyboard.press("1");

    const title = page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 spørsmålene" });
    await expect(title).toBeFocused();
    await expect(page.getByText("ØKT FERDIG")).toBeVisible();
    const fields = page.locator('[data-slot="result-field"]');
    await expect(fields).toHaveText(["Riktig1", "Delvis riktig1", "Feil1"]);
    const missed = page.getByRole("region", { name: "Feil og delvis riktig" });
    await expect(missed.getByText("2 spørsmål")).toBeVisible();
    await expect(missed.getByRole("listitem")).toHaveCount(2);
    await expect(missed).not.toContainText("Et kort svar");
    await expect(panel.getByText("Økten er ferdig og lagret")).toBeVisible();
    await axeInBothWidths(page);

    expect(saves).toHaveLength(1);
    const body = saves[0].postDataJSON();
    expect(body).toMatchObject({
      kind: "freetext",
      lecture_id: lectureId,
      aborted: false,
      shown: 3,
      answered: 3,
      correct: 1,
      partial: 1,
      wrong: 1,
    });
    expect(JSON.stringify(body)).not.toContain("Et kort svar");

    // The lecture is «øvd» in the overview.
    const overview = (await (await page.request.get("/api/overview")).json()) as {
      subjects: { lectures: { id: string; practiced: boolean }[] }[];
    };
    const lecture = overview.subjects.flatMap((subject) => subject.lectures).find((item) => item.id === lectureId);
    expect(lecture?.practiced).toBe(true);

    // Enter starts the same questions again in a new session.
    await title.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("SPØRSMÅL 1 AV 3")).toBeVisible();
    await expect(answerField(page)).toBeFocused();
    await expect(answerField(page)).toHaveValue("");
    await expect(panel.getByText("Ingen vurdert ennå")).toBeVisible();
  });

  test("FR-56, UX-DR33: Esc etter én vurdering avbryter og lagrer som avbrutt, og Esc på resultatet går til forelesningen", async ({
    page,
  }) => {
    const lectureId = await lectureWithFreetext(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/fritekst`);
    await expect(answerField(page)).toBeFocused();
    await writeAndReveal(page);
    await page.keyboard.press("3");
    await expect(page.getByText("SPØRSMÅL 2 AV 3")).toBeVisible();

    // Esc in the field does nothing (she may be writing).
    await expect(answerField(page)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByText("SPØRSMÅL 2 AV 3")).toBeVisible();
    // Out of the field, Esc ends the session.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Escape");

    const title = page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 3" });
    await expect(title).toBeFocused();
    await expect.poll(() => saves.length).toBe(1);
    expect(saves[0].postDataJSON()).toMatchObject({ kind: "freetext", aborted: true, answered: 1, correct: 1 });
    await expectNoAxeViolations(page);

    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
    expect(saves).toHaveLength(1);
  });

  test("FR-56: «Avslutt økt» før første vurdering går rett tilbake uten lagring", async ({ page }) => {
    const lectureId = await lectureWithFreetext(page);
    const saves = captureSaves(page);
    await page.goto(`/forelesninger/${lectureId}/fritekst`);
    await expect(answerField(page)).toBeFocused();
    await writeAndReveal(page);
    const end = page.getByRole("region", { name: "Fritekst" }).getByRole("button", { name: "Avslutt økt" });
    await tabTo(page, end);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}$`));
    await expect(freetextRow(page).getByText("3 spørsmål", { exact: true })).toBeVisible();
    expect(saves).toHaveLength(0);
  });
});
