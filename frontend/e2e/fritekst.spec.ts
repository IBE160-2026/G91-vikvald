import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  expectNoAxeViolations,
  pdfFile,
  quizRow,
  registerWithTermsViaApi,
  uploadViaApi,
} from "./brukerreiser/felles";

// Story 8.1: the row «Fritekstspørsmål» and the dialog «Lag fritekstspørsmål»,
// in the browser against the app in demo mode with FEATURE_FREETEXT on (the
// default). The mock model makes one question «Forklar [begrep].» per
// definition sentence, the same for short and long questions.

const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 768, height: 1024 };
const LECTURE_NAME = "Uke 37: Merkevare";
const NOTHING = "Notatene ga ikke grunnlag for fritekstspørsmål. Ingenting er lagret.";

// Seven definitions over two pages: seven questions at most. One sentence per
// line, so no line runs past the edge of the test PDF's page and gets cut.
const SEVEN = [
  "Merkevare er et navn. Pris er det kunden betaler.",
  "Segment er en gruppe kunder.\nMålgruppe er de bedriften vil nå.\nPosisjon er plassen hos kunden.\nKanal er veien til kunden.\nBudskap er det som blir sagt.",
];
// Two definitions: two questions at most.
const TWO = ["Merkevare er et navn. Pris er det kunden betaler."];

type Counts = { flashcards: number; quiz_questions: number; model_cards: number; freetext_questions: number };

function freetextRow(page: Page): Locator {
  return page.getByRole("region", { name: "Lag og øv" }).getByRole("group", { name: "Fritekstspørsmål" });
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

async function lectureWith(page: Page, pages: string[]): Promise<string> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
  const lectureId = await createLectureViaApi(page, subjectId, LECTURE_NAME, "2026-09-11");
  await uploadViaApi(page, lectureId, pdfFile("fritekst.pdf", pages));
  return lectureId;
}

async function contentCounts(page: Page, lectureId: string): Promise<Counts> {
  return (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()) as Counts;
}

async function makeFreetextViaApi(page: Page, lectureId: string, expected: number) {
  const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "freetext", params: { requested: 10, question_kind: "short" } },
  });
  expect(response.status()).toBe(202);
  await expect
    .poll(async () => (await contentCounts(page, lectureId)).freetext_questions, { timeout: 15_000 })
    .toBe(expected);
}

