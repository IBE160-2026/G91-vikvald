// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RegisterPage } from "./pages/register-page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RegisterPage />
    </QueryClientProvider>,
  );
  return {
    email: screen.getByLabelText("E-post") as HTMLInputElement,
    password: screen.getByLabelText("Passord") as HTMLInputElement,
    submit: screen.getByRole("button", { name: "Opprett konto" }),
  };
}

function fillAndSubmit(email: string, password: string) {
  const fields = renderPage();
  fireEvent.change(fields.email, { target: { value: email } });
  fireEvent.change(fields.password, { target: { value: password } });
  fireEvent.click(fields.submit);
  return fields;
}

function errorFor(input: HTMLInputElement): string | null | undefined {
  const id = input.getAttribute("aria-describedby");
  return id ? document.getElementById(id)?.textContent : null;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe("siden «Opprett konto»", () => {
  it("FR-3: viser h1, undertittel, feltene, «Vis» og hovedknappen", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Opprett konto");
    expect(screen.getByText("Fra forelesningsnotat til eksamen.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vis" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Opprett konto" }).getAttribute("type")).toBe("submit");
    expect(document.querySelector("form")?.noValidate).toBe(true);
  });

  it("UX-DR25: «Har du konto?» med lenken «Logg inn» til /logg-inn, etter knappen", () => {
    const { submit } = renderPage();
    expect(screen.getByText("Har du konto?")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Logg inn" });
    expect(link.getAttribute("href")).toBe("/logg-inn");
    expect(submit.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("NFR-11: ugyldig e-post stopper kallet, viser meldingen og flytter fokus dit", async () => {
    const { email } = fillAndSubmit("klara", "hemmelig1");
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(errorFor(email)).toBe("Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NFR-11: for kort passord stopper kallet og flytter fokus til passordet", async () => {
    const { password } = fillAndSubmit("klara@eksempel.no", "1234567");
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect(errorFor(password)).toBe("Passordet må ha minst 8 tegn.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("AR-10: 37 «æ» stopper kallet med «for langt»", async () => {
    const { password } = fillAndSubmit("klara@eksempel.no", "æ".repeat(37));
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect(errorFor(password)).toBe("Passordet er for langt. Bruk færre tegn.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("NFR-11: med to feil får det første feltet fokus", async () => {
    const { email, password } = fillAndSubmit("klara", "kort");
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(errorFor(email)).toBeTruthy();
    expect(errorFor(password)).toBeTruthy();
  });

  it("FR-3: gyldig skjema sender trimmet e-post og uendret passord, og går til /", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "1", email: "klara@eksempel.no" }));
    fillAndSubmit("  Klara@Eksempel.NO ", " hemmelig1 ");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/identity/register");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ email: "klara@eksempel.no", password: " hemmelig1 " });
  });

  it("FR-3: to innsendinger mens kallet pågår gir bare ett kall, og knappen er aria-disabled", async () => {
    let resolve: (response: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (resolve = r)));
    const { submit } = fillAndSubmit("klara@eksempel.no", "hemmelig1");
    fireEvent.click(submit);
    await waitFor(() => expect(submit.getAttribute("aria-disabled")).toBe("true"));
    fireEvent.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolve(jsonResponse(201, { id: "1", email: "klara@eksempel.no" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    // Still blocked while the page navigates away.
    fireEvent.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("FR-3: 409 fra API-et vises under e-postfeltet med fokus dit", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { error: { code: "EMAIL_ALREADY_REGISTERED", details: {} } }),
    );
    const { email } = fillAndSubmit("klara@eksempel.no", "hemmelig1");
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(errorFor(email)).toBe(
      "Det finnes allerede en konto med denne e-postadressen. Logg inn i stedet.",
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("NFR-11: PASSWORD_TOO_LONG fra API-et vises under passordfeltet", async () => {
    fetchMock.mockResolvedValue(jsonResponse(422, { error: { code: "PASSWORD_TOO_LONG", details: {} } }));
    const { password } = fillAndSubmit("klara@eksempel.no", "hemmelig1");
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect(errorFor(password)).toBe("Passordet er for langt. Bruk færre tegn.");
  });

  it("FR-1: 500 gir reserveteksten i et varsel over knappen", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }));
    const { submit } = fillAndSubmit("klara@eksempel.no", "hemmelig1");
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Noe gikk galt. Prøv igjen.");
    expect(alert.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("FR-1: nettverksfeil gir reserveteksten i varselet", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    fillAndSubmit("klara@eksempel.no", "hemmelig1");
    expect((await screen.findByRole("alert")).textContent).toBe("Noe gikk galt. Prøv igjen.");
  });

  it("FR-1: etter en feil kan skjemaet sendes igjen, og varselet forsvinner når et felt endres", async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } }));
    const { email, submit } = fillAndSubmit("klara@eksempel.no", "hemmelig1");
    await screen.findByRole("alert");
    expect(submit.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.change(email, { target: { value: "klara@eksempel.n" } });
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("NFR-11: når feltet endres, forsvinner den gamle meldingen", async () => {
    const { email } = fillAndSubmit("klara", "hemmelig1");
    await waitFor(() => expect(errorFor(email)).toBeTruthy());
    fireEvent.change(email, { target: { value: "klara@" } });
    expect(email.hasAttribute("aria-invalid")).toBe(false);
  });
});
