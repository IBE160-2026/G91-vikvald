import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  type ApiQuestion,
  PASSWORD,
  SAVE_PATH,
  WORD_FILE,
  answerQuizQuestion,
  cardFront,
  createSection,
  dayFromToday,
  dropFiles,
  expectNoAxeViolations,
  expectOnHomePage,
  expectOnLoginPage,
  fileRows,
  flashcardCountViaApi,
  pdfFile,
  quizQuestionsViaApi,
  quizRow,
  semesterLineGraphic,
  semesterLineItems,
  sessionPanel,
  nextOverview,
  practicedIn,
  sidebarLecture,
  sidebarLectures,
  subjectCard,
  today,
  uniqueEmail,
} from "./felles";

// Flow 1 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-1 in the PRD.
// Only the steps that are built are tested; the rest (the summary, epic 9)
// is listed as «ikke bygd ennå» in docs/testing/brukerreiser.md.
// The notes have four definition sentences on three pages, so the mock model
// makes four flashcards and four quiz questions, fewer than «Vanlig» (up to
// 20). The mock model makes no quiz from fewer than four definitions.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-1 / flyt 1: Klara etter en forelesning", () => {
  test.describe.configure({ mode: "serial" });

  const email = uniqueEmail();
  const NOT_PDF =
    "Bare PDF-filer kan lastes opp. Lagre Word-dokumentet som PDF (Fil → Lagre som → PDF) og prøv igjen.";
  const NO_TEXT = "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Last opp en PDF der teksten kan merkes.";
  const TOO_MANY = "Fila har 51 sider. Grensen er 50 sider. Del den opp og last opp delene hver for seg.";
  const FEWER = "Det ble laget 4 av inntil 20 flashcards. Notatene ga ikke grunnlag for flere.";
  const QUIZ_FEWER = "Det ble laget 4 av inntil 20 spørsmål. Notatene ga ikke grunnlag for flere.";
  const QUIZ_DONE = "Quizspørsmålene er ferdige: 4 spørsmål i Uke 37: Merkevare.";
  const FAILED = "Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.";
  const NOTHING_NEW = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";
  const NOTES = [
    "Merkevare er et navn som skiller et produkt fra andre.",
    "Posisjonering er plassen merket har i hodet til kunden.",
    "Lojalitet er at kunden velger merket igjen. Logo er merkets tegn.",
  ];
  const FRONTS = ["Merkevare", "Posisjonering", "Lojalitet", "Logo"];
  let context: BrowserContext;
  let page: Page;
  let todayFull: string;
  // The exam is three weeks from today, so the line says «om 3 uker» whenever the test runs.
  const exam = dayFromToday(21);
  let lectureId: string;
  // The question on the card she marked «Kunne ikke» in step 7.
  let missedFront: string;
  // The quiz questions with the answer key (step 9), and the one she gets wrong.
  let questions: ApiQuestion[];
  let missedQuestion: { question: ApiQuestion; chosen: number };
  // A demo job is over in about a second. To see what the page shows while a
  // job runs, the answer about the finished job (GET /api/jobs/{id}, asked by
  // the job watcher) is held back; the job itself is done on the server.
  const isJobResult = (url: URL) => /^\/api\/jobs\/[0-9a-f-]{36}$/.test(url.pathname);
  async function holdJobResult(): Promise<() => Promise<void>> {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    await page.route(isJobResult, async (route) => {
      await released;
      await route.fallback();
    });
    return async () => {
      release();
      await page.unroute(isJobResult);
    };
  }
  // Releases the held answer about the quiz job (from step 6 to step 7).
  let releaseQuizResult: () => Promise<void>;

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
    await dialog.getByLabel("Eksamensdato").fill(exam.full);
    await dialog.getByRole("button", { name: "Opprett emne" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expectNoAxeViolations(page);

    // Back to the front page through the logo.
    await page.locator("header").getByRole("link", { name: "Studiekamerat" }).click();
    await expectOnHomePage(page);
  });

  test("Steg 2 (semesterlinja og «Åpne») – FR-6, FR-57, FR-58, SK-22, UX-DR11, UX-DR12: forsiden (02) viser semesterlinja med tiden til eksamen og emnekortet, og hun trykker «Åpne» på Markedsføring", async () => {
    // The semester line (story 5.5). Markedsføring has no lectures yet (they
    // come in step 3), so the line has no stations, only the dashed time to
    // the exam (E6). Screen readers get the text in the sr-only list.
    await expect(semesterLineItems(page)).toHaveText([
      `Markedsføring: Ingen forelesninger ennå. Eksamen ${exam.weekday} ${exam.dayMonth}, om 3 uker.`,
    ]);
    const graphic = semesterLineGraphic(page);
    await expect(graphic.getByText(`Eksamen ${exam.dayMonth} · om 3 uker`, { exact: true })).toBeVisible();
    await expect(graphic.getByText("Ingen forelesninger ennå", { exact: true })).toBeVisible();
    await expect(graphic.getByText(`I dag ${(await today(page)).dayMonth}`, { exact: true })).toBeVisible();
    await expect(graphic.locator('[data-part="exam"]')).toHaveCount(1);
    await expect(graphic.locator("[data-station]")).toHaveCount(0);

    // The subject card (story 5.4): no lectures yet, so NESTE STEG is «Ny forelesning».
    const card = subjectCard(page, "Markedsføring");
    await expect(card.getByRole("heading", { level: 3, name: "Neste steg" })).toBeAttached();
    await expect(card.getByText("Ingen forelesninger ennå", { exact: true })).toBeVisible();
    await expect(card.getByRole("link", { name: "Ny forelesning" })).toBeVisible();
    await expectNoAxeViolations(page);

    await card.getByRole("link", { name: "Åpne Markedsføring" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expect(page.getByText(`Eksamen ${exam.weekday} ${exam.full}`)).toBeVisible();
  });

  test("Steg 3 – FR-7, FR-15, UX-DR25: «Ny forelesning» på emnesiden (03) med dagens dato, til forelesningssiden (04)", async () => {
    await expect(page.getByText("Ingen forelesninger ennå.", { exact: true })).toBeVisible();
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
    await page.locator("main li").getByRole("link", { name: "Åpne Markedsføring" }).click();
    await expect(page.locator("main h1")).toHaveText("Markedsføring");

    const nav = page.getByRole("navigation", { name: "Emner" });
    await expect(nav.getByRole("button", { name: "Markedsføring" })).toHaveAttribute("aria-expanded", "true");
    await expectNoAxeViolations(page);
    await nav.getByRole("link", { name: "Uke 37: Merkevare" }).click();

    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(nav.getByRole("link", { name: "Uke 37: Merkevare" })).toHaveAttribute("aria-current", "page");
    // She has not practised yet: the status dot in the sidebar says so (story 5.1).
    await expect(sidebarLecture(page, "Uke 37: Merkevare")).toHaveAccessibleName("Uke 37: Merkevare Ikke øvd ennå");
    // The file from step 4 is still there.
    await expect(fileRows(page)).toHaveCount(1);
    await expect(lectureLine("1 fil", "3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 6 (lag flashcards) – FR-17, FR-28, NFR-17, UX-DR18, UX-DR19, UX-DR24: «Lag flashcards», hun velger «Vanlig», jobbstatusen viser at kortene lages, og «Lag quiz» venter til de er ferdige", async () => {
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
    const releaseResult = await holdJobResult();
    release();
    expect((await answered).status()).toBe(202);
    await page.unroute(jobsUrl);

    // «Lag quiz» waits until the cards are done.
    const quiz = quizRow(page);
    await expect(quiz.getByText("Venter til flashcardene er ferdige")).toBeVisible();
    await expect(quiz.getByRole("button", { name: "Lag quiz" })).toBeDisabled();
    await expect(section.getByText("Lager flashcards …", { exact: true }).first()).toBeVisible();
    await expectNoAxeViolations(page);
    await releaseResult();

    await expect(section.getByText("4 kort", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(quiz.getByText("Venter til flashcardene er ferdige")).toHaveCount(0);
    await expect(quiz.getByRole("button", { name: "Lag quiz" })).toBeEnabled();
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

  test("Steg 6 (lag quiz) – FR-28, FR-29, FR-30, NFR-17, UX-DR18, UX-DR19, UX-DR24: kortene er ferdige, hun trykker «Lag quiz» (06), velger «Vanlig» og «Middels», og jobbstatusen viser at quizen lages", async () => {
    const quiz = quizRow(page);
    await expect(quiz.getByText("Ingen ennå")).toBeVisible();
    await quiz.getByRole("button", { name: "Lag quiz" }).click();

    const dialog = page.getByRole("dialog", { name: "Lag quiz" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Uke 37: Merkevare · 1 fil, 3 sider")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("radio", { name: "Vanlig" }).check();
    await dialog.getByRole("radio", { name: "Middels" }).check();
    await expect(dialog.getByRole("radio", { name: "Vanlig" })).toBeChecked();
    await expect(dialog.getByRole("radio", { name: "Middels" })).toBeChecked();

    // The answer about the finished quiz job is held until she practises in step 7.
    releaseQuizResult = await holdJobResult();
    const started = page.waitForRequest(
      (request) => request.method() === "POST" && request.url().endsWith(`/api/lectures/${lectureId}/jobs`),
    );
    await dialog.getByRole("button", { name: "Lag quiz" }).click();
    expect((await started).postDataJSON()).toEqual({ kind: "quiz", params: { requested: 20, difficulty: "medium" } });
    await expect(dialog).toBeHidden();

    await expect(quiz.getByText("Lager quizspørsmål …", { exact: true }).first()).toBeVisible();
    await expect(quiz.getByText("Du kan bruke resten av appen imens.")).toBeVisible();
    // The flashcards wait to make more, but she can practise them.
    const section = createSection(page);
    await expect(section.getByText("Venter til quizspørsmålene er ferdige")).toBeVisible();
    await expect(section.getByRole("button", { name: "Lag flere" })).toBeDisabled();
    await expect(section.getByRole("button", { name: "Øv nå" })).toBeEnabled();
    await expectNoAxeViolations(page);
  });

  test("Steg 7 – FR-23, FR-24, FR-25, FR-28, NFR-8, NFR-17, UX-DR27, UX-DR31, UX-DR32: mens quizen lages, starter «Øv nå» kortøkten (07), Mellomrom snur, 1 og 2 markerer, og kortet hun ikke kunne, kommer igjen", async () => {
    await expect(quizRow(page).getByText("Lager quizspørsmål …", { exact: true }).first()).toBeVisible();
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Uke 37: Merkevare – Studiekamerat");
    await expect(sessionPanel(page).getByText("/ 4")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" }).getByRole("listitem")).toHaveText([
      "1 Kunne ikke",
      "2 Kunne",
      "Mellomrom snu kortet",
      "Esc avslutt",
    ]);
    await expectNoAxeViolations(page);

    // She reads the question, thinks, and flips with Space.
    missedFront = (await cardFront(page).textContent())!;
    expect(FRONTS).toContain(missedFront);
    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
      /^merkevare-notater\.pdf, side [123]$/,
    );
    await expectNoAxeViolations(page);
    // `1` for «Kunne ikke» on the first card, `2` for «Kunne» on the other three.
    await page.keyboard.press("1");
    for (let i = 0; i < 3; i += 1) {
      await expect(page.getByRole("button", { name: "Snu kortet" })).toBeFocused();
      await page.keyboard.press(" ");
      await page.keyboard.press("2");
    }

    // The card she did not know comes again.
    await expect(sessionPanel(page).getByText("Repeterer: 1 kort igjen")).toBeVisible();
    await expect(sessionPanel(page).getByText("Kunne 3 · Kunne ikke 1")).toBeVisible();
    await expect(cardFront(page)).toHaveText(missedFront);
    await expectNoAxeViolations(page);

    // The quiz is done while she practises, and a short message says so.
    await releaseQuizResult();
    await expect(page.getByText(QUIZ_DONE)).toBeVisible({ timeout: 10_000 });
    await expect(cardFront(page)).toHaveText(missedFront);
    await expectNoAxeViolations(page);
  });

  test("Steg 8 – FR-26, FR-56, UX-DR7, UX-DR34, UX-DR35: økten er ferdig (08) med «Kunne» og «Kunne ikke», lista med kilde, og hun går tilbake til forelesningen", async () => {
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press(" ");
    await page.keyboard.press("2");
    expect((await saved).status()).toBe(204);

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 4 kortene" })).toBeFocused();
    const fields = page.locator('[data-slot="result-field"]');
    await expect(fields.nth(0)).toContainText("Kunne");
    await expect(fields.nth(0)).toContainText("3");
    await expect(fields.nth(1)).toContainText("Kunne ikke");
    await expect(fields.nth(1)).toContainText("1");
    const missed = page.getByRole("region", { name: "Kortene du ikke kunne" });
    await expect(missed.getByRole("listitem")).toHaveCount(1);
    await expect(missed.getByRole("listitem")).toContainText(missedFront);
    await expect(missed.locator('[data-slot="source-link"]')).toHaveText(/^merkevare-notater\.pdf, side [123]$/);
    await expect(sessionPanel(page).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expectNoAxeViolations(page);

    // Back on the lecture page the sidebar fetches the overview again (story
    // 5.1). The test waits for that answer before it looks for «Øvd» (#343).
    const overview = nextOverview(page);
    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(createSection(page).getByText("4 kort", { exact: true })).toBeVisible();
    // The session is saved, so the server now counts the lecture as practised,
    // and the sidebar shows it without a reload (story 5.1).
    expect(practicedIn(await overview, lectureId)).toBe(true);
    await expect(sidebarLecture(page, "Uke 37: Merkevare")).toHaveAccessibleName("Uke 37: Merkevare Øvd");
    await expectNoAxeViolations(page);
  });

  test("Steg 9 – FR-32, FR-34, FR-35, NFR-8, UX-DR29: quizen er ferdig, «Øv nå» på Quiz-raden starter quizen (09), hun svarer med A–D og Enter, og først da ser hun riktig svar og forklaring med kilde", async () => {
    const quiz = quizRow(page);
    await expect(quiz.getByText("4 spørsmål", { exact: true })).toBeVisible();
    await expect(quiz.locator('[data-slot="note-surface"]')).toHaveText(QUIZ_FEWER);
    await expectNoAxeViolations(page);
    questions = await quizQuestionsViaApi(page, "lectures", lectureId);
    expect(questions).toHaveLength(4);

    await quiz.getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/quiz`);
    await expect(page).toHaveTitle("Quiz – Uke 37: Merkevare – Studiekamerat");
    const panel = page.getByRole("region", { name: "Quiz" });
    await expect(panel.getByText("Uke 37: Merkevare")).toBeVisible();
    await expect(panel.getByText("/ 4")).toBeVisible();
    await expect(page.getByText("SPØRSMÅL 1 AV 4")).toBeVisible();
    await expect(page.getByRole("list", { name: "Hurtigtaster" })).toContainText("A–D");
    await expect(page.getByRole("button", { name: "Bekreft svar" })).toBeDisabled();
    await expectNoAxeViolations(page);

    // She gets question 2 wrong and the rest right, with the keyboard only.
    for (let number = 1; number <= 4; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 4`)).toBeVisible();
      const right = number !== 2;
      const question = await answerQuizQuestion(page, questions, right);
      if (!right) missedQuestion = { question, chosen: (question.correct_index + 1) % 4 };
      if (number <= 2) await expectNoAxeViolations(page);
      const next = page.getByRole("button", { name: number === 4 ? "Se resultatet" : "Neste spørsmål" });
      await expect(next).toBeFocused();
      if (number < 4) await page.keyboard.press("Enter");
    }
    await expect(panel.getByText("3 riktige · 1 feil")).toBeVisible();
  });

  test("Steg 10 – FR-36, FR-56, UX-DR34, UX-DR35: resultatsiden (10) viser «3 av 4 riktige» og nøyaktig hvilket hun bommet på, med riktig svar og side i notatene", async () => {
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press("Enter");
    const save = await saved;
    expect(save.status()).toBe(204);
    expect(save.request().postDataJSON()).toMatchObject({
      lecture_id: lectureId,
      kind: "quiz",
      aborted: false,
      answered: 4,
      correct: 3,
      wrong: 1,
    });

    await expect(page.getByRole("heading", { level: 2, name: "3 av 4 riktige" })).toBeFocused();
    const result = page.locator('[data-slot="quiz-result"]');
    await expect(result.getByText("QUIZ FERDIG")).toBeVisible();
    await expect(
      result.getByText("Uke 37: Merkevare · her er den ene du svarte feil på, med riktig svar og kilde"),
    ).toBeVisible();
    const rows = page.locator('[data-slot="missed-list"]').getByRole("listitem");
    await expect(rows).toHaveCount(1);
    const { question, chosen } = missedQuestion;
    await expect(rows).toContainText("Spørsmål 2:");
    await expect(rows).toContainText(question.question);
    await expect(rows).toContainText(`Ditt svar${question.options[chosen]}`);
    await expect(rows).toContainText(`Riktig svar${question.options[question.correct_index]}`);
    await expect(rows.locator('[data-slot="source-link"]')).toHaveText(
      `merkevare-notater.pdf, side ${question.source.page_no}`,
    );
    await expect(page.getByRole("region", { name: "Quiz" }).getByText("Økten er ferdig og lagret")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ta quizen igjen" })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();
    await expect(page).toHaveURL(`/forelesninger/${lectureId}`);
    await expect(quizRow(page).getByText("4 spørsmål", { exact: true })).toBeVisible();
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
    // Nothing half-made: the four cards from before are all there is.
    await expect(section.getByText("4 kort", { exact: true })).toBeVisible();
    expect(await flashcardCountViaApi(page, lectureId)).toBe(4);
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
    await expect(section.getByText("4 kort", { exact: true })).toBeVisible();
    expect(await flashcardCountViaApi(page, lectureId)).toBe(4);
    await expectNoAxeViolations(page);
  });
});
