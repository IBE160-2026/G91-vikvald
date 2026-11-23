import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  PASSWORD,
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  dayFromToday,
  dropFiles,
  expectNoAxeViolations,
  makeFlashcardsViaApi,
  makeQuizViaApi,
  pdfFile,
  quizQuestion,
  quizRow,
  registerWithTermsViaApi,
  uniqueEmail,
  uploadViaApi,
} from "./brukerreiser/felles";

// Story 6.6: the final check of universal design (NFR-13, SK-9) and screen
// width (NFR-14). Every page and state of the app is checked with axe at
// 1280 and 768 px, without horizontal scrolling. At 768 px the app pages have
// «Meny» and no visible «Emner» navigation, and in the sessions the session
// panel is behind «Meny» too. The results are in docs/testplan.md.

const WIDE = { width: 1280, height: 900 };
const NARROW = { width: 768, height: 900 };

// Four definition sentences: four flashcards and four quiz questions (the
// mock model makes no quiz from fewer than four definitions).
const NOTES = [
  "Merkevare er et navn som skiller et produkt fra andre.",
  "Posisjonering er plassen merket har i hodet til kunden.",
  "Lojalitet er at kunden velger merket igjen. Logo er merkets tegn.",
];

// What else is checked at 768 px:
// - "plain": the login pages, the front page and «Fant ikke siden» (no sidebar).
// - "app": the pages with the sidebar, which is behind «Meny».
// - "session": as "app", and the session panel is behind «Meny» too.
type Layout = "plain" | "app" | "session";

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, "vannrett rulling").toBeLessThanOrEqual(innerWidth);
}

// The page as it is now, at 1280 and then 768 px, and back to 1280 px. An open
// dialog stays open while the width changes.
async function checkBothWidths(page: Page, layout: Layout, sessionPanel?: string) {
  await page.setViewportSize(WIDE);
  await expectNoHorizontalScroll(page);
  await expectNoAxeViolations(page);

  await page.setViewportSize(NARROW);
  if (layout !== "plain") {
    // A CSS locator: while a dialog is open, the top bar is hidden from the
    // accessibility tree, so a role locator would find nothing.
    await expect(page.locator('header button[aria-label="Meny"]')).toBeVisible();
    await expect(page.locator('nav[aria-label="Emner"]:visible')).toHaveCount(0);
  }
  if (layout === "session" && sessionPanel) {
    await expect(page.getByRole("region", { name: sessionPanel })).toHaveCount(0);
  }
  await expectNoHorizontalScroll(page);
  await expectNoAxeViolations(page);
  await page.setViewportSize(WIDE);
}

async function closeDialog(page: Page, dialog: Locator) {
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
}

// A new student with a subject, a lecture with the notes, four flashcards and
// four quiz questions, all through the API.
async function lectureWithContent(page: Page): Promise<{ subjectId: string; lectureId: string }> {
  await registerWithTermsViaApi(page);
  const subjectId = await createSubjectViaApi(page, "Markedsføring", dayFromToday(21).iso);
  const lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", dayFromToday(-2).iso);
  await uploadViaApi(page, lectureId, pdfFile("merkevare-notater.pdf", NOTES));
  await makeFlashcardsViaApi(page, lectureId, 20, 4);
  await makeQuizViaApi(page, lectureId, 20, 4);
  return { subjectId, lectureId };
}

