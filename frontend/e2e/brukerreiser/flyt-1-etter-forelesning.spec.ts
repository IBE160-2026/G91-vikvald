import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  PASSWORD,
  WORD_FILE,
  dropFiles,
  expectNoAxeViolations,
  expectOnHomePage,
  expectOnLoginPage,
  fileRows,
  pdfFile,
  sidebarLectures,
  today,
  uniqueEmail,
} from "./felles";

// Flow 1 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-1 in the PRD.
// Only the steps that are built are tested; the rest are listed as
// «ikke bygd ennå» in docs/testing/brukerreiser.md.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-1 / flyt 1: Klara etter en forelesning", () => {
  test.describe.configure({ mode: "serial" });

  const email = uniqueEmail();
  const NOT_PDF =
    "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";
  const NO_TEXT = "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.";
  const TOO_MANY = "Fila har 51 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.";
  let context: BrowserContext;
  let page: Page;
  let todayFull: string;

  test.beforeAll(async ({ browser }, testInfo) => {
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  async function logIn() {
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expectOnHomePage(page);
  }

  // The header line on the lecture page (04): date, number of files and pages.
  function lectureLine(files: string, pages: string) {
    return page.getByText(new RegExp(`^Forelesning \\S+ ${todayFull.replace(/\./g, "\\.")} · ${files} · ${pages}$`));
  }

  test("Forutsetning for steg 1 – FR-3, UX-DR40: Klara oppretter konto første gang", async () => {
    await page.goto("/logg-inn");
    await page.getByRole("link", { name: "Opprett konto" }).click();
    await expect(page).toHaveURL(/\/registrer$/);
    await expect(page.locator("main h1")).toHaveText("Opprett konto");
    await expectNoAxeViolations(page);

    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill(PASSWORD);
    await page.getByRole("button", { name: "Opprett konto" }).click();
    await expectOnHomePage(page);
    todayFull = (await today(page)).full;

    // Klara closes the app. The next step opens it again in a new tab.
    await page.close();
    await context.clearCookies();
    page = await context.newPage();
  });

  test("Steg 1 – FR-3, UX-DR40: Klara åpner Studiekamerat og logger inn (01)", async () => {
    await page.goto("/");
    // Without a login, the app opens on 01, and a new tab gets no «Du er logget ut».
    await expectOnLoginPage(page);
    await expectNoAxeViolations(page);
    await logIn();
  });

  test("Steg 2 (forsiden) – FR-3, UX-DR6, UX-DR45: forsiden «Dine emner» (02) med toppfelt", async () => {
    await expectOnHomePage(page);
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Studiekamerat" })).toHaveAttribute("href", "/");
    await expect(header.getByRole("link", { name: "Konto" })).toHaveAttribute("href", "/konto");
    await expect(header.getByRole("button", { name: "Logg ut" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Forutsetning for steg 2 – FR-6, UX-DR15, UX-DR21: Klara oppretter emnet Markedsføring med eksamensdato", async () => {
    await page.getByRole("button", { name: "Lag ditt første emne" }).click();
    const dialog = page.getByRole("dialog", { name: "Nytt emne" });
    await expect(dialog.getByLabel("Navn")).toBeFocused();
    await expectNoAxeViolations(page);
    await dialog.getByLabel("Navn").fill("Markedsføring");
    await dialog.getByLabel("Eksamensdato").fill("04.12.2026");
    await dialog.getByRole("button", { name: "Opprett emne" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expectNoAxeViolations(page);

    // Back to the front page through the logo.
    await page.locator("header").getByRole("link", { name: "Studiekamerat" }).click();
    await expectOnHomePage(page);
  });

  test("Steg 2 (åpner emnet) – FR-6: forsiden (02) viser Markedsføring med eksamen, og hun åpner emnet", async () => {
    const item = page.locator("main li").filter({ hasText: "Markedsføring" });
    await expect(item).toContainText("0 forelesninger");
    await expect(item).toContainText("Eksamen 04.12.2026");
    await expectNoAxeViolations(page);

    await item.getByRole("link", { name: "Markedsføring" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expect(page.getByText("Eksamen fredag 04.12.2026")).toBeVisible();
  });

  test("Steg 3 – FR-7, FR-15, UX-DR25: «Ny forelesning» på emnesiden (03) med dagens dato, til forelesningssiden (04)", async () => {
    await expect(page.getByText("Ingen forelesninger ennå.")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Ny forelesning" }).click();
    const dialog = page.getByRole("dialog", { name: "Ny forelesning" });
    await expect(dialog.getByLabel("Navn")).toBeFocused();
    await expect(dialog.getByLabel("Dato")).toHaveValue(todayFull);
    await expectNoAxeViolations(page);
    await dialog.getByLabel("Navn").fill("Uke 37: Merkevare");
    await dialog.getByLabel("Navn").press("Enter");

    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page).toHaveTitle("Uke 37: Merkevare – Studiekamerat");
    await expect(lectureLine("0 filer", "0 sider")).toBeVisible();
    await expect(sidebarLectures(page)).toHaveCount(1);
    await expect(sidebarLectures(page).first()).toHaveAttribute("aria-current", "page");
    await expectNoAxeViolations(page);
  });

  test("Steg 4 – FR-8, FR-11, NFR-6, UX-DR17, UX-DR23: hun drar PDF-en inn, vilkårsdialogen (05) åpnes første gang, «Godta og last opp»", async () => {
    await dropFiles(page, [pdfFile("merkevare-notater.pdf", ["Merkevare", "Posisjonering", "Lojalitet"])]);

    const dialog = page.getByRole("dialog", { name: "Før du laster opp" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText("Du har valgt merkevare-notater.pdf. Vi viser dette bare før den første opplastingen."),
    ).toBeVisible();
    await expect(dialog.getByText("I demomodus sendes ingenting ut.")).toBeVisible();
    const accept = dialog.getByRole("button", { name: "Godta og last opp" });
    await expect(accept).toBeDisabled();
    await expectNoAxeViolations(page);

    await dialog
      .getByRole("checkbox", { name: "Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke." })
      .check();
    await expect(accept).toBeEnabled();
    await expectNoAxeViolations(page);
    await accept.click();
    await expect(dialog).toHaveCount(0);
  });

  test("Steg 5 (fila) – FR-8, UX-DR16: fila står i fillista med antall sider", async () => {
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText("merkevare-notater.pdf");
    await expect(fileRows(page).first()).toContainText(`3 sider · lastet opp ${todayFull.slice(0, 5)}`);
    await expect(lectureLine("1 fil", "3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 5 (logg ut) – FR-3, UX-DR6, UX-DR40: Klara logger ut uten bekreftelse og kommer til innloggingen (01)", async () => {
    await page.getByRole("button", { name: "Logg ut" }).click();
    await expectOnLoginPage(page);
    expect((await context.cookies()).find((c) => c.name === "sk_session")).toBeUndefined();
    await expectNoAxeViolations(page);

    // Logged out for real: the front page sends her back to 01.
    await page.goto("/");
    await expectOnLoginPage(page);
  });

  test("Steg 6 (sidemenyen) – FR-3, FR-7, UX-DR7: noen dager senere logger hun inn og åpner forelesningen fra sidemenyen", async () => {
    await logIn();
    await page.locator("main li").getByRole("link", { name: "Markedsføring" }).click();
    await expect(page.locator("main h1")).toHaveText("Markedsføring");

    const nav = page.getByRole("navigation", { name: "Emner" });
    await expect(nav.getByRole("button", { name: "Markedsføring" })).toHaveAttribute("aria-expanded", "true");
    await expectNoAxeViolations(page);
    await nav.getByRole("link", { name: "Uke 37: Merkevare" }).click();

    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(nav.getByRole("link", { name: "Uke 37: Merkevare" })).toHaveAttribute("aria-current", "page");
    // The file from step 4 is still there.
    await expect(fileRows(page)).toHaveCount(1);
    await expect(lectureLine("1 fil", "3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Feilvei – FR-9, UX-DR42: hun drar inn en Word-fil, og den avvises med beskjed om å lagre som PDF", async () => {
    await dropFiles(page, [WORD_FILE]);
    const message = page.getByText(`merkevare-notater.docx: ${NOT_PDF}`);
    await expect(message).toBeVisible();
    expect(await message.evaluate((el) => el.closest("[aria-live]") !== null)).toBe(true);
    // The terms were accepted in step 4, so no dialog this time.
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(fileRows(page)).toHaveCount(1);
    await expect(lectureLine("1 fil", "3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Feilvei – FR-10, UX-DR42: en skannet PDF uten lesbar tekst avvises", async () => {
    await dropFiles(page, [pdfFile("skannet.pdf", ["", ""])]);
    await expect(page.getByText(`skannet.pdf: ${NO_TEXT}`)).toBeVisible();
    // A new upload clears the old message.
    await expect(page.getByText(NOT_PDF)).toHaveCount(0);
    await expect(fileRows(page)).toHaveCount(1);
    await expectNoAxeViolations(page);
  });

  test("Feilvei – NFR-16, UX-DR42: en fil over 50 sider avvises med beskjed om grensen", async () => {
    const pages = Array.from({ length: 51 }, (_, index) => `Side ${index + 1}`);
    await dropFiles(page, [pdfFile("hele-pensum.pdf", pages)]);
    await expect(page.getByText(`hele-pensum.pdf: ${TOO_MANY}`)).toBeVisible();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(lectureLine("1 fil", "3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
