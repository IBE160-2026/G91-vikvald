import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import {
  createLectureViaApi,
  createSection,
  createSubjectViaApi,
  expectNoAxeViolations,
  fileNamesViaApi,
  fileRows,
  flashcardCountViaApi,
  makeFlashcardsViaApi,
  makeModelCardsViaApi,
  makeQuizViaApi,
  pdfFile,
  quizQuestionsViaApi,
  quizRow,
  registerWithTermsViaApi,
  today,
  uploadViaApi,
} from "./felles";

// Flow 3 in EXPERIENCE.md («Brukerreiser (Key Flows)»), a support flow for FR-12 and FR-13.
// The flow starts on the lecture page (04) and has no login step of its own, so
// the account, subject, lecture, the old file and the flashcards are made
// through the API first. The old file gives 18 flashcards, 11 quiz questions
// and 2 model cards, as in the flow, and the other file one flashcard and one
// quiz question. The Flashcards row counts the model cards with the flashcards.
// The steps share one browser context and run in order, like one visit by Klara.
test.describe("FR-12, FR-13 / flyt 3: Klara rydder i filene", () => {
  test.describe.configure({ mode: "serial" });

  let context: BrowserContext;
  let page: Page;
  let lectureId: string;
  // 18 definition sentences, three to a page (a longer line would be cut off),
  // so the mock model makes 18 flashcards from the old file.
  const TERMS = [
    "Merkevare", "Logo", "Slagord", "Pris", "Rabatt", "Kampanje", "Segment", "Nisje", "Kanal",
    "Reklame", "Sponsing", "Produkt", "Kunde", "Behov", "Motiv", "Lojalitet", "Image", "Emballasje",
  ];
  // Two lists under the definitions on pages 1 and 2 give the 2 model cards
  // (AIDA with a mnemonic, the four P's without). The list lines have no «er»,
  // so they give no flashcards or quiz questions.
  const LISTS = ["\nDeler av AIDA\n- Attention\n- Interest\n- Desire\n- Action", "\nDe fire P-ene\n- Produkt\n- Pris\n- Plass\n- Promotion"];
  const OLD_PAGES = Array.from(
    { length: 6 },
    (_, index) =>
      TERMS.slice(index * 3, index * 3 + 3)
        .map((term) => `${term} er begrep ${TERMS.indexOf(term) + 1}.`)
        .join(" ") + (LISTS[index] ?? ""),
  );

  test.beforeAll(async ({ browser }, testInfo) => {
    testInfo.setTimeout(60_000);
    context = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
    page = await context.newPage();
    await registerWithTermsViaApi(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
    lectureId = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    // The old version (6 pages) and another file from the same lecture.
    await uploadViaApi(page, lectureId, pdfFile("merkevare-notater.pdf", OLD_PAGES));
    await uploadViaApi(page, lectureId, pdfFile("merkevare-lysark.pdf", ["Markedsplan er en plan for salget."]));
    // «Vanlig»: up to 20 cards, 18 from the old file and 1 from the slides.
    await makeFlashcardsViaApi(page, lectureId, 20, 19);
    // The quiz gives 19 questions the same way. Earlier, Klara deleted seven
    // bad questions from the old file during the quiz (FR-37), so 11 are left
    // from it, as in the flow, and 1 from the slides.
    await makeQuizViaApi(page, lectureId, 20, 19);
    const fromOldFile = (await quizQuestionsViaApi(page, "lectures", lectureId)).filter(
      (question) => question.source.file_name === "merkevare-notater.pdf",
    );
    expect(fromOldFile).toHaveLength(18);
    for (const question of fromOldFile.slice(0, 7)) {
      expect((await page.request.delete(`/api/quiz-questions/${question.id}`)).status()).toBe(204);
    }
    expect(await quizCount()).toBe(12);
    // «Lag modellkort» (story 7.1): the 2 model cards from the old file.
    await makeModelCardsViaApi(page, lectureId, 2);
  });

  async function quizCount(): Promise<number> {
    return (await quizQuestionsViaApi(page, "lectures", lectureId)).length;
  }

  const DELETES_TOO = "Dette sletter også 18 flashcards, 11 quizspørsmål og 2 modellkort laget fra fila.";

  test.afterAll(async () => {
    await context.close();
  });

  test("Steg 1 – FR-8, UX-DR16: forelesningssiden (04) viser den gamle versjonen av fila", async () => {
    await page.goto(`/forelesninger/${lectureId}`);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 7 sider")).toBeVisible();
    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("merkevare-notater.pdf");
    await expect(fileRows(page).nth(0)).toContainText(`6 sider · lastet opp ${(await today(page)).dayMonth}`);
    await expect(fileRows(page).nth(0).getByRole("button", { name: "Slett merkevare-notater.pdf" })).toBeVisible();
    await expect(fileRows(page).nth(0).getByRole("button", { name: "Erstatt merkevare-notater.pdf" })).toBeVisible();
    await expect(createSection(page).getByText("21 kort", { exact: true })).toBeVisible();
    await expect(quizRow(page).getByText("12 spørsmål", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 2 – FR-12, UX-DR22: «Slett» på fila åpner dialogen (14) som viser fila, at 18 flashcards, 11 quizspørsmål og 2 modellkort slettes sammen med den, og at det ikke kan angres", async () => {
    await page.getByRole("button", { name: "Slett merkevare-notater.pdf" }).click();
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("merkevare-notater.pdf")).toBeVisible();
    await expect(dialog.getByText("6 sider · Uke 37: Merkevare")).toBeVisible();
    await expect(dialog.getByText(DELETES_TOO)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Slett fila" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 3 – FR-12, UX-DR21, UX-DR22: fokus står på «Avbryt», hun trykker Esc, og ingenting er slettet", async () => {
    const dialog = page.getByRole("dialog", { name: "Slette fila?" });
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Slett merkevare-notater.pdf" })).toBeFocused();
    await expect(fileRows(page)).toHaveCount(2);
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-notater.pdf", "merkevare-lysark.pdf"]);
    expect(await flashcardCountViaApi(page, lectureId)).toBe(19);
    expect(await quizCount()).toBe(12);
    await expect(createSection(page).getByText("21 kort", { exact: true })).toBeVisible();
    await expect(quizRow(page).getByText("12 spørsmål", { exact: true })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("Steg 4 – FR-13, UX-DR21, UX-DR22: «Erstatt» og den nye fila, bekreftelsen sier hva som slettes", async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Erstatt merkevare-notater.pdf" }).click();
    await (await chooser).setFiles(pdfFile("merkevare-notater-v2.pdf", ["Ny side en", "Ny side to", "Ny side tre"]));

    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Avbryt" })).toBeFocused();
    await expect(dialog.getByText("merkevare-notater.pdf", { exact: true })).toBeVisible();
    await expect(dialog.getByText("6 sider · Uke 37: Merkevare")).toBeVisible();
    await expect(dialog.getByText("Erstattes med merkevare-notater-v2.pdf.")).toBeVisible();
    await expect(dialog.getByText(DELETES_TOO)).toBeVisible();
    await expect(dialog.getByText("Det kan ikke angres.")).toBeVisible();
    await expectNoAxeViolations(page);
    // Nothing is replaced before she confirms.
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-notater.pdf", "merkevare-lysark.pdf"]);
    expect(await flashcardCountViaApi(page, lectureId)).toBe(19);
    expect(await quizCount()).toBe(12);
  });

  test("Steg 5 – FR-13, FR-16, FR-42, UX-DR16, UX-DR18: hun bekrefter, den nye fila står i lista, og tallene for flashcards, modellkort og quiz i «Lag og øv» viser hva som er igjen", async () => {
    const dialog = page.getByRole("dialog", { name: "Erstatte fila?" });
    await dialog.getByRole("button", { name: "Erstatt fila" }).click();
    await expect(dialog).toHaveCount(0);

    await expect(fileRows(page)).toHaveCount(2);
    await expect(fileRows(page).nth(0)).toContainText("merkevare-lysark.pdf");
    await expect(fileRows(page).nth(1)).toContainText("merkevare-notater-v2.pdf");
    await expect(fileRows(page).nth(1)).toContainText(`3 sider · lastet opp ${(await today(page)).dayMonth}`);
    await expect(page.getByRole("button", { name: "Slett merkevare-notater.pdf" })).toHaveCount(0);
    await expect(page.getByText("Forelesning fredag 11.09.2026 · 2 filer · 4 sider")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Filer" })).toBeFocused();
    expect(await fileNamesViaApi(page, lectureId)).toEqual(["merkevare-lysark.pdf", "merkevare-notater-v2.pdf"]);

    // The 18 cards, 11 questions and 2 model cards from the old file are gone;
    // one card and one question from the slides are left (the row's count
    // includes model cards, so 1 kort), and she can make new content.
    const section = createSection(page);
    await expect(section.getByText("1 kort", { exact: true })).toBeVisible();
    expect(await flashcardCountViaApi(page, lectureId)).toBe(1);
    expect((await (await page.request.get(`/api/lectures/${lectureId}/content-counts`)).json()).model_cards).toBe(0);
    await expect(section.getByRole("button", { name: "Lag flere" })).toBeEnabled();
    await expect(section.getByRole("button", { name: "Øv nå" })).toBeEnabled();
    const quiz = quizRow(page);
    await expect(quiz.getByText("1 spørsmål", { exact: true })).toBeVisible();
    expect(await quizCount()).toBe(1);
    await expect(quiz.getByRole("button", { name: "Lag flere" })).toBeEnabled();
    await expect(quiz.getByRole("button", { name: "Øv nå" })).toBeEnabled();
    await expectNoAxeViolations(page);
  });
});
