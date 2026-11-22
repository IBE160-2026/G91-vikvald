import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const PASSWORD = "hemmelig1";
const INTRO = "Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.";

function uniqueEmail(): string {
  return `klara-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@eksempel.no`;
}

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

// The focus ring from DESIGN.md: 2 px ink with 2 px space (same check as innlogget.spec.ts).
async function expectFocusRing(element: Locator) {
  const ring = await element.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor };
  });
  expect(ring).toEqual({ style: "solid", width: "2px", offset: "2px", color: "rgb(21, 24, 31)" });
}

// Presses Tab until the element has focus (keyboard only, no clicks).
async function tabTo(page: Page, element: Locator, maxPresses = 20) {
  for (let i = 0; i < maxPresses; i += 1) {
    await page.keyboard.press("Tab");
    if (await element.evaluate((el) => el === document.activeElement)) return;
  }
  throw new Error("Tab never reached the element");
}

// Registers through the API; the login cookie lands in the page's browser context.
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

async function subjectCount(page: Page): Promise<number> {
  return (await (await page.request.get("/api/subjects")).json()).length;
}

async function errorTextFor(page: Page, label: string): Promise<string | null> {
  const field = page.getByLabel(label, { exact: true });
  const id = await field.getAttribute("aria-describedby");
  return id ? page.locator(`[id="${id}"]`).textContent() : null;
}

