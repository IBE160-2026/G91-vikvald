import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  PASSWORD,
  SAVE_PATH,
  WORD_FILE,
  cardFront,
  createSection,
  dropFiles,
  expectNoAxeViolations,
  expectOnHomePage,
  expectOnLoginPage,
  fileRows,
  flashcardCountViaApi,
  pdfFile,
  sessionPanel,
  sidebarLectures,
  today,
  uniqueEmail,
} from "./felles";

// Flow 1 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-1 in the PRD.
// Only the steps that are built are tested; the rest (the quiz and the
// summary) are listed as «ikke bygd ennå» in docs/testing/brukerreiser.md.
// The notes have three definition sentences, so the mock model makes three
// flashcards, fewer than «Vanlig» (up to 20).
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-1 / flyt 1: Klara etter en forelesning", () => {
  test.describe.configure({ mode: "serial" });

  const email = uniqueEmail();
  const NOT_PDF =
    "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";
  const NO_TEXT = "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.";
  const TOO_MANY = "Fila har 51 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.";
  const FEWER = "Det ble laget 3 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.";
  const FAILED = "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.";
  const NOTHING_NEW = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";
  const NOTES = [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Posisjonering er plassen merket har i hodet til kunden.",
    "Lojalitet er at kunden velger merket igjen.",
  ];
  let context: BrowserContext;
  let page: Page;
  let todayFull: string;
  let lectureId: string;
  // The question on the card she marked «Kunne ikke» in step 7.
  let missedFront: string;

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
    lectureId = new URL(page.url()).pathname.split("/")[2];
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page).toHaveTitle("Uke 37: Merkevare – Studiekamerat");
    await expect(lectureLine("0 filer", "0 sider")).toBeVisible();
    await expect(sidebarLectures(page)).toHaveCount(1);
    await expect(sidebarLectures(page).first()).toHaveAttribute("aria-current", "page");
    await expectNoAxeViolations(page);
  });

  test("Steg 4 – FR-8, FR-11, NFR-6, UX-DR17, UX-DR23: hun drar PDF-en inn, vilkårsdialogen (05) åpnes første gang, «Godta og last opp»", async () => {
    await dropFiles(page, [pdfFile("merkevare-notater.pdf", NOTES)]);

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

  test("Steg 6 (lag flashcards) – FR-17, NFR-17, UX-DR18, UX-DR19, UX-DR24: «Lag flashcards», hun velger «Vanlig», og jobbstatusen viser at kortene lages", async () => {
    const section = createSection(page);
    await expect(section.getByText("Ingen ennå")).toBeVisible();
    await section.getByRole("button", { name: "Lag flashcards" }).click();

    const dialog = page.getByRole("dialog", { name: "Lag flashcards" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Uke 37: Merkevare · 1 fil, 3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("radio", { name: "Vanlig" }).check();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();

    // A demo job is over in about a second. The answer to the start request is
    // held until the job status has been checked; the job runs on the server
    // in the meantime.
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    const jobsUrl = `**/api/lectures/${lectureId}/jobs`;
    await page.route(jobsUrl, async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      const response = await route.fetch();
      await released;
      await route.fulfill({ response });
    });
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await dialog.getByRole("button", { name: "Lag flashcards" }).click();
    expect((await started).postDataJSON()).toEqual({ kind: "flashcards", params: { requested: 20 } });
    await expect(dialog).toBeHidden();

    await expect(section.getByText("Lager flashcards …", { exact: true }).first()).toBeVisible();
    await expect(section.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    await expect(section.getByRole("button")).toHaveCount(0);
    await expectNoAxeViolations(page);
    const answered = page.waitForResponse(
      (response) => response.request().method() === "POST" && response.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    release();
    expect((await answered).status()).toBe(202);
    await page.unroute(jobsUrl);

    await expect(section.getByText("3 kort", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(section.getByRole("button", { name: "Øv nå" })).toBeVisible();
    await expect(section.getByRole("button", { name: "Lag flere" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Feilvei – FR-18, UX-DR42: notatene gir grunnlag for færre kort enn valgt, og hun får beskjed om hvor mange som ble laget", async () => {
    const section = createSection(page);
    await expect(section.locator('[data-slot="note-surface"]')).toHaveText(FEWER);
    await expect(section.getByRole("status")).toHaveText(FEWER);
    await expectNoAxeViolations(page);
  });

  test("Steg 7 – FR-23, FR-24, FR-25, NFR-8, UX-DR27, UX-DR31, UX-DR32: «Øv nå» starter kortøkten (07), Mellomrom snur, 1 og 2 markerer, og kortet hun ikke kunne, kommer igjen", async () => {
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Uke 37: Merkevare – Studiekamerat");
    await expect(sessionPanel(page).getByText("/ 3")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" }).getByRole("listitem")).toHaveText([
      "1 Kunne ikke",
      "2 Kunne",
      "Mellomrom snu kortet",
      "Esc avslutt",
    ]);
    await expectNoAxeViolations(page);

    // She reads the question, thinks, and flips with Space.
    missedFront = (await cardFront(page).textContent())!;
    expect(["Merkevare", "Posisjonering", "Lojalitet"]).toContain(missedFront);
    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
      /^merkevare-notater\.pdf, side [123]$/,
    );
    await expectNoAxeViolations(page);
    // `1` for «Kunne ikke» on the first card, `2` for «Kunne» on the other two.
    await page.keyboard.press("1");
    for (let i = 0; i < 2; i += 1) {
      await expect(page.getByRole("button", { name: "Snu kortet" })).toBeFocused();
      await page.keyboard.press(" ");
      await page.keyboard.press("2");
    }

    // The card she did not know comes again.
    await expect(sessionPanel(page).getByText("Repeterer: 1 kort igjen")).toBeVisible();
    await expect(sessionPanel(page).getByText("Kunne 2 · Kunne ikke 1")).toBeVisible();
    await expect(cardFront(page)).toHaveText(missedFront);
    await expectNoAxeViolations(page);
  });

  test("Steg 8 – FR-26, FR-56, UX-DR34, UX-DR35: økten er ferdig (08) med «Kunne» og «Kunne ikke», lista med kilde, og hun går tilbake til forelesningen", async () => {
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press(" ");
    await page.keyboard.press("2");
    expect((await saved).status()).toBe(204);

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 3 kortene" })).toBeFocused();
    const fields = page.locator('[data-slot="result-field"]');
    await expect(fields.nth(0)).toContainText("Kunne");
    await expect(fields.nth(0)).toContainText("2");
    await expect(fields.nth(1)).toContainText("Kunne ikke");
    await expect(fields.nth(1)).toContainText("1");
    const missed = page.getByRole("region", { name: "Kortene du ikke kunne" });
    await expect(missed.getByRole("listitem")).toHaveCount(1);
    await expect(missed.getByRole("listitem")).toContainText(missedFront);
    await expect(missed.locator('[data-slot="source-link"]')).toHaveText(/^merkevare-notater\.pdf, side [123]$/);
    await expect(sessionPanel(page).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(createSection(page).getByText("3 kort", { exact: true })).toBeVisible();
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

  test("Feilvei – FR-21, UX-DR19: genereringen feiler, raden viser meldingen og «Prøv igjen», og ingenting halvferdig er lagret", async () => {
    // The mock model never fails, so the answer about the latest job is made a
    // failed job (as in flashcards.spec.ts) until she presses «Prøv igjen».
    const section = createSection(page);
    const latestUrl = `**/api/lectures/${lectureId}/jobs/latest`;
    await page.route(latestUrl, async (route) => {
      const body = [
        {
          id: "00000000-0000-0000-0000-000000000001",
          lecture_id: lectureId,
          kind: "flashcards",
          status: "failed",
          requested: 20,
          created: null,
          discarded: null,
          error_code: "GENERATION_TIMEOUT",
          started_at: "2026-11-21T10:00:00Z",
          finished_at: "2026-11-21T10:00:05Z",
        },
      ];
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    });
    await page.reload();
    await expect(section.getByRole("alert")).toHaveText(FAILED);
    const retry = section.getByRole("button", { name: "Prøv igjen" });
    await expect(retry).toBeVisible();
    // Nothing half-made: the three cards from before are all there is.
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible();
    expect(await flashcardCountViaApi(page, lectureId)).toBe(3);
    await expectNoAxeViolations(page);

    await page.unroute(latestUrl);
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await retry.click();
    expect((await started).postDataJSON()).toEqual({ kind: "flashcards", params: { requested: 20 } });
    // The same notes give no new cards, and nothing is stored twice.
    await expect(section.getByRole("status")).toHaveText(NOTHING_NEW, { timeout: 10_000 });
    await expect(section.getByRole("alert")).toHaveCount(0);
    await expect(section.getByText("3 kort", { exact: true })).toBeVisible();
    expect(await flashcardCountViaApi(page, lectureId)).toBe(3);
    await expectNoAxeViolations(page);
  });
});
