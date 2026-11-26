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
// numbered list of three or more lines under a line of text). Story 7.2: the
// model cards in the flashcard session, and changing the mnemonic.

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
    freetext_questions: number;
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
    // Only model cards: «Øv nå» is active, since they are practised as flashcards (story 7.2).
    await expect(row.getByRole("button", { name: "Øv nå" })).toBeEnabled();
    await expect(quizRow(page).getByText("Venter til modellkortene er ferdige")).toHaveCount(0);
    expect(await contentCounts(page, lectureId)).toEqual({ flashcards: 0, quiz_questions: 0, model_cards: 2, freetext_questions: 0, summary_points: 0 });
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

const SAVE_PATH = "/api/practice-sessions";

// Only the AIDA list: one model card with a mnemonic (AIDA).
const AIDA_PAGES = ["Deler av AIDA\n- Attention\n- Interest\n- Desire\n- Action"];

async function lectureWithModelCards(page: Page, pages: string[]): Promise<string> {
  const lectureId = await lectureWith(page, pages);
  const response = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "models", params: { requested: 30 } },
  });
  expect(response.status()).toBe(202);
  await expect.poll(async () => (await contentCounts(page, lectureId)).model_cards, { timeout: 15_000 }).toBeGreaterThan(0);
  return lectureId;
}

test.describe("Øv på modellkort (story 7.2)", () => {
  test("FR-56, FR-46, UX-DR28, NFR-8: modellkortet øves med tastaturet, huskeregelen endres i dialogen, og økten lagres som flashcards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const lectureId = await lectureWithModelCards(page, AIDA_PAGES);
    await page.goto(`/forelesninger/${lectureId}`);
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${lectureId}/flashcards$`));

    const card = page.locator("[data-slot='flashcard']");
    await expect(card.getByText("Forklar Deler av AIDA.")).toBeVisible();
    await expect(card.locator("ol")).toHaveCount(0);
    await page.keyboard.press(" ");
    const points = card.locator("[data-slot='model-card-back'] ol > li");
    await expect(points).toHaveCount(4);
    // The letter box is hidden from screen readers: each point is read once.
    await expect(card.locator("ol")).toMatchAriaSnapshot(`
      - list:
        - listitem: Attention
        - listitem: Interest
        - listitem: Desire
        - listitem: Action
    `);
    await expect(card.locator("[data-slot='letter-box']")).toHaveText(["A", "I", "D", "A"]);
    await expect(card.getByText("Huskeregel:")).toBeVisible();
    await expect(card.locator("[data-slot='note-surface']")).toContainText("AIDA");
    await expect(card.getByText("modeller.pdf, side 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeFocused();
    await expectNoAxeViolations(page);

    // Open the dialog with the keyboard.
    const change = card.getByRole("button", { name: "Endre huskeregel" });
    await tabTo(page, change);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Endre huskeregel" });
    const field = dialog.getByLabel("Huskeregel");
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("AIDA");
    await expectNoAxeViolations(page);

    // Esc closes without a change, and focus goes back to the button.
    await page.keyboard.press("End");
    await page.keyboard.type(" x");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(change).toBeFocused();
    await expect(card.locator("[data-slot='note-surface']")).toHaveText("Huskeregel: AIDA");

    // An empty mnemonic saves nothing.
    await page.keyboard.press("Enter");
    await expect(field).toBeFocused();
    await field.fill("   ");
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog.getByText("Skriv inn en huskeregel.")).toBeVisible();
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toBeFocused();
    await expectNoAxeViolations(page);

    // «2» and Space type text in the field and do not mark the card.
    await field.fill("");
    await page.keyboard.type("Alle 2 I Dag Allerede");
    await expect(field).toHaveValue("Alle 2 I Dag Allerede");
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(card.locator("[data-slot='note-surface']")).toHaveText("Huskeregel: Alle 2 I Dag Allerede");
    await expect(page.getByText("Kunne 0 · Kunne ikke 0")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kunne", exact: true })).toBeEnabled();

    // Mark it with «2»: the session is finished and saved as flashcards.
    // Focus is back on «Endre huskeregel»; «2» marks the card from there.
    await expect(change).toBeFocused();
    const saved = page.waitForRequest((request) => new URL(request.url()).pathname === SAVE_PATH);
    await page.keyboard.press("2");
    const body = (await saved).postDataJSON() as Record<string, unknown>;
    expect(body).toMatchObject({ kind: "flashcards", lecture_id: lectureId, shown: 1, answered: 1, correct: 1, wrong: 0 });
    await expect(page.getByRole("heading", { level: 2, name: /Du har gått gjennom/ })).toBeFocused();

    // The new mnemonic is stored.
    const cards = (await (await page.request.get(`/api/lectures/${lectureId}/flashcards`)).json()) as {
      mnemonic: string | null;
    }[];
    expect(cards.map((item) => item.mnemonic)).toEqual(["Alle 2 I Dag Allerede"]);
  });

  test("FR-23, FR-56: «Øv på hele emnet» blander modellkortene inn med de andre kortene", async ({ page }) => {
    const lectureId = await lectureWithModelCards(page, PAGES);
    const flashcards = await page.request.post(`/api/lectures/${lectureId}/jobs`, { data: { kind: "flashcards" } });
    expect(flashcards.status()).toBe(202);
    await expect.poll(async () => (await contentCounts(page, lectureId)).flashcards, { timeout: 15_000 }).toBeGreaterThan(0);
    const counts = await contentCounts(page, lectureId);
    const lecture = (await (await page.request.get(`/api/lectures/${lectureId}`)).json()) as { subject_id: string };

    await page.goto(`/emner/${lecture.subject_id}/flashcards`);
    await expect(page.getByText(`/ ${counts.flashcards + counts.model_cards}`, { exact: true }).first()).toBeVisible();
    const subjectCards = (await (await page.request.get(`/api/subjects/${lecture.subject_id}/flashcards`)).json()) as {
      kind: string;
    }[];
    expect(subjectCards.filter((item) => item.kind === "model")).toHaveLength(2);
  });

  test("FR-46: «Legg til huskeregel» på et kort uten huskeregel", async ({ page }) => {
    // All points start with P: the card is saved without a mnemonic (FR-44).
    const lectureId = await lectureWithModelCards(page, ["De fire P-ene\n1. Produkt\n2. Pris\n3. Plass\n4. Promotion"]);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await page.getByRole("button", { name: "Snu kortet" }).click();
    const card = page.locator("[data-slot='flashcard']");
    await expect(card.getByText("Huskeregel:")).toHaveCount(0);
    await card.getByRole("button", { name: "Legg til huskeregel" }).click();
    const dialog = page.getByRole("dialog", { name: "Legg til huskeregel" });
    await expect(dialog.getByLabel("Huskeregel")).toHaveValue("");
    await dialog.getByLabel("Huskeregel").fill("Fire P-er");
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(card.locator("[data-slot='note-surface']")).toHaveText("Huskeregel: Fire P-er");
    await expect(card.getByRole("button", { name: "Endre huskeregel" })).toBeVisible();
  });
});
