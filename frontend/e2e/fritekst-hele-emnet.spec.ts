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

// Story 8.3: free-text for the whole subject and deleting a bad question
// (FR-50, FR-52, FR-56), in the browser against the app in demo mode with
// FEATURE_FREETEXT on (the default). The mock model makes one question
// «Forklar [begrep].» per definition sentence.

const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 768, height: 1024 };
const SUBJECT_NAME = "Markedsføring";
// Three definitions: three questions.
const THREE = ["Merkevare er et navn. Pris er det kunden betaler.", "Segment er en gruppe kunder."];

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

// A new student with a subject whose one lecture has three free-text questions.
async function subjectWithFreetext(page: Page): Promise<{ subjectId: string; lectureId: string }> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, SUBJECT_NAME, "2026-12-04");
  const lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
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
  return { subjectId, lectureId };
}

// Every POST /api/practice-sessions the page sends.
function captureSaves(page: Page): Request[] {
  const saves: Request[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
  });
  return saves;
}

// Every DELETE /api/freetext-questions/{id} and its status.
function captureDeletes(page: Page): number[] {
  const statuses: number[] = [];
  page.on("response", (response) => {
    const request = response.request();
    if (request.method() === "DELETE" && new URL(response.url()).pathname.startsWith("/api/freetext-questions/")) {
      statuses.push(response.status());
    }
  });
  return statuses;
}

// With focus in «Ditt svar»: write, Tab past «Slett» to «Vis modellsvar» and press Enter.
async function writeAndReveal(page: Page, text = "Et kort svar") {
  await expect(answerField(page)).toBeFocused();
  await page.keyboard.type(text);
  await tabTo(page, page.getByRole("button", { name: "Vis modellsvar" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 3, name: "Modellsvar" })).toBeFocused();
}

test.describe("Fritekst for hele emnet og slett dårlige spørsmål (story 8.3)", () => {
  test("FR-50, FR-52, FR-56, NFR-8: raden på emnesiden, emneøkten, slett med Esc og med bekreftelse, lagret med lecture_id null, tilbake til emnet, axe i 1280 og 768 px", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    const { subjectId } = await subjectWithFreetext(page);
    const saves = captureSaves(page);
    const deletes = captureDeletes(page);

    // The subject page: the row Fritekstspørsmål with the count and «Start ›».
    await page.goto(`/emner/${subjectId}`);
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByRole("heading", { level: 3, name: "Fritekstspørsmål" })).toBeVisible();
    await expect(practiceAll.getByText("3 spørsmål fra 1 forelesning")).toBeVisible();
    const start = practiceAll.getByRole("link", { name: "Start fritekst på hele emnet" });
    await axeInBothWidths(page);
    await tabTo(page, start);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/emner/${subjectId}/fritekst$`));

    // The session over the whole subject.
    const panel = page.getByRole("region", { name: "Fritekst" });
    await expect(panel.getByText(`${SUBJECT_NAME}, hele emnet`)).toBeVisible();
    await expect(panel.getByText("/ 3")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 3")).toBeVisible();
    await expect(answerField(page)).toBeFocused();
    await expect(page).toHaveTitle(`Fritekst – ${SUBJECT_NAME} – Studiekamerat`);
    await axeInBothWidths(page);

    // Assess the first question as «Riktig» with 3.
    await writeAndReveal(page);
    await expect(page.locator('[data-slot="model-answer"]').getByText("Uke 37: Merkevare")).toBeVisible();
    await page.keyboard.press("3");
    await expect(page.getByText("SPØRSMÅL 2 AV 3")).toBeVisible();
    await expect(answerField(page)).toBeFocused();

    // «Slett» then Esc: nothing is deleted, focus goes back to «Slett».
    const remove = page.getByRole("button", { name: "Slett", exact: true });
    await tabTo(page, remove);
    await page.keyboard.press("Enter");
    let dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog).not.toContainText("Dette sletter også");
    await axeInBothWidths(page);
    // The session's keys are off while the dialog is open.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await expect(page.getByText("SPØRSMÅL 2 AV 3")).toBeVisible();
    expect(deletes).toEqual([]);

    // «Slett» and «Slett spørsmålet»: 204, the total goes down and nothing is assessed.
    await page.keyboard.press("Enter");
    dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    const confirm = dialog.getByRole("button", { name: "Slett spørsmålet" });
    await expect(confirm).toBeEnabled();
    await tabTo(page, confirm, 5);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect.poll(() => deletes).toEqual([204]);
    await expect(panel.getByText("/ 2")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 2 AV 2")).toBeVisible();
    await expect(panel.getByText("1 riktig")).toBeVisible();
    await expect(answerField(page)).toBeFocused();
    await expect(answerField(page)).toHaveValue("");

    // The last question: «Delvis riktig» with 2 finishes the session.
    await writeAndReveal(page);
    await page.keyboard.press("2");
    const title = page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 2 spørsmålene" });
    await expect(title).toBeFocused();
    await expect(page.locator('[data-slot="missed-lecture"]')).toHaveText(["Forelesning: Uke 37: Merkevare"]);
    await expect(panel.getByText("Økten er ferdig og lagret")).toBeVisible();
    await axeInBothWidths(page);

    expect(saves).toHaveLength(1);
    expect(saves[0].postDataJSON()).toMatchObject({
      kind: "freetext",
      subject_id: subjectId,
      lecture_id: null,
      aborted: false,
      shown: 2,
      answered: 2,
      correct: 1,
      partial: 1,
      wrong: 0,
    });

    // «Tilbake til emnet»: the subject page, where the row has one question less.
    await tabTo(page, page.getByRole("link", { name: "Tilbake til emnet" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/emner/${subjectId}$`));
    await expect(
      page.getByRole("region", { name: "Øv på hele emnet" }).getByText("2 spørsmål fra 1 forelesning"),
    ).toBeVisible();
  });

  test("FR-52: «Slett» etter modellsvaret står i modellsvarets bunnfelt og sletter med bare tastatur", async ({ page }) => {
    const { lectureId } = await subjectWithFreetext(page);
    const deletes = captureDeletes(page);
    await page.goto(`/forelesninger/${lectureId}/fritekst`);
    await expect(answerField(page)).toBeFocused();
    await writeAndReveal(page);
    const remove = page.locator('[data-slot="model-answer"]').getByRole("button", { name: "Slett", exact: true });
    await tabTo(page, remove);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Slette spørsmålet?" });
    await tabTo(page, dialog.getByRole("button", { name: "Slett spørsmålet" }), 5);
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect.poll(() => deletes).toEqual([204]);
    await expect(page.getByText("SPØRSMÅL 1 AV 2")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Hvordan gikk det?" })).toHaveCount(0);
    await expect(answerField(page)).toBeFocused();
  });
});
