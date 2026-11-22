import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";

import {
  SAVE_PATH,
  cardFront,
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  expectNoAxeViolations,
  expectOnHomePage,
  fileRows,
  flashcardCountViaApi,
  makeFlashcardsViaApi,
  pdfFile,
  registerWithTermsViaApi,
  sessionPanel,
  sidebarLectures,
  uploadViaApi,
} from "./felles";

// Flow 2 in EXPERIENCE.md («Brukerreiser (Key Flows)»), UJ-2 in the PRD.
// «Three weeks before the exam Klara has uploaded notes from all the lectures
// in Markedsføring»: the account, the subject, eight lectures with one PDF
// each and the flashcards from them are made through the API first, since the
// flow has no login step. The mock model makes one card per definition
// sentence: one in each lecture, and three in «Uke 37: Merkevare», ten in all.
// Only the steps that are built are tested; the rest (status «øvd», the quiz,
// model cards and free text) are listed as «ikke bygd ennå» in
// docs/testing/brukerreiser.md.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("UJ-2 / flyt 2: Klara før eksamen", () => {
  test.describe.configure({ mode: "serial" });

  // Eight lectures, one a week on Fridays from week 34. Each PDF has the
  // lecture's name on page 1 and one definition sentence on each page after it
  // (a line longer than the page would be cut off).
  const LECTURES = [
    ["Uke 34: Introduksjon", "2026-08-21", ["Behov er en mangel kunden kjenner."]],
    ["Uke 35: Kjøpsatferd", "2026-08-28", ["Motiv er grunnen til et valg."]],
    ["Uke 36: Segmentering", "2026-09-04", ["Segment er en gruppe kunder."]],
    [
      "Uke 37: Merkevare",
      "2026-09-11",
      ["Merkevare er et navn som skiller et produkt fra andre.", "Logo er merkets tegn.", "Slagord er en kort setning om merket."],
    ],
    ["Uke 38: Prising", "2026-09-18", ["Pris er det kunden betaler."]],
    ["Uke 39: Distribusjon", "2026-09-25", ["Kanal er veien fra produsent til kunde."]],
    ["Uke 40: Kommunikasjon", "2026-10-02", ["Reklame er betalt kommunikasjon."]],
    ["Uke 41: Digital markedsføring", "2026-10-09", ["Nettbutikk er en butikk i nettleseren."]],
  ] as const;
  const ALL_FRONTS = ["Behov", "Motiv", "Segment", "Merkevare", "Logo", "Slagord", "Pris", "Kanal", "Reklame", "Nettbutikk"];
  const MERKEVARE_FRONTS = ["Merkevare", "Logo", "Slagord"];
  const slugOf = (name: string) => name.split(": ")[1].toLowerCase().replace(/\s+/g, "-");
  // The PDF each card comes from: the term before «er» -> the lecture's file.
  const FILE_OF_FRONT = new Map(
    LECTURES.flatMap(([name, , definitions]) => definitions.map((d) => [d.split(" er ")[0], `${slugOf(name)}.pdf`] as const)),
  );
  let context: BrowserContext;
  let page: Page;
  let exam: { iso: string; shown: string };
  let subjectId: string;
  let merkevareId: string;
  // Every POST /api/practice-sessions the page sends.
  const saves: Request[] = [];

  test.beforeAll(async ({ browser }, testInfo) => {
    // Eight jobs with the mock model take a few seconds each.
    testInfo.setTimeout(120_000);
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    // The exam is three weeks from today (local date, as the app shows it).
    const date = new Date();
    date.setDate(date.getDate() + 21);
    const pad = (value: number) => String(value).padStart(2, "0");
    const [y, m, d] = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())];
    exam = { iso: `${y}-${m}-${d}`, shown: `${d}.${m}.${y}` };

    await registerWithTermsViaApi(page);
    subjectId = await createSubjectViaApi(page, "Markedsføring", exam.iso);
    for (const [name, lectureDate, definitions] of LECTURES) {
      const lectureId = await createLectureViaApi(page, subjectId, name, lectureDate);
      await uploadViaApi(page, lectureId, pdfFile(`${slugOf(name)}.pdf`, [name, ...definitions]));
      await makeFlashcardsViaApi(page, lectureId, 10, definitions.length);
      if (name === "Uke 37: Merkevare") merkevareId = lectureId;
    }
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === SAVE_PATH) saves.push(request);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 (åpner emnet) – UJ-2, FR-6: forsiden (02) viser Markedsføring med åtte forelesninger og eksamen, og hun åpner emnet", async () => {
    await page.goto("/");
    await expectOnHomePage(page);
    const item = page.locator("main li").filter({ hasText: "Markedsføring" });
    await expect(item).toContainText("8 forelesninger");
    await expect(item).toContainText(`Eksamen ${exam.shown}`);
    await expectNoAxeViolations(page);

    await item.getByRole("link", { name: "Markedsføring" }).click();
    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
  });

  test("Steg 2 (forelesningene med status) – FR-7, FR-15, UX-DR7, UX-DR13: emnesiden (03) viser forelesningene etter dato med filer og status", async () => {
    await expect(
      page.getByText(new RegExp(`^8 forelesninger · 8 filer · eksamen \\S+ ${exam.shown.replace(/\./g, "\\.")}$`)),
    ).toBeVisible();
    const rows = page.locator("main tbody tr");
    await expect(rows).toHaveCount(8);
    await expect(rows.getByRole("link")).toHaveText(LECTURES.map(([name]) => name));
    for (let i = 0; i < LECTURES.length; i += 1) {
      await expect(rows.nth(i).getByRole("cell").nth(2)).toHaveText("1");
      // She has not practised yet (and «Øvd» comes with story 5.1).
      await expect(rows.nth(i).getByRole("cell").nth(3)).toHaveText("Ikke øvd ennå");
    }
    await expect(sidebarLectures(page)).toHaveCount(8);
    await expectNoAxeViolations(page);
  });

  test("Steg 2 (øver på hele emnet) – FR-23, FR-24, FR-25, FR-56, UX-DR14, UX-DR34: i kortet «Øv på hele emnet» trykker hun «Øv på flashcards», og økten (07) blander kort fra alle forelesningene", async () => {
    const practiceAll = page.getByRole("region", { name: "Øv på hele emnet" });
    await expect(practiceAll.getByText("10 kort fra 8 forelesninger")).toBeVisible();
    await practiceAll.getByRole("link", { name: "Øv på flashcards" }).click();

    await expect(page).toHaveURL(`/emner/${subjectId}/flashcards`);
    await expect(page).toHaveTitle("Flashcards – Markedsføring – Studiekamerat");
    await expect(sessionPanel(page).getByText("Markedsføring · hele emnet")).toBeVisible();
    await expect(sessionPanel(page).getByText("/ 10")).toBeVisible();
    await expectNoAxeViolations(page);

    const seen: string[] = [];
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    for (let i = 0; i < ALL_FRONTS.length; i += 1) {
      const question = (await cardFront(page).textContent())!;
      seen.push(question);
      await page.keyboard.press(" ");
      // The source names the file from the card's own lecture.
      await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(
        new RegExp(`^${FILE_OF_FRONT.get(question)}, side [2-4]$`),
      );
      if (i === 0) await expectNoAxeViolations(page);
      await page.keyboard.press("2");
    }
    expect((await saved).status()).toBe(204);
    // Every card from all eight lectures, once each.
    expect([...seen].sort()).toEqual([...ALL_FRONTS].sort());

    await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 10 kortene" })).toBeFocused();
    expect(saves.at(-1)!.postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: null,
      kind: "flashcards",
      aborted: false,
      answered: 10,
      correct: 10,
    });
    await expectNoAxeViolations(page);

    await page.getByRole("link", { name: "Tilbake til emnet" }).click();
    await expect(page).toHaveURL(`/emner/${subjectId}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
  });

  test("Steg 4 (åpner forelesningen) – FR-7, UX-DR7: hun åpner «Uke 37: Merkevare» (04) med notatene", async () => {
    await page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Uke 37: Merkevare" }).click();
    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 1 fil · 4 sider")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(1);
    await expect(fileRows(page).first()).toContainText("merkevare.pdf");
    await expect(createSection(page).getByText("3 kort", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 4 (øver på flashcards) – FR-23, FR-24, UX-DR9, UX-DR27: hun øver på flashcards fra forelesningen (07)", async () => {
    await createSection(page).getByRole("button", { name: "Øv nå" }).click();
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}/flashcards`);
    await expect(sessionPanel(page).getByText("Uke 37: Merkevare")).toBeVisible();
    await expect(sessionPanel(page).getByText("/ 3")).toBeVisible();
    expect(MERKEVARE_FRONTS).toContain(await cardFront(page).textContent());
    await page.keyboard.press(" ");
    await expect(page.getByText("SVAR", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="flashcard"] [data-slot="source-link"]')).toHaveText(/^merkevare\.pdf, side [2-4]$/);
    await expectNoAxeViolations(page);
  });

  test("Feilvei (rediger) – FR-27, UX-DR27: et kort er faglig feil, hun sjekker kilden og retter svaret med «Rediger» i bunnfeltet", async () => {
    const question = (await cardFront(page).textContent())!;
    await page.getByRole("button", { name: "Rediger" }).click();
    const dialog = page.getByRole("dialog", { name: "Rediger kortet" });
    await expect(dialog.getByLabel("Spørsmål")).toHaveValue(question);
    await expectNoAxeViolations(page);
    await dialog.getByLabel("Svar").fill("Klaras eget svar, sjekket mot kilden.");
    await dialog.getByRole("button", { name: "Lagre" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Klaras eget svar, sjekket mot kilden.")).toBeVisible();

    const cards = (await (await page.request.get(`/api/lectures/${merkevareId}/flashcards`)).json()) as {
      front: string;
      back: string;
    }[];
    expect(cards.find((card) => card.front === question)!.back).toBe("Klaras eget svar, sjekket mot kilden.");
    await expectNoAxeViolations(page);
  });

  test("Feilvei (slett) – FR-27, UX-DR22: hun sletter et feil kort med «Slett», bekrefter, og kortet er borte", async () => {
    const question = (await cardFront(page).textContent())!;
    await page.getByRole("button", { name: "Slett", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Slette kortet?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText(question)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    await dialog.getByRole("button", { name: "Slett kortet" }).click();
    await expect(dialog).toBeHidden();

    await expect(sessionPanel(page).getByText("/ 2")).toBeVisible();
    await expect(cardFront(page)).not.toHaveText(question);
    expect(await flashcardCountViaApi(page, merkevareId)).toBe(2);
    await expectNoAxeViolations(page);
  });

  test("Feilvei (Esc) – FR-56, UX-DR33: hun avslutter økten halvveis med Esc, og resultatet for det hun har gjort, vises og lagres", async () => {
    const before = saves.length;
    await page.keyboard.press(" ");
    await page.keyboard.press("1");
    const saved = page.waitForResponse((response) => new URL(response.url()).pathname === SAVE_PATH);
    await page.keyboard.press("Escape");
    expect((await saved).status()).toBe(204);

    await expect(page.getByRole("heading", { level: 2, name: "Avbrutt etter 1 av 2" })).toBeFocused();
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}/flashcards`);
    expect(saves).toHaveLength(before + 1);
    expect(saves.at(-1)!.postDataJSON()).toMatchObject({
      subject_id: subjectId,
      lecture_id: merkevareId,
      kind: "flashcards",
      aborted: true,
      answered: 1,
      correct: 0,
      wrong: 1,
    });
    await expectNoAxeViolations(page);

    // Esc again takes her back to the lecture, and nothing more is sent.
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(`/forelesninger/${merkevareId}`);
    await expect(createSection(page).getByText("2 kort", { exact: true })).toBeVisible();
    expect(saves).toHaveLength(before + 1);
  });
});