test.describe("Emner (story 2.1)", () => {
  test("UX-DR15: ny bruker ser setningen og «Lag ditt første emne», ingen liste, uten axe-brudd", async ({ page }) => {
    await registerNewUser(page);
    await page.goto("/");
    await expect(page).toHaveTitle("Dine emner – Studiekamerat");
    await expect(page.locator("main h1")).toHaveText("Dine emner");
    await expect(page.getByText(/^(Høst|Vår)semesteret \d{4} · \S+ \d{1,2}\. \S+$/)).toBeVisible();
    await expect(page.getByText(INTRO)).toBeVisible();
    await expect(page.getByRole("button", { name: "Lag ditt første emne" })).toBeVisible();
    await expect(page.locator("main ul, main li, main h2, main nav")).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test("UX-DR21: dialogen åpnet med tastatur: resten er inert, Esc lukker uten nytt emne, fokus tilbake", async ({
    page,
  }) => {
    await registerNewUser(page);
    await page.goto("/");
    const opener = page.getByRole("button", { name: "Lag ditt første emne" });
    await expect(opener).toBeVisible();
    // Logo, «Konto», «Logg ut», then the button.
    for (let i = 0; i < 4; i += 1) await page.keyboard.press("Tab");
    await expect(opener).toBeFocused();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Nytt emne" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Navn")).toBeFocused();
    await expect(dialog.getByLabel("Eksamensdato")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Opprett emne" })).toBeVisible();
    // Everything outside the dialog is inert while it is open.
    expect(await page.locator("main").evaluate((main) => main.closest("[inert]") !== null)).toBe(true);
    expect(await page.locator("header").evaluate((header) => header.closest("[inert]") !== null)).toBe(true);
    await expectNoAxeViolations(page);

    await dialog.getByLabel("Navn").fill("Halvveis");
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
    expect(await page.locator("main").evaluate((main) => main.closest("[inert]") !== null)).toBe(false);
    expect(await subjectCount(page)).toBe(0);
  });

  test("FR-6: feil i dialogen, så opprett med Enter: emnesiden med sidemeny og aria-current, uten axe-brudd", async ({
    page,
  }) => {
    await registerNewUser(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Lag ditt første emne" }).click();
    const dialog = page.getByRole("dialog", { name: "Nytt emne" });

    // Empty name and an impossible date: both messages, focus on the first field.
    await dialog.getByLabel("Eksamensdato").fill("31.02.2026");
    await dialog.getByRole("button", { name: "Opprett emne" }).click();
    await expect(dialog.getByLabel("Navn")).toBeFocused();
    await expect(dialog.getByLabel("Navn")).toHaveAttribute("aria-invalid", "true");
    expect(await errorTextFor(page, "Navn")).toBe("Skriv inn et navn.");
    expect(await errorTextFor(page, "Eksamensdato")).toBe("Skriv inn eksamensdatoen, for eksempel 04.12.2026.");
    await expectNoAxeViolations(page);
    expect(await subjectCount(page)).toBe(0);

    await dialog.getByLabel("Navn").fill(" Markedsføring ");
    await dialog.getByLabel("Eksamensdato").fill("04.12.2026");
    await dialog.getByLabel("Eksamensdato").press("Enter");

    await expect(page).toHaveURL(/\/emner\/[0-9a-f-]{36}$/);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    await expect(page.getByText("Eksamen fredag 04.12.2026")).toBeVisible();
    await expect(page).toHaveTitle("Markedsføring – Studiekamerat");
    await expect(page.getByRole("button", { name: "Ny forelesning" })).toBeEnabled();
    await expect(page.getByText("Ingen forelesninger ennå.")).toBeVisible();

    const nav = page.getByRole("navigation", { name: "Emner" });
    const current = nav.getByRole("link", { name: "Markedsføring" });
    await expect(current).toHaveAttribute("aria-current", "page");
    expect((await nav.boundingBox())?.width).toBe(288);
    await expectNoAxeViolations(page);
  });

  test("FR-6, UX-DR12: forsiden viser emnekortene i opprettingsrekkefølge med prikk, navn, «Åpne ›» og fremdrift, og eksamenslinja, uten sidemeny", async ({
    page,
  }) => {
    await registerNewUser(page);
    const first = await createSubjectViaApi(page, "Markedsføring", "2026-12-04");
    const second = await createSubjectViaApi(page, "Samfunnsøkonomi", "2026-12-11");
    await page.goto("/");

    // One subject card per subject (story 5.4), the exam date in the exam line over them.
    const items = page.locator("main li");
    await expect(items).toHaveCount(2);
    await expect(items.nth(0).getByRole("heading", { level: 2 })).toHaveText("Markedsføring");
    await expect(items.nth(0).getByRole("link", { name: "Åpne Markedsføring" })).toHaveAttribute("href", `/emner/${first}`);
    await expect(items.nth(0)).toContainText("Ingen forelesninger ennå");
    await expect(items.nth(1).getByRole("link", { name: "Åpne Samfunnsøkonomi" })).toHaveAttribute(
      "href",
      `/emner/${second}`,
    );
    await expect(items.locator('[aria-hidden="true"][data-color-index]')).toHaveCount(2);
    const examLines = page.locator('main [role="listitem"]');
    await expect(examLines.nth(0)).toContainText("Markedsføring");
    await expect(examLines.nth(0)).toContainText(/Eksamen (var )?04\.12/);
    await expect(examLines.nth(1)).toContainText("Samfunnsøkonomi");
    await expect(examLines.nth(1)).toContainText(/Eksamen (var )?11\.12/);
    await expect(page.locator("nav")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Nytt emne" })).toBeVisible();
    await expect(page.getByText(INTRO)).toHaveCount(0);
    await expectNoAxeViolations(page);

    // «Nytt emne» is reached with Tab, has the focus ring and opens the same dialog with Enter.
    const newSubject = page.getByRole("button", { name: "Nytt emne" });
    await tabTo(page, newSubject);
    await expectFocusRing(newSubject);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Nytt emne" })).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Navn")).toBeFocused();
  });

  test("FR-6: nytt navn og ny eksamensdato med bare tastatur vises i h1, linja og sidemenyen uten omlasting", async ({
    page,
  }) => {
    await registerNewUser(page);
    const id = await createSubjectViaApi(page, "Markedsføring");
    await createSubjectViaApi(page, "Samfunnsøkonomi");
    await page.goto(`/emner/${id}`);
    await expect(page.locator("main h1")).toHaveText("Markedsføring");
    // A marker on window disappears if the page is reloaded.
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));

    const rename = page.getByRole("button", { name: "Nytt navn" });
    await tabTo(page, rename);
    await expectFocusRing(rename);
    await page.keyboard.press("Enter");
    const nameDialog = page.getByRole("dialog", { name: "Nytt navn" });
    await expect(nameDialog.getByLabel("Navn")).toHaveValue("Markedsføring");
    await expect(nameDialog.getByLabel("Navn")).toBeFocused();
    await expectNoAxeViolations(page);
    await nameDialog.getByLabel("Navn").fill("Markedsføring og merkevare");
    await page.keyboard.press("Enter");
    await expect(nameDialog).toHaveCount(0);
    await expect(rename).toBeFocused();
    await expect(page.locator("main h1")).toHaveText("Markedsføring og merkevare");
    const nav = page.getByRole("navigation", { name: "Emner" });
    await expect(nav.getByRole("link", { name: "Markedsføring og merkevare" })).toHaveAttribute("aria-current", "page");
    await expect(page).toHaveTitle("Markedsføring og merkevare – Studiekamerat");

    const changeDate = page.getByRole("button", { name: "Endre eksamensdato" });
    await tabTo(page, changeDate);
    await expectFocusRing(changeDate);
    await page.keyboard.press("Enter");
    const dateDialog = page.getByRole("dialog", { name: "Endre eksamensdato" });
    await expect(dateDialog.getByLabel("Eksamensdato")).toBeFocused();
    await expect(dateDialog.getByLabel("Eksamensdato")).toHaveValue("04.12.2026");
    await dateDialog.getByLabel("Eksamensdato").fill("11.12.2026");
    await page.keyboard.press("Enter");
    await expect(dateDialog).toHaveCount(0);
    await expect(changeDate).toBeFocused();
    await expect(page.getByText("Eksamen fredag 11.12.2026")).toBeVisible();

    expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);

    // The sidebar link to the other subject is reached with Tab, has the focus ring and opens with Enter.
    const otherLink = nav.getByRole("link", { name: "Samfunnsøkonomi" });
    await tabTo(page, otherLink);
    await expectFocusRing(otherLink);
    await page.keyboard.press("Enter");
    await expect(page.locator("main h1")).toHaveText("Samfunnsøkonomi");
    await expect(nav.getByRole("link", { name: "Samfunnsøkonomi" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Markedsføring og merkevare" })).not.toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("FR-4: andres emne og ukjent id gir «Fant ikke siden», uten axe-brudd", async ({ page, browser }) => {
    const ola = await browser.newContext({ baseURL: test.info().project.use.baseURL });
    const olaPage = await ola.newPage();
    await registerNewUser(olaPage);
    const olasSubject = await createSubjectViaApi(olaPage, "Olas emne");
    await ola.close();

    await registerNewUser(page);
    for (const id of [olasSubject, "00000000-0000-0000-0000-000000000000", "ikke-en-id"]) {
      await page.goto(`/emner/${id}`);
      await expect(page.locator("main h1")).toHaveText("Fant ikke siden");
      await expect(page.getByText("Olas emne")).toHaveCount(0);
    }
    await expectNoAxeViolations(page);
  });
});
