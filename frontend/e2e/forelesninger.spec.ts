import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const PASSWORD = "hemmelig1";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The focus ring from DESIGN.md: 2 px ink with 2 px space (same check as emner.spec.ts).
async function expectFocusRing(element: Locator) {
  const ring = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor };
  });
  expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px", color: "rgb(21, 24, 31)" });
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 30) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

async function registerNewUser(page: Page) {
  const response = await page.request.post("/api/identity/register", {
    data: { email: uniqueEmail(), password: PASSWORD },
  });
  expect(response.status()).toBe(201);
}

async function createSubjectViaApi(page: Page, name: string, examDate = "2026-12-04"): Promise<string> {
  const response = await page.request.post("/api/subjects", { data: { name, exam_date: examDate } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function createLectureViaApi(page: Page, subjectId: string, name: string, date: string): Promise<string> {
  const response = await page.request.post(`/api/subjects/${subjectId}/lectures`, { data: { name, date } });
  expect(response.status()).toBe(201);
  return (await response.json()).id;
}

async function lectureNamesFromApi(page: Page, subjectId: string): Promise<string[]> {
  const lectures: { name: string }[] = await (await page.request.get(`/api/subjects/${subjectId}/lectures`)).json();
  return lectures.map((lecture) => lecture.name);
}

async function errorTextFor(dialog: Locator, label: string): Promise<string | null> {
  const field = dialog.getByLabel(label, { exact: true });
  const id = await field.getAttribute("aria-describedby");
  return id ? dialog.page().locator(`[id="${id}"]`).textContent() : null;
}

// The lecture links in the sidebar, in the order they are shown.
function sidebarLectures(page: Page): Locator {
  return page.getByRole("navigation", { name: "Emner" }).locator('a[href^="/forelesninger/"]');
}

test.describe("Forelesninger (story 2.2)", () => {
  test("FR-7: emne uten forelesninger, så «Ny forelesning» med dagens dato gir forelesningssiden, uten axe-brudd", async ({
    page,
  }) => {
    await registerNewUser(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring");

    // The front page's card says there are no lectures.
    await page.goto("/");
    await expect(page.locator("main li")).toContainText("Ingen forelesninger ennå");

    await page.goto(`/emner/${subjectId}`);
    await expect(page.getByRole("heading", { level: 2 })).toHaveText("Forelesninger etter dato");
    await expect(page.getByText("Ingen forelesninger ennå.")).toBeVisible();
    await expect(page.locator("main table")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Emner" });
    await expect(nav.getByRole("button", { name: "Markedsføring" })).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Markedsføring" })).toContainText("0");
    await expect(sidebarLectures(page)).toHaveCount(0);
    await expectNoAxeViolations(page);

    await page.getByRole("button", { name: "Ny forelesning" }).click();
    const dialog = page.getByRole("dialog", { name: "Ny forelesning" });
    const today = await page.evaluate(() => {
      const now = new Date();
      const pad = (value: number) => String(value).padStart(2, "0");
      return `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()}`;
    });
    await expect(dialog.getByLabel("Dato")).toHaveValue(today);
    await expect(dialog.getByLabel("Navn")).toBeFocused();

    // Empty name and an impossible date: both messages, focus on the first field.
    await dialog.getByLabel("Dato").fill("31.02.2026");
    await dialog.getByRole("button", { name: "Opprett forelesning" }).click();
    await expect(dialog.getByLabel("Navn")).toBeFocused();
    expect(await errorTextFor(dialog, "Navn")).toBe("Skriv inn et navn.");
    expect(await errorTextFor(dialog, "Dato")).toBe("Skriv inn datoen, for eksempel 11.09.2026.");
    await expectNoAxeViolations(page);
    expect(await lectureNamesFromApi(page, subjectId)).toEqual([]);

    await dialog.getByLabel("Navn").fill(" Uke 37: Merkevare ");
    await dialog.getByLabel("Dato").fill("11.09.2026");
    await dialog.getByLabel("Dato").press("Enter");

    await expect(page).toHaveURL(/\/forelesninger\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");
    await expect(page.getByText("Forelesning fredag 11.09.2026")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nytt navn" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Endre dato" })).toBeVisible();
    await expect(page).toHaveTitle("Uke 37: Merkevare – Studiekamerat");

    const current = nav.getByRole("link", { name: "Uke 37: Merkevare" });
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Markedsføring" })).not.toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Markedsføring" })).toContainText("1");
    await expectNoAxeViolations(page);

    await page.goto("/");
    await expect(page.locator("main li")).toContainText("0 av 1 forelesning øvd");
  });

  test("FR-15: tabellen og sidemenyen har API-rekkefølgen, ukenummer og hul prikk, og raden lenker til 04, uten axe-brudd", async ({
    page,
  }) => {
    await registerNewUser(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring");
    await createLectureViaApi(page, subjectId, "Uke 38: Prising", "2026-09-18");
    const first = await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    await createLectureViaApi(page, subjectId, "Uke 37: Ekstra", "2026-09-11");
    const order = await lectureNamesFromApi(page, subjectId);
    expect(order).toEqual(["Uke 37: Merkevare", "Uke 37: Ekstra", "Uke 38: Prising"]);

    await page.goto(`/emner/${subjectId}`);
    const rows = page.locator("main tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(page.locator("main thead th")).toHaveText(["Dato", "Forelesning", "Filer", "Kort", "Quiz", "Status"]);
    await expect(rows.locator("td:first-child")).toHaveText(["11.09", "11.09", "18.09"]);
    await expect(rows.getByRole("link")).toHaveText(order);
    await expect(rows.nth(0)).toHaveCSS("height", "44px");

    await expect(sidebarLectures(page)).toHaveCount(3);
    for (let i = 0; i < order.length; i += 1) {
      const link = sidebarLectures(page).nth(i);
      // The name ends with the status dot's name (story 5.1, UX-DR7).
      await expect(link).toHaveAccessibleName(`${order[i]} Ikke øvd ennå`);
      await expect(link).toHaveAccessibleDescription(i < 2 ? "Uke 37" : "Uke 38");
      await expect(link.getByRole("img", { name: "Ikke øvd ennå" })).toHaveAttribute("data-status", "not-practised");
      await expect(link).toHaveCSS("height", "32px");
    }
    await expect(page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Markedsføring" })).toContainText("3");
    await expectNoAxeViolations(page);

    // A click anywhere on the row (here on the date, at the far left) opens the
    // lecture: the link's ::after covers the whole row.
    await rows.nth(0).click({ position: { x: 24, y: 22 } });
    await expect(page).toHaveURL(new RegExp(`/forelesninger/${first}$`));
    await expect(page.locator("main h1")).toHaveText("Uke 37: Merkevare");

    await page.goto("/");
    await expect(page.locator("main li")).toContainText("0 av 3 forelesninger øvd");
  });

  test("UX-DR7: et emne åpnes og lukkes med pilknappen og bare tastatur, med aria-expanded og fokusring", async ({
    page,
  }) => {
    await registerNewUser(page);
    const shown = await createSubjectViaApi(page, "Markedsføring");
    const other = await createSubjectViaApi(page, "Samfunnsøkonomi");
    await createLectureViaApi(page, other, "Uke 36: Tilbud og etterspørsel", "2026-09-04");
    await page.goto(`/emner/${shown}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");

    const nav = page.getByRole("navigation", { name: "Emner" });
    const toggle = nav.getByRole("button", { name: "Samfunnsøkonomi" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebarLectures(page)).toHaveCount(0);

    await tabTo(page, toggle);
    await expectFocusRing(toggle);
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(nav.getByRole("link", { name: "Uke 36: Tilbud og etterspørsel" })).toBeVisible();
    await expect(toggle).toBeFocused();
    await expectNoAxeViolations(page);

    await page.keyboard.press("Space");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(sidebarLectures(page)).toHaveCount(0);

    // The subject of the page can be closed and opened too.
    const shownToggle = nav.getByRole("button", { name: "Markedsføring" });
    await expect(shownToggle).toHaveAttribute("aria-expanded", "true");
    await shownToggle.focus();
    await page.keyboard.press("Enter");
    await expect(shownToggle).toHaveAttribute("aria-expanded", "false");
  });

  test("FR-15: ny dato på forelesningssiden flytter raden i sidemenyen og tabellen uten omlasting", async ({ page }) => {
    await registerNewUser(page);
    const subjectId = await createSubjectViaApi(page, "Markedsføring");
    await createLectureViaApi(page, subjectId, "Uke 37: Merkevare", "2026-09-11");
    const later = await createLectureViaApi(page, subjectId, "Uke 38: Prising", "2026-09-18");

    await page.goto(`/forelesninger/${later}`);
    await expect(page.locator("main h1")).toHaveText("Uke 38: Prising");
    await expect(sidebarLectures(page)).toHaveText(["Uke 37: Merkevare", "Uke 38: Prising"].map((n) => new RegExp(n)));
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
    await expectNoAxeViolations(page);

    const changeDate = page.getByRole("button", { name: "Endre dato" });
    await tabTo(page, changeDate);
    await expectFocusRing(changeDate);
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Endre dato" });
    await expect(dialog.getByLabel("Dato")).toBeFocused();
    await expect(dialog.getByLabel("Dato")).toHaveValue("18.09.2026");
    await expectNoAxeViolations(page);
    await dialog.getByLabel("Dato").fill("21.08.2026");
    await page.keyboard.press("Enter");
    await expect(dialog).toHaveCount(0);
    await expect(changeDate).toBeFocused();

    await expect(page.getByText("Forelesning fredag 21.08.2026")).toBeVisible();
    await expect(sidebarLectures(page)).toHaveText(["Uke 38: Prising", "Uke 37: Merkevare"].map((n) => new RegExp(n)));
    await expect(sidebarLectures(page).first()).toHaveAccessibleDescription("Uke 34");
    await expect(sidebarLectures(page).first()).toHaveAttribute("aria-current", "page");

    // «Nytt navn» with only the keyboard: the new name in h1, the tab title and the sidebar.
    const rename = page.getByRole("button", { name: "Nytt navn" });
    await tabTo(page, rename);
    await expectFocusRing(rename);
    await page.keyboard.press("Enter");
    const nameDialog = page.getByRole("dialog", { name: "Nytt navn" });
    await expect(nameDialog.getByLabel("Navn")).toBeFocused();
    await expect(nameDialog.getByLabel("Navn")).toHaveValue("Uke 38: Prising");
    await expectNoAxeViolations(page);
    await nameDialog.getByLabel("Navn").fill("Uke 34: Prising");
    await page.keyboard.press("Enter");
    await expect(nameDialog).toHaveCount(0);
    await expect(rename).toBeFocused();
    await expect(page.locator("main h1")).toHaveText("Uke 34: Prising");
    await expect(page).toHaveTitle("Uke 34: Prising – Studiekamerat");
    await expect(sidebarLectures(page)).toHaveText(["Uke 34: Prising", "Uke 37: Merkevare"].map((n) => new RegExp(n)));

    await page.getByRole("navigation", { name: "Emner" }).getByRole("link", { name: "Markedsføring" }).click();
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expect(page.locator("main tbody tr").getByRole("link")).toHaveText(["Uke 34: Prising", "Uke 37: Merkevare"]);
    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  });

  test("FR-4: andres forelesning, ukjent og ugyldig id gir «Fant ikke siden», uten axe-brudd", async ({
    page,
    browser,
  }) => {
    const ola = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const olaPage = await ola.newPage();
    await registerNewUser(olaPage);
    const olasLecture = await createLectureViaApi(
      olaPage,
      await createSubjectViaApi(olaPage, "Olas emne"),
      "Olas forelesning",
      "2026-09-11",
    );
    await ola.close();

    await registerNewUser(page);
    for (const id of [olasLecture, "00000000-0000-0000-0000-000000000000", "ikke-en-id"]) {
      await page.goto(`/forelesninger/${id}`);
      await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
      await expect(page.getByText("Olas forelesning")).toHaveCount(0);
    }
    await expectNoAxeViolations(page);
  });
});