test.describe("Universell utforming og skjermbredde på alle sider (story 6.6)", () => {
  // Each test checks many states twice (1280 and 768 px) with axe, which takes
  // over 30 s when the whole suite runs in parallel.
  test.describe.configure({ timeout: 120_000 });
  test("NFR-13, NFR-14, SK-9: innloggingen og oppretting av konto, tomme og med feilmelding, og «Fant ikke siden» utlogget, i 1280 og 768 px", async ({
    page,
  }) => {
    // An account to log in to with the wrong password, made in another context.
    const email = uniqueEmail();
    const register = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
    expect(register.status()).toBe(201);
    await page.context().clearCookies();

    await page.goto("/logg-inn");
    await expect(page.locator("main h1")).toHaveText("Logg inn");
    await checkBothWidths(page, "plain");
    await page.getByLabel("E-post").fill(email);
    await page.getByLabel("Passord").fill("feilpassord");
    await page.getByRole("button", { name: "Logg inn" }).click();
    await expect(page.getByLabel("Passord")).toHaveAttribute("aria-invalid", "true");
    await checkBothWidths(page, "plain");

    await page.goto("/registrer");
    await expect(page.locator("main h1")).toHaveText("Opprett konto");
    await checkBothWidths(page, "plain");
    await page.getByRole("button", { name: "Opprett konto" }).click();
    await expect(page.getByLabel("E-post")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("Passordet må ha minst 8 tegn.")).toBeVisible();
    await checkBothWidths(page, "plain");

    const response = await page.goto("/finnes-ikke");
    expect(response?.status()).toBe(404);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
    await checkBothWidths(page, "plain");
  });

  test("NFR-13, NFR-14, SK-9: forsiden uten og med emner, «Nytt emne», emnesiden, «Ny forelesning», forelesningssiden uten og med filer, vilkårsdialogen, «Lag flashcards», «Lag quiz» og slettebekreftelsen for en fil, i 1280 og 768 px", async ({
    page,
  }) => {
    // A new student who has not accepted the terms yet, so the terms dialog comes.
    const register = await page.request.post("/api/identity/register", {
      data: { email: uniqueEmail(), password: PASSWORD },
    });
    expect(register.status()).toBe(201);

    // The front page without subjects, and «Nytt emne».
    await page.goto("/");
    await expect(page.locator("main h1")).toHaveText("Dine emner");
    await expect(page.getByRole("button", { name: "Lag ditt første emne" })).toBeVisible();
    await checkBothWidths(page, "plain");
    await page.getByRole("button", { name: "Lag ditt første emne" }).click();
    const subjectDialog = page.getByRole("dialog", { name: "Nytt emne" });
    await expect(subjectDialog.getByLabel("Navn")).toBeFocused();
    await checkBothWidths(page, "plain");
    await subjectDialog.getByLabel("Navn").fill("Markedsføring");
    await subjectDialog.getByLabel("Eksamensdato").fill(dayFromToday(21).full);
    await subjectDialog.getByRole("button", { name: "Opprett emne" }).click();

    // The subject page, and «Ny forelesning».
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await checkBothWidths(page, "app");
    await page.getByRole("button", { name: "Ny forelesning" }).click();
    const lectureDialog = page.getByRole("dialog", { name: "Ny forelesning" });
    await expect(lectureDialog.getByLabel("Navn")).toBeFocused();
    await checkBothWidths(page, "app");
    await lectureDialog.getByLabel("Navn").fill("Uke 37: Merkevare");
    await lectureDialog.getByLabel("Navn").press("Enter");

    // The lecture page without files, with «Lag flashcards» and «Lag quiz».
    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await checkBothWidths(page, "app");

    // The terms dialog at the first upload, and then the page with the file.
    await dropFiles(page, [pdfFile("merkevare-notater.pdf", NOTES)]);
    const terms = page.getByRole("dialog", { name: "Før du laster opp" });
    await expect(terms).toBeVisible();
    await checkBothWidths(page, "app");
    await terms
      .getByRole("checkbox", { name: "Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke." })
      .check();
    await terms.getByRole("button", { name: "Godta og last opp" }).click();
    await expect(terms).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Filer" }).getByRole("listitem")).toHaveCount(1);
    await checkBothWidths(page, "app");

    // «Lag flashcards» and «Lag quiz», closed without making anything.
    await createSection(page).getByRole("button", { name: "Lag flashcards" }).click();
    const flashcardsDialog = page.getByRole("dialog", { name: "Lag flashcards" });
    await expect(flashcardsDialog).toBeVisible();
    await checkBothWidths(page, "app");
    await closeDialog(page, flashcardsDialog);

    await quizRow(page).getByRole("button", { name: "Lag quiz" }).click();
    const quizDialog = page.getByRole("dialog", { name: "Lag quiz" });
    await expect(quizDialog).toBeVisible();
    await checkBothWidths(page, "app");
    await closeDialog(page, quizDialog);

    // The delete confirmation for the file, closed with Esc.
    await page.getByRole("button", { name: "Slett merkevare-notater.pdf" }).click();
    const deleteDialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(deleteDialog).toBeVisible();
    await checkBothWidths(page, "app");
    await closeDialog(page, deleteDialog);

    // The front page with a subject.
    await page.goto("/");
    await expect(page.locator('[data-slot="subject-card"]')).toHaveCount(1);
    await checkBothWidths(page, "plain");
  });

  test("NFR-13, NFR-14, SK-9: flashcardøkten med forside og snudd kort, hurtigtastdialogen og resultatet, i 1280 og 768 px", async ({
    page,
  }) => {
    const { lectureId } = await lectureWithContent(page);
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByRole("button", { name: "Snu kortet" })).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");

    await page.getByRole("button", { name: "Snu kortet" }).click();
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");

    // «?» opens «Hurtigtaster»; Esc closes only the dialog.
    await page.keyboard.press("?");
    const shortcuts = page.getByRole("dialog", { name: "Hurtigtaster" });
    await expect(shortcuts).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");
    await closeDialog(page, shortcuts);
    await expect(page).toHaveURL(`/forelesninger/${lectureId}/flashcards`);

    // All four cards «Kunne»: the result.
    await page.getByRole("button", { name: "Kunne", exact: true }).click();
    for (let i = 0; i < 3; i += 1) {
      await page.getByRole("button", { name: "Snu kortet" }).click();
      await page.getByRole("button", { name: "Kunne", exact: true }).click();
    }
    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 4 kortene" })).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");
  });

  test("NFR-13, NFR-14, SK-9: quizøkten før og etter svar og quizresultatet, i 1280 og 768 px", async ({ page }) => {
    const { lectureId } = await lectureWithContent(page);
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 4")).toBeVisible();
    await checkBothWidths(page, "session", "Quiz");

    for (let number = 1; number <= 4; number += 1) {
      await expect(page.getByText(`SPØRSMÅL ${number} AV 4`)).toBeVisible();
      await quizQuestion(page).getByRole("radio").first().check();
      await page.getByRole("button", { name: "Bekreft svar" }).click();
      await expect(page.locator('[data-slot="explanation-card"]')).toContainText("Forklaring");
      if (number === 1) await checkBothWidths(page, "session", "Quiz");
      await page.getByRole("button", { name: number === 4 ? "Se resultatet" : "Neste spørsmål" }).click();
    }
    await expect(page.locator('[data-slot="quiz-result"]')).toBeVisible();
    await checkBothWidths(page, "session", "Quiz");
  });

  test("NFR-13, NFR-14, SK-9: kontosiden med slettebekreftelsen for kontoen, og «Fant ikke siden» innlogget, i 1280 og 768 px", async ({
    page,
  }) => {
    await registerWithTermsViaApi(page);
    await page.goto("/konto");
    await expect(page.locator("main h1")).toHaveText("Konto");
    await checkBothWidths(page, "app");

    await page.locator("main").getByRole("button", { name: "Slett kontoen …" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette kontoen?" });
    await expect(dialog).toBeVisible();
    await checkBothWidths(page, "app");
    await closeDialog(page, dialog);

    const response = await page.goto("/finnes-ikke");
    expect(response?.status()).toBe(404);
    await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
    await checkBothWidths(page, "plain");
  });

  // The should-have pages (epics 7–9). The test looks for the entry in the app
  // instead of assuming an address, so the pages are checked as soon as they
  // are built. While a switch is on and the entry is not there, the test notes
  // «ikke bygd ennå» and is green.
  test("NFR-13, NFR-14, SK-9: bør ha-sidene som er skrudd på i GET /api/config, i 1280 og 768 px", async ({ page }, testInfo) => {
    const configResponse = await page.request.get("/api/config");
    expect(configResponse.status()).toBe(200);
    const config = (await configResponse.json()) as Record<string, boolean>;
    const { lectureId } = await lectureWithContent(page);
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(createSection(page).getByText("4 kort", { exact: true })).toBeVisible();

    const makeAndPractise = page.getByRole("region", { name: "Lag og øv" });
    const entries: { flag: string; name: string; entry: Locator }[] = [
      {
        flag: "feature_mnemonics",
        name: "Huskeregler («Lag modellkort»)",
        entry: createSection(page).getByRole("button", { name: "Lag modellkort" }),
      },
      {
        flag: "feature_freetext",
        name: "Fritekst",
        entry: makeAndPractise.getByRole("group", { name: "Fritekst" }).getByRole("button").first(),
      },
      {
        flag: "feature_summary",
        name: "Sammendrag",
        entry: makeAndPractise.getByRole("group", { name: "Sammendrag" }).getByRole("button").first(),
      },
    ];
    for (const { flag, name, entry } of entries) {
      if (!config[flag]) {
        testInfo.annotations.push({ type: name, description: `skrudd av (${flag}: false)` });
        continue;
      }
      if ((await entry.count()) === 0) {
        testInfo.annotations.push({ type: name, description: "ikke bygd ennå" });
        continue;
      }
      await entry.click();
      await checkBothWidths(page, "app");
      testInfo.annotations.push({ type: name, description: "kontrollert med axe i 1280 og 768 px" });
      // Back to the lecture page for the next entry.
      if ((await page.getByRole("dialog").count()) > 0) await page.keyboard.press("Escape");
      await page.goto(`/forelesninger/${lectureId}`);
    }
  });
});

