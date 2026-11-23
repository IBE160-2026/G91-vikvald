import { expect, test } from "@playwright/test";

import { PASSWORD, createSection, dayFromToday, pdfFile, quizQuestion, quizRow, uniqueEmail } from "./brukerreiser/felles";

// Story 6.6: the core flow in one browser (NFR-15). It runs in the default
// project (Playwright's Chromium) like every other test, and in the projects
// `chrome`, `msedge` and `webkit` when E2E_BROWSERS names them (see
// playwright.config.ts), e.g. `E2E_BROWSERS=chrome npx playwright test --project=chrome`.
// The browser's name and version are noted on the test, for docs/testplan.md.

const NOTES = [
  "Merkevare er et navn som skiller et produkt fra andre.",
  "Posisjonering er plassen merket har i hodet til kunden.",
  "Lojalitet er at kunden velger merket igjen. Logo er merkets tegn.",
];

test("NFR-15: kjerneflyten i nettleseren: logg inn, nytt emne og forelesning, last opp PDF og godta vilkår, lag og øv på flashcards, lag og ta quiz, logg ut", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  testInfo.annotations.push({
    type: "Nettleser",
    description: `${testInfo.project.name} (${browserName}) ${browser.version()}`,
  });

  // An account exists; she logs in through the page.
  const email = uniqueEmail();
  const register = await page.request.post("/api/identity/register", { data: { email, password: PASSWORD } });
  expect(register.status()).toBe(201);
  await page.context().clearCookies();

  await page.goto("/");
  await expect(page).toHaveURL(/\/logg-inn$/);
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill(PASSWORD);
  await page.getByRole("button", { name: "Logg inn" }).click();
  await expect(page.locator("main h1")).toHaveText("Dine emner");

  // A new subject and lecture.
  await page.getByRole("button", { name: "Lag ditt første emne" }).click();
  const subjectDialog = page.getByRole("dialog", { name: "Nytt emne" });
  await subjectDialog.getByLabel("Navn").fill("Markedsføring");
  await subjectDialog.getByLabel("Eksamensdato").fill(dayFromToday(21).full);
  await subjectDialog.getByRole("button", { name: "Opprett emne" }).click();
  await expect(page.locator("main h1")).toHaveText("Markedsføring");

  await page.getByRole("button", { name: "Ny forelesning" }).click();
  const lectureDialog = page.getByRole("dialog", { name: "Ny forelesning" });
  await lectureDialog.getByLabel("Navn").fill("Uke 37: Merkevare");
  await lectureDialog.getByRole("button", { name: "Opprett forelesning" }).click();
  await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");

  // The PDF through «Velg PDF», and the terms at the first upload.
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Velg PDF" }).click();
  await (await chooser).setFiles(pdfFile("merkevare-notater.pdf", NOTES));
  const terms = page.getByRole("dialog", { name: "Før du laster opp" });
  await terms
    .getByRole("checkbox", { name: "Jeg har lest dette og laster bare opp materiale jeg har rett til å bruke." })
    .check();
  await terms.getByRole("button", { name: "Godta og last opp" }).click();
  await expect(page.getByRole("list", { name: "Filer" }).getByRole("listitem")).toHaveCount(1);

  // Flashcards: made and practised.
  await createSection(page).getByRole("button", { name: "Lag flashcards" }).click();
  await page.getByRole("dialog", { name: "Lag flashcards" }).getByRole("button", { name: "Lag flashcards" }).click();
  await expect(createSection(page).getByText("4 kort", { exact: true })).toBeVisible({ timeout: 15_000 });
  await createSection(page).getByRole("button", { name: "Øv nå" }).click();
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole("button", { name: "Snu kortet" }).click();
    await page.getByRole("button", { name: "Kunne", exact: true }).click();
  }
  await expect(page.getByRole("heading", { level: 2, name: "Du har gått gjennom alle 4 kortene" })).toBeVisible();
  await page.getByRole("link", { name: "Tilbake til forelesningen" }).click();

  // The quiz: made and taken.
  await quizRow(page).getByRole("button", { name: "Lag quiz" }).click();
  await page.getByRole("dialog", { name: "Lag quiz" }).getByRole("button", { name: "Lag quiz" }).click();
  await expect(quizRow(page).getByText("4 spørsmål", { exact: true })).toBeVisible({ timeout: 15_000 });
  await quizRow(page).getByRole("button", { name: "Øv nå" }).click();
  for (let number = 1; number <= 4; number += 1) {
    await expect(page.getByText(`SPØRSMÅL ${number} AV 4`)).toBeVisible();
    await quizQuestion(page).getByRole("radio").first().check();
    await page.getByRole("button", { name: "Bekreft svar" }).click();
    await page.getByRole("button", { name: number === 4 ? "Se resultatet" : "Neste spørsmål" }).click();
  }
  await expect(page.getByRole("heading", { level: 2, name: /av 4 riktige$/ })).toBeVisible();

  // Log out.
  await page.getByRole("button", { name: "Logg ut" }).click();
  await expect(page).toHaveURL(/\/logg-inn$/);
  await expect(page.locator("main h1")).toHaveText("Logg inn");
});
