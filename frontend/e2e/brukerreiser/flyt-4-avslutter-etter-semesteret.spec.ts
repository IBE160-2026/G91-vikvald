import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  PASSWORD,
  createLectureViaApi,
  createSubjectViaApi,
  expectNoAxeViolations,
  expectOnHomePage,
  expectOnLoginPage,
  pdfFile,
  registerWithTermsViaApi,
  today,
  uploadViaApi,
} from "./felles";

// Flow 4 in EXPERIENCE.md («Brukerreiser (Key Flows)»), a support flow for FR-3 and FR-5.
// The flow starts after the exam with the account page (15) and has no login
// step of its own, so the semester (3 subjects, 15 lectures and 18 files, as in
// the flow) is made through the API first.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("FR-3, FR-5 / flyt 4: Klara avslutter etter semesteret", () => {
  test.describe.configure({ mode: "serial" });

  const COUNTS = "3 emner, 15 forelesninger og 18 filer";
  let context: BrowserContext;
  let page: Page;
  let email: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    email = await registerWithTermsViaApi(page);
    // 3 subjects with 5 lectures each; the first lecture in each subject gets 2 files extra (15 + 3 = 18).
    for (const [s, subject] of ["Markedsføring", "Samfunnsøkonomi", "Organisasjon og ledelse"].entries()) {
      const subjectId = await createSubjectViaApi(page, subject, `2026-12-0${s + 2}`);
      for (let week = 36; week <= 40; week += 1) {
        const lectureId = await createLectureViaApi(page, subjectId, `Uke ${week}`, `2026-09-0${week - 35}`);
        await uploadViaApi(page, lectureId, pdfFile(`uke-${week}.pdf`, [`Uke ${week}`]));
        if (week === 36) await uploadViaApi(page, lectureId, pdfFile("ekstra.pdf", ["Ekstra"]));
      }
    }
    await page.goto("/");
    await expectOnHomePage(page);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 – FR-3, UX-DR6, UX-DR39: «Konto» i toppfeltet åpner kontosiden (15)", async () => {
    await expectNoAxeViolations(page);
    await page.locator("header").getByRole("link", { name: "Konto" }).click();
    await expect(page).toHaveURL(/\/konto$/);
    await expect(page).toHaveTitle("Konto – Studiekamerat");
    await expect(page.locator("main h1")).toHaveText("Konto");
    await expect(page.locator("main").getByRole("heading", { level: 2 })).toHaveText([
      "Innlogging",
      "Vilkår og personvern",
      "Slett kontoen",
    ]);
    await expectNoAxeViolations(page);
  });

  test("Steg 2 – FR-11, NFR-2, UX-DR39: hun ser e-posten, at vilkårene ble godtatt før første opplasting, og demomodus", async () => {
    const main = page.locator("main");
    await expect(main.getByText(email)).toBeVisible();
    await expect(main.getByText("Lagret kryptert, aldri i klartekst")).toBeVisible();
    await expect(main.getByText(`Godtatt ${(await today(page)).full}, før første opplasting`)).toBeVisible();
    await expect(main.getByText("Demomodus: innholdet lages av en testmodell")).toBeVisible();
    await expect(main.getByText("Testmodell i demomodus (ellers Google, i EU)")).toBeVisible();
  });

  test("Steg 3 – FR-5, UX-DR39: under «Slett kontoen» står det hva som slettes og hvor mye hun har", async () => {
    const card = page.getByRole("region", { name: "Slett kontoen" });
    // What goes (the generated content kinds registered so far: flashcards since story 3.7, quiz questions since story 4.1, model cards since story 7.1 and free-text questions since story 8.1), and how much she has.
    await expect(
      card.getByText("Alle emner, filer og alt generert innhold slettes for godt: flashcards, quizspørsmål, modellkort, fritekstspørsmål og sammendrag. Det kan ikke angres."),
    ).toBeVisible();
    await expect(card.getByText(`Du har nå ${COUNTS}.`)).toBeVisible();
    await expect(card.getByRole("button", { name: "Slett kontoen …" })).toBeVisible();
  });

  test("Steg 4 – FR-5, UX-DR21, UX-DR22: «Slett kontoen …» åpner bekreftelsen med «Avbryt» som startfokus", async () => {
    await page.getByRole("button", { name: "Slett kontoen …" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(email)).toBeVisible();
    await expect(dialog.getByText("Alle emner, filer og alt generert innhold slettes for godt: flashcards, quizspørsmål, modellkort, fritekstspørsmål og sammendrag.")).toBeVisible();
    await expect(dialog.getByText(`Dette sletter også ${COUNTS}.`)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Feilvei – FR-5, UX-DR22: hun avbryter, og ingenting slettes", async () => {
    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await dialog.getByRole("button", { name: "Avbryt" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Slett kontoen …" })).toBeFocused();
    expect((await page.request.get("/api/identity/me")).status()).toBe(200);
    expect((await (await page.request.get("/api/subjects")).json()).length).toBe(3);

    // Still everything after a reload.
    await page.reload();
    await expect(page.getByRole("region", { name: "Slett kontoen" }).getByText(`Du har nå ${COUNTS}.`)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 5 – FR-5, UX-DR40: hun bekrefter, alt er slettet for godt, og hun er tilbake på innloggingen (01)", async () => {
    await page.getByRole("button", { name: "Slett kontoen …" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await dialog.getByRole("button", { name: "Slett kontoen", exact: true }).click();

    await expectOnLoginPage(page);
    await expectNoAxeViolations(page);
    expect((await page.request.get("/api/identity/me")).status()).toBe(401);

    // The account is gone: the same e-mail and password give the login error.
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByText("Feil e-post eller passord. Sjekk at Caps Lock er av.")).toBeVisible();
    await expect(page).toHaveURL(/\/logg-inn$/);

    // Nothing of her is left: the e-mail is free again, and a new account with it is empty.
    const again = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
    expect(again.status()).toBe(201);
    expect(await (await page.request.get("/api/subjects")).json()).toEqual([]);
    expect((await (await page.request.get("/api/identity/me")).json()).terms_accepted_at).toBeNull();
  });
});
