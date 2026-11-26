import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { makePdf } from "./pdf";

// Story 2.7: the account page (15), the terms without a checkbox, logging out
// from the page, and deleting the account with the shared confirmation (FR-5,
// NFR-8, UX-DR7, UX-DR21, UX-DR22, UX-DR39).

const PASSWORD = "hemmelig1";
const WRONG = "Feil e-post eller passord. Sjekk at Caps Lock er av.";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 60) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// The app under test runs in demo mode; the config answer is changed in the browser only.
async function withoutDemoMode(page: Page) {
  await page.route("**/api/config", async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...(await response.json()), demo_mode: false } });
  });
}

// A new, logged-in student who has accepted the terms, through the API.
async function registerNewUser(page: Page): Promise<string> {
  const email = uniqueEmail();
  const response = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
  expect(response.status()).toBe(201);
  expect((await page.request.post("/api/identity/terms")).status()).toBe(200);
  return email;
}

async function createSubjectViaApi(page: Page, name: string): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: "2026-12-04" } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function createLectureViaApi(page: Page, subjectId: string, name: string): Promise<string> {
  const response = await page.request.post(`/api/subjects/${subjectId}/lectures`, {
    data: { name, date: "2026-09-11" },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function uploadViaApi(page: Page, lectureId: string, name: string) {
  const response = await page.request.post(`/api/lectures/${lectureId}/files`, {
    multipart: { file: { name, mimeType: "application/pdf", buffer: makePdf({ pages: ["Side en"] }) } },
  });
  expect(response.status()).toBe(201);
}

// 2 subjects, 3 lectures and 2 files.
async function setUp(page: Page): Promise<string> {
  const email = await registerNewUser(page);
  const marketing = await createSubjectViaApi(page, "Markedsføring");
  const economics = await createSubjectViaApi(page, "Samfunnsøkonomi");
  const first = await createLectureViaApi(page, marketing, "Uke 37: Merkevare");
  await createLectureViaApi(page, marketing, "Uke 38: Prising");
  await createLectureViaApi(page, economics, "Uke 37: Tilbud");
  await uploadViaApi(page, first, "merkevare.pdf");
  await uploadViaApi(page, first, "prising.pdf");
  return email;
}

// Opens the account page from «Konto» in the top bar.
async function openAccountPage(page: Page) {
  await page.goto("/");
  await expect(page.locator("main h1")).toHaveText("Dine emner");
  await page.locator("header").getByRole("link", { name: "Konto" }).click();
  await expect(page).toHaveURL(/\/konto$/);
  await expect(page.locator("main h1")).toHaveText("Konto");
}

async function expectOnLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page.locator("main h1")).toHaveText("Logg inn");
  await expect(page.locator("main").getByRole("status")).toHaveText("");
}

test.describe("Konto (story 2.7)", () => {
  test("FR-5: kontosiden fra «Konto» i toppfeltet viser kortene, uten axe-brudd i demomodus", async ({ page }) => {
    const email = await setUp(page);
    await openAccountPage(page);
    await expect(page).toHaveTitle("Konto – Studiekamerat");

    const main = page.locator("main");
    await expect(main.getByText("Innlogging, vilkår og sletting av kontoen")).toBeVisible();
    await expect(main.getByText("Demomodus: innholdet lages av en testmodell")).toBeVisible();
    await expect(main.getByRole("navigation", { name: "Emner" })).toBeVisible();
    await expect(main.getByRole("heading", { level: 2 })).toHaveText([
      "Innlogging",
      "Vilkår og personvern",
      "Slett kontoen",
    ]);
    await expect(main.getByText(email)).toBeVisible();
    await expect(main.getByText("Lagret kryptert, aldri i klartekst")).toBeVisible();
    await expect(main.getByText(/^Godtatt \d{2}\.\d{2}\.\d{4}, før første opplasting$/)).toBeVisible();
    await expect(main.getByText("Testmodell i demomodus (ellers Google, i EU)")).toBeVisible();
    await expect(main.getByText("Du har nå 2 emner, 3 forelesninger og 2 filer.")).toBeVisible();
    await expect(main.getByRole("button", { name: "Slett kontoen …" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("NFR-8: uten demomodus mangler demomerket, og siden og vilkårene har ingen axe-brudd", async ({ page }) => {
    await withoutDemoMode(page);
    await registerNewUser(page);
    await openAccountPage(page);
    const main = page.locator("main");
    await expect(main.getByText("Gemini fra Google, behandlet i EU", { exact: true })).toBeVisible();
    await expect(main.getByText("Demomodus: innholdet lages av en testmodell")).toHaveCount(0);
    // An empty account has no «Du har nå …» line.
    await expect(main.getByText(/Du har nå/)).toHaveCount(0);
    await expectNoAxeViolations(page);

    await main.getByRole("button", { name: "Les vilkårene" }).click();
    const dialog = page.getByRole("dialog", { name: "Vilkår og personvern" });
    await expect(dialog.getByText("Google kan logge forespørslene en periode for å oppdage misbruk.")).toBeVisible();
    await expect(dialog.getByText("I demomodus sendes ingenting ut.")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("UX-DR39: «Les vilkårene» viser vilkårene uten avkrysning; «Lukk» gir fokus tilbake", async ({ page }) => {
    await registerNewUser(page);
    await openAccountPage(page);
    const opener = page.locator("main").getByRole("button", { name: "Les vilkårene" });
    await tabTo(page, opener);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Vilkår og personvern" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("I demomodus sendes ingenting ut.")).toBeVisible();
    await expect(dialog.getByRole("checkbox")).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toHaveCount(0);
    const close = dialog.getByRole("button", { name: "Lukk" }).last();
    await expect(close).toBeFocused();
    await expectNoAxeViolations(page);

    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    // Esc closes too.
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("FR-5: avbryt sletter ingenting", async ({ page }) => {
    await setUp(page);
    await openAccountPage(page);
    const expected = [
      { kind: "subjects", count: 2 },
      { kind: "lectures", count: 3 },
      { kind: "files", count: 2 },
    ];
    const opener = page.locator("main").getByRole("button", { name: "Slett kontoen …" });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await expect(dialog.getByText("Dette sletter også 2 emner, 3 forelesninger og 2 filer.")).toBeVisible();
    // «Avbryt» has focus first; Enter on it closes without deleting.
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    const preview = await page.request.get("/api/identity/me/delete-preview");
    expect(preview.status()).toBe(200);
    expect((await preview.json()).counts).toEqual(expected);
  });

  test("FR-5: slett kontoen med bare tastatur → innloggingen; samme e-post og passord gir feilmeldingen", async ({
    page,
  }) => {
    const email = await setUp(page);
    await page.goto("/");
    await expect(page.locator("main h1")).toHaveText("Dine emner");

    await tabTo(page, page.locator("header").getByRole("link", { name: "Konto" }));
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/konto$/);
    const opener = page.locator("main").getByRole("button", { name: "Slett kontoen …" });
    await expect(opener).toBeVisible();
    await tabTo(page, opener);
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(email)).toBeVisible();
    await expect(dialog.getByText("Alle emner, filer og alt generert innhold slettes for godt: flashcards, quizspørsmål, modellkort, fritekstspørsmål og sammendrag.")).toBeVisible();
    await expect(dialog.getByText("Dette sletter også 2 emner, 3 forelesninger og 2 filer.")).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);

    const confirm = dialog.getByRole("button", { name: "Slett kontoen" });
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await expect(confirm).toBeFocused();
    await page.keyboard.press("Enter");

    await expectOnLoginPage(page);
    expect((await page.request.get("/api/identity/me")).status()).toBe(401);

    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByText(WRONG)).toBeVisible();
    await expect(page).toHaveURL(/\/logg-inn$/);
  });

  test("UX-DR39: «Logg ut» på kontosiden logger ut uten melding", async ({ page }) => {
    await registerNewUser(page);
    await openAccountPage(page);
    const card = page.getByRole("region", { name: "Innlogging" });
    await tabTo(page, card.getByRole("button", { name: "Logg ut" }));
    await page.keyboard.press("Enter");
    await expectOnLoginPage(page);
    expect((await page.request.get("/api/identity/me")).status()).toBe(401);
  });
});
