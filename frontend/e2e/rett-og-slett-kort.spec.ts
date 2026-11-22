import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 3.7: edit and delete a card in the session, flashcards in the delete
// confirmations, and no delete while a job runs.

const PASSWORD = "hemmelig1";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// A new, logged-in student with a lecture of three cards from the mock model
// (Merkevare, Pris, Segment) in one file.
async function lectureWithThreeCards(page: Page): Promise<{ lectureId: string; fileId: string }> {
  const register = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(register.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  const subject = await page.request.post("/api/subjects", { data: { name: "Markedsføring", exam_date: "2026-12-04" } });
  const subjectId = (await subject.json()).id;
  const lecture = await page.request.post(`/api/subjects/${subjectId}/lectures`, {
    data: { name: "Uke 37: Merkevare", date: "2026-09-11" },
  });
  const lectureId = (await lecture.json()).id;
  const pages = ["Merkevare er et navn som skiller et produkt fra andre. Pris er det kunden betaler.", "Segment er en gruppe kunder."];
  const upload = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name: "definisjoner.pdf", mimeType: "application/pdf", buffer: makePdf({ pages }) } },
  });
  expect(upload.status()).toBe(201);
  const start = await page.request.post(`/api/lectures/${lectureId}/jobs`, {
    data: { kind: "flashcards", params: { requested: 10 } },
  });
  expect(start.status()).toBe(202);
  await expect
    .poll(async () => (await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).flashcards, {
      timeout: 10_000,
    })
    .toBe(3);
  return { lectureId, fileId: (await upload.json()).id };
}

type Card = { id: string; front: string; back: string };

async function cardsViaApi(page: Page, lectureId: string): Promise<Card[]> {
  const response = await page.request.get(`/api/lectures/${lectureId}/flashcards`);
  expect(response.status()).toBe(200);
  return response.json();
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Flashcards" });
}

function front(page: Page): Locator {
  return page.locator('[data-slot="flashcard"]').locator("p").nth(1);
}

async function openSession(page: Page, lectureId: string) {
  await page.goto(`/forelesninger/${lectureId}/flashcards`);
  await expect(panel(page).getByText("/ 3")).toBeVisible();
}

test.describe("Rett og slett kort (story 3.7)", () => {
  test("FR-27, SK-6, UX-DR27: rediger med bare tastatur: tomt felt gir feil, Esc endrer ingenting, «Lagre» viser ny tekst", async ({
    page,
  }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await openSession(page, lectureId);
    const question = (await front(page).textContent())!;

    // Flip with Space; focus is then on «Kunne». Tab to «Rediger» in the footer.
    await page.keyboard.press(" ");
    const edit = page.getByRole("button", { name: "Rediger" });
    await tabTo(page, edit);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Rediger kortet" });
    await expect(dialog).toBeVisible();
    const questionField = dialog.getByLabel("Spørsmål");
    const answerField = dialog.getByLabel("Svar");
    await expect(questionField).toBeFocused();
    await expect(questionField).toHaveValue(question);

    // An empty question: red border, the text under it, and focus on it.
    await questionField.fill("   ");
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog.getByText("Skriv inn spørsmålet.")).toBeVisible();
    await expect(questionField).toHaveAttribute("aria-invalid", "true");
    await expect(questionField).toBeFocused();
    await expectNoAxeViolations(page);

    // Esc: nothing changes, and focus is back on «Rediger».
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(edit).toBeFocused();
    await expect(front(page)).toHaveText(question);

    // Again: a new answer, saved with the keyboard.
    await page.keyboard.press("Enter");
    await expect(questionField).toHaveValue(question);
    await answerField.fill("Et nytt svar skrevet av Klara.");
    await tabTo(page, dialog.getByRole("button", { name: "Lagre" }));
    const patched = page.waitForResponse(
      (response) => response.request().method() === "PATCH" && new URL(response.url()).pathname.startsWith("/api/flashcards/"),
    );
    await page.keyboard.press("Enter");
    expect((await patched).status()).toBe(200);
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Et nytt svar skrevet av Klara.")).toBeVisible();
    await expect(edit).toBeFocused();
    const saved = (await cardsViaApi(page, lectureId)).find((card) => card.front === question)!;
    expect(saved.back).toBe("Et nytt svar skrevet av Klara.");
  });

  test("FR-27, UX-DR22, E22: slett: «Avbryt» og Esc beholder kortet, bekreftet sletting tar ruten ut", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await openSession(page, lectureId);
    const question = (await front(page).textContent())!;

    await page.keyboard.press(" ");
    const remove = page.getByRole("button", { name: "Slett", exact: true });
    await tabTo(page, remove);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Slette kortet?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(question)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog).not.toContainText("Dette sletter også");
    await expectNoAxeViolations(page);

    // «Avbryt» (Enter on the focused button), then Esc: the card stays.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(remove).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await cardsViaApi(page, lectureId)).toHaveLength(3);
    await expect(front(page)).toHaveText(question);

    // Confirm with the keyboard: «Avbryt» -> Tab -> «Slett kortet».
    await page.keyboard.press("Enter");
    const confirm = dialog.getByRole("button", { name: "Slett kortet" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();

    await expect(panel(page).getByText("/ 2")).toBeVisible();
    await expect(front(page)).not.toHaveText(question);
    await expect(page.getByRole("button", { name: "Snu kortet" })).toBeFocused();
    const left = await cardsViaApi(page, lectureId);
    expect(left).toHaveLength(2);
    expect(left.map((card) => card.front)).not.toContain(question);
  });

  test("FR-12: slettedialogen for fila sier «Dette sletter også 3 flashcards laget fra fila.»", async ({ page }) => {
    const { lectureId } = await lectureWithThreeCards(page);
    await page.goto(`/forelesninger/${lectureId}`);
    await page.getByRole("button", { name: "Slett definisjoner.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByText("Dette sletter også 3 flashcards laget fra fila.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("AR-7: en jobb som pågår gir meldingen i slettedialogen, og fila står", async ({ page }) => {
    const { lectureId, fileId } = await lectureWithThreeCards(page);
    // A demo job is over in seconds, so the running job is the API's answer
    // (the backend's own 409 is tested in pytest).
    await page.route(`**/api/files/${fileId}`, async (route) => {
      if (route.request().method() !== "DELETE") return route.fallback();
      await route.fulfill({ status: 409, json: { error: { code: "JOB_ALREADY_RUNNING", details: {} } } });
    });
    await page.goto(`/forelesninger/${lectureId}`);
    await page.getByRole("button", { name: "Slett definisjoner.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await dialog.getByRole("button", { name: "Slett fila" }).click();
    await expect(dialog.getByRole("alert")).toHaveText(
      "Det lages innhold i denne forelesningen nå. Vent til det er ferdig, og prøv igjen.",
    );
    await expect(dialog).toBeVisible();
    await expectNoAxeViolations(page);
    const files = await page.request.get(`/api/lectures/${lectureId}/files`);
    expect((await files.json()).map((file: { id: string }) => file.id)).toEqual([fileId]);
  });
});