// axe on the seed data (story 6.4): real-looking content with longer text.
// Nothing is changed: no session is saved, and any request to save one fails
// the test. Without the test user these tests skip themselves; with
// E2E_REQUIRE_SEED set they fail instead, as in testbruker.spec.ts.
test.describe("Universell utforming med eksempelemnet (story 6.6)", () => {
  const EMAIL = "test@studiekamerat.no";
  const SEED_PASSWORD = "studiekamerat";

  let saves: string[];
  let lectureId: string;

  test.beforeEach(async ({ page }) => {
    const login = await page.request.post("/api/identity/login", { data: { email: EMAIL, password: SEED_PASSWORD } });
    if (process.env.E2E_REQUIRE_SEED) {
      expect(login.status(), "E2E_REQUIRE_SEED er satt, men testbrukeren kan ikke logge inn").toBe(200);
    }
    test.skip(
      login.status() !== 200,
      "Testbrukeren finnes ikke: seed kjører bare på tom database. Start et nytt Compose-prosjekt, f.eks. `docker compose -p sk-seedtest up --build`.",
    );
    // Any save of a session is stopped and counted, so the seed data stay as they are.
    saves = [];
    await page.route("**/api/practice-sessions", async (route) => {
      if (route.request().method() === "POST") {
        saves.push(route.request().url());
        await route.abort();
        return;
      }
      await route.fallback();
    });
    const subjects = (await (await page.request.get("/api/subjects")).json()) as { id: string; name: string }[];
    const subject = subjects.find((item) => item.name === "Markedsføring");
    expect(subject).toBeDefined();
    const lectures = (await (await page.request.get(`/api/subjects/${subject!.id}/lectures`)).json()) as {
      id: string;
      name: string;
    }[];
    lectureId = lectures.find((item) => item.name === "Markedsmiksen")!.id;
  });

  test.afterEach(() => {
    expect(saves, "testen skal ikke lagre en økt").toEqual([]);
  });

  test("NFR-13, NFR-14, SK-9: forelesningssiden med eksempelnotatene, i 1280 og 768 px", async ({ page }) => {
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(page.locator("main h1")).toHaveText("Markedsmiksen");
    await expect(createSection(page).getByText("5 kort", { exact: true })).toBeVisible();
    await checkBothWidths(page, "app");
  });

  test("NFR-13, NFR-14, SK-9: flashcardøkten med eksempelkortene, forside og snudd kort, i 1280 og 768 px", async ({
    page,
  }) => {
    await page.goto(`/forelesninger/${lectureId}/flashcards`);
    await expect(page.getByRole("button", { name: "Snu kortet" })).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");
    // Flipped, but not marked: nothing is saved before a card is marked.
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await checkBothWidths(page, "session", "Flashcards");
  });

  test("NFR-13, NFR-14, SK-9: quizøkten med eksempelspørsmålene, med et alternativ valgt men ikke bekreftet, i 1280 og 768 px", async ({
    page,
  }) => {
    await page.goto(`/forelesninger/${lectureId}/quiz`);
    await expect(page.getByText("SPØRSMÅL 1 AV 5")).toBeVisible();
    await checkBothWidths(page, "session", "Quiz");
    // Chosen, not confirmed: nothing is answered, so nothing is saved.
    await quizQuestion(page).getByRole("radio").first().check();
    await checkBothWidths(page, "session", "Quiz");
  });
});
