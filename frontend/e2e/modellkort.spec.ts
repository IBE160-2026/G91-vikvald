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

// Story 7.1: «Lag modellkort» on the Flashcards row, in the browser against
// the app in demo mode (the mock model makes one model card per bulleted or
// numbered list of three or more lines under a line of text).

const NOTHING = "Vi fant ingen modeller eller lister i denne forelesningen.";

// Two definitions (two flashcards) and two lists (two model cards).
const PAGES = [
  "Merkevare er et navn. Pris er det kunden betaler.\nDeler av AIDA\n- Attention\n- Interest\n- Desire\n- Action",
  "De fire P-ene\n1. Produkt\n2. Pris\n3. Plass\n4. Promotion",
];

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

async function lectureWith(page: Page, pages: string[]): Promise<string> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
  const lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
  await uploadViaApi(page, lectureId, pdfFile("modeller.pdf", pages));
  return lectureId;
}

async function contentCounts(page: Page, lectureId: string) {
  return (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()) as {
    flashcards: number;
    quiz_questions: number;
    model_cards: number;
  };
}

test.describe("Modellkort (story 7.1)", () => {
  test("FR-42, UX-DR18, UX-DR19, NFR-8: «Lag modellkort» med tastaturet starter uten dialog, og raden teller modellkortene med", async ({
    page,
  }) => {
    const lectureId = await lectureWith(page, PAGES);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = createSection(page);
    await expect(row.getByText("Ingen ennå")).toBeVisible();
    const button = row.getByRole("button", { name: "Lag modellkort" });
    await expect(button).toBeEnabled();
    await expectNoAxeViolations(page);

    // Hold the job until the running state has been checked.
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route("**/api/jobs/active", async (route) => {
      await held;
      await route.fallback();
    });

    await tabTo(page, button);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(row.getByText("Lager modellkort …", { exact: true }).first()).toBeVisible();
    await expect(row.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    await expect(quizRow(page).getByText("Venter til modellkortene er ferdige")).toBeVisible();
    await expect(quizRow(page).getByRole("button", { name: "Lag quiz" })).toBeDisabled();
    // Focus is kept on the row now that the button is gone.
    await expect(row).toBeFocused();
    await expectNoAxeViolations(page);

    release();
    await expect.poll(async () => (await contentCounts(page, lectureId)).model_cards, { timeout: 15_000 }).toBe(2);
    await page.unroute("**/api/jobs/active");
    await expect(row.getByText("2 kort", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("status")).toHaveText("Modellkortene er ferdige: 2 modellkort i Uke 37: Merkevare.");
    // «Lag modellkort» stays beside «Lag flere» when the row has content.
    await expect(row.getByRole("button", { name: "Lag modellkort" })).toBeEnabled();
    await expect(row.getByRole("button", { name: "Lag flere" })).toBeVisible();
    // Only model cards: «Øv nå» waits for story 7.2, where they can be practised.
    await expect(row.getByRole("button", { name: "Øv nå" })).toBeDisabled();
    await expect(quizRow(page).getByText("Venter til modellkortene er ferdige")).toHaveCount(0);
    expect(await contentCounts(page, lectureId)).toEqual({ flashcards: 0, quiz_questions: 0, model_cards: 2 });
    await expectNoAxeViolations(page);
  });

  test("FR-47: uten lister gir jobben «Vi fant ingen modeller eller lister …» uten «Prøv igjen»", async ({ page }) => {
    const lectureId = await lectureWith(page, ["Merkevare er et navn. Pris er det kunden betaler."]);
    await page.goto(`/forelesninger/${lectureId}`);
    const row = createSection(page);
    await row.getByRole("button", { name: "Lag modellkort" }).click();
    await expect(row.getByText(NOTHING, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
    await expect(row.getByRole("status")).toHaveText(NOTHING);
    await expect(row.getByRole("alert")).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Prøv igjen" })).toHaveCount(0);
    expect((await contentCounts(page, lectureId)).model_cards).toBe(0);
    await expectNoAxeViolations(page);
  });

  test("FR-12, UX-DR22: slettebekreftelsen for fila nevner modellkortene", async ({ page }) => {
    const lectureId = await lectureWith(page, PAGES);
    const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
      data: { kind: "models", params: { requested: 30 } },
    });
    expect(response.status()).toBe(202);
    await expect.poll(async () => (await contentCounts(page, lectureId)).model_cards, { timeout: 15_000 }).toBe(2);
    await page.goto(`/forelesninger/${lectureId}`);
    await page.getByRole("button", { name: "Slett modeller.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByText("Dette sletter også 2 modellkort laget fra fila.")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