test.describe("Fritekstspørsmål (story 8.1)", () => {
  test("FR-48, UX-DR18, UX-DR19, UX-DR24, NFR-8: med bare tastaturet lager hun langsvar med «Rask», de andre radene venter, og raden viser antallet med «Øv nå» (FR-50)", async ({
    page,
  }) => {
    await page.setViewportSize(WIDE);
    const lectureId = await lectureWith(page, SEVEN);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = freetextRow(page);
    await expect(row.getByRole("heading", { level: 3, name: "Fritekstspørsmål" })).toBeVisible();
    await expect(row.getByText("Ingen ennå")).toBeVisible();
    const create = row.getByRole("button", { name: "Lag fritekstspørsmål" });
    await expect(create).toBeEnabled();
    await expect(row.getByRole("button", { name: "Øv nå" })).toHaveCount(0);
    await axeInBothWidths(page);

    // The dialog: «Kortsvar» and «Vanlig» chosen, no difficulty.
    await tabTo(page, create);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Lag fritekstspørsmål" });
    await expect(dialog).toBeVisible();
    const short = dialog.getByRole("radio", { name: "Kortsvar" });
    const long = dialog.getByRole("radio", { name: "Langsvar" });
    await expect(short).toBeFocused();
    await expect(short).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();
    await expect(dialog.getByText("Svar med noen få setninger")).toBeVisible();
    await expect(dialog.getByText("Forklar sammenhenger eller gi et eksempel")).toBeVisible();
    for (const value of [5, 10, 15]) await expect(dialog.getByText(`Inntil ${value} spørsmål`)).toBeVisible();
    await expect(dialog.getByRole("radiogroup", { name: "Vanskelighetsgrad" })).toHaveCount(0);
    await axeInBothWidths(page);

    // The arrow keys move the choice; Esc closes without a job and focus goes back.
    await page.keyboard.press("ArrowRight");
    await expect(long).toBeChecked();
    await expect(long).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(create).toBeFocused();
    expect(await (await page.request.get(`/api/lectures/${lectureId}/jobs/latest`)).json()).toEqual([]);

    // Open again: «Kortsvar» is chosen again. Choose «Langsvar» and «Rask».
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await expect(short).toBeChecked();
    await page.keyboard.press("ArrowRight");
    await expect(long).toBeChecked();
    await page.keyboard.press("Tab");
    const usual = dialog.getByRole("radio", { name: "Vanlig" });
    await expect(usual).toBeFocused();
    // Radix checks a radio when it gets focus while an arrow key is down, and
    // it moves focus a moment after keydown. A press as fast as Playwright's
    // could let the key up first, so the key is held until focus has moved,
    // as a real key press is.
    const quick = dialog.getByRole("radio", { name: "Rask" });
    await page.keyboard.down("ArrowLeft");
    await expect(quick).toBeFocused();
    await page.keyboard.up("ArrowLeft");
    await expect(quick).toBeChecked();

    // Hold the job until the running state has been checked.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/jobs/active", async (route) => {
      await held;
      await route.fallback();
    });

    const started = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `/api/lectures/${lectureId}/jobs` && response.request().method() === "POST",
    );
    await tabTo(page, dialog.getByRole("button", { name: "Lag fritekstspørsmål" }));
    await page.keyboard.press("Enter");
    const response = await started;
    expect(response.status()).toBe(202);
    expect(response.request().postDataJSON()).toEqual({ kind: "freetext", params: { requested: 5, question_kind: "long" } });
    expect(((await response.json()) as { requested: number }).requested).toBe(5);

    await expect(dialog).toHaveCount(0);
    await expect(row.getByText("Lager fritekstspørsmål …", { exact: true }).first()).toBeVisible();
    await expect(row.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    for (const [other, label] of [
      [createSection(page), "Lag flashcards"],
      [quizRow(page), "Lag quiz"],
    ] as const) {
      await expect(other.getByText("Venter til fritekstspørsmålene er ferdige")).toBeVisible();
      await expect(other.getByRole("button", { name: label })).toBeDisabled();
    }
    await expectNoAxeViolations(page);

    release();
    await expect.poll(async () => (await contentCounts(page, lectureId)).freetext_questions, { timeout: 15_000 }).toBe(5);
    await page.unroute("**/api/jobs/active");
    await expect(row.getByText("5 spørsmål", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("status")).toHaveText(`Fritekstspørsmålene er ferdige: 5 spørsmål i ${LECTURE_NAME}.`);
    await expect(row.getByRole("button", { name: "Lag flere" })).toBeVisible();
    await expect(row.getByRole("button", { name: "Øv nå" })).toBeEnabled();
    await expect(createSection(page).getByText("Venter til fritekstspørsmålene er ferdige")).toHaveCount(0);
    expect(await contentCounts(page, lectureId)).toEqual({
      flashcards: 0,
      quiz_questions: 0,
      model_cards: 0,
      freetext_questions: 5,
    });
    await axeInBothWidths(page);
  });

  test("FR-48: «+ Lag flere» når alle spørsmålene finnes, gir «ingenting»-teksten uten «Prøv igjen»", async ({ page }) => {
    const lectureId = await lectureWith(page, TWO);
    await makeFreetextViaApi(page, lectureId, 2);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = freetextRow(page);
    await expect(row.getByText("2 spørsmål", { exact: true })).toBeVisible();
    const more = row.getByRole("button", { name: "Lag flere" });
    await expect(more).toBeEnabled();

    await tabTo(page, more);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Lag fritekstspørsmål" });
    await expect(dialog.getByText("Nye spørsmål legges til de 2 du har fra før.")).toBeVisible();
    await tabTo(page, dialog.getByRole("button", { name: "Lag fritekstspørsmål" }));
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);

    await expect(row.getByText(NOTHING, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("status")).toHaveText(NOTHING);
    await expect(row.getByRole("alert")).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Prøv igjen" })).toHaveCount(0);
    await expect(row.getByText("2 spørsmål", { exact: true })).toBeVisible();
    expect((await contentCounts(page, lectureId)).freetext_questions).toBe(2);
    await expectNoAxeViolations(page);
  });

  test("FR-12, UX-DR22: slettebekreftelsen for fila nevner fritekstspørsmålene, og de slettes med fila", async ({ page }) => {
    const lectureId = await lectureWith(page, SEVEN);
    await makeFreetextViaApi(page, lectureId, 7);
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(freetextRow(page).getByText("7 spørsmål", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Slett fritekst.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByText("Dette sletter også 7 fritekstspørsmål laget fra fila.")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Slett fila" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(freetextRow(page).getByText("Ingen ennå")).toBeVisible();
    expect((await contentCounts(page, lectureId)).freetext_questions).toBe(0);
  });
});
