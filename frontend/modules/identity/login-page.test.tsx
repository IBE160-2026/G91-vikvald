// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "./pages/login-page";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const fetchMock = vi.fn<typeof fetch>();
const WRONG = "Feil e-post eller passord. Sjekk at Caps Lock er av.";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LoginPage />
    </QueryClientProvider>,
  );
  return {
    email: screen.getByLabelText("E-post") as HTMLInputElement,
    password: screen.getByLabelText("Passord") as HTMLInputElement,
    submit: screen.getByRole("button", { name: "Logg inn" }),
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

describe("siden «Logg inn»", () => {
  it("FR-3: viser h1, undertittel, feltene, «Vis», hovedknappen og lenken til «Opprett konto»", () => {
    const { password } = renderPage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Logg inn");
    expect(screen.getByText("Fra forelesningsnotat til eksamen.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Vis" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Logg inn" }).getAttribute("type")).toBe("submit");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    expect(document.querySelector("form")?.noValidate).toBe(true);
    expect(screen.getByText("Ny her?")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Opprett konto" }).getAttribute("href")).toBe("/registrer");
  });

  it("UX-DR25: lenken står etter knappen, så tastaturet når den sist", () => {
    const { submit } = renderPage();
    const link = screen.getByRole("link", { name: "Opprett konto" });
    expect(submit.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("NFR-11: ugyldig e-post stopper kallet, viser meldingen under e-postfeltet og flytter fokus dit", async () => {
    const { email, password } = fillAndSubmit("klara", "hemmelig1");
    await waitFor(() => expect(document.activeElement).toBe(email));
    expect(errorFor(email)).toBe("Skriv inn en gyldig e-postadresse, for eksempel klara@eksempel.no.");
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(password.hasAttribute("aria-invalid")).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("FR-3: kort passord stoppes ikke i nettleseren (backenden svarer)", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", details: {} } }));
    fillAndSubmit("klara@eksempel.no", "kort");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("FR-3: 401 gir meldingen under passordfeltet med feilkant og fokus dit", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", details: {} } }));
    const { email, password } = fillAndSubmit("klara@eksempel.no", "hemmelig2");
    await waitFor(() => expect(document.activeElement).toBe(password));
    expect(errorFor(password)).toBe(WRONG);
    expect(password.getAttribute("aria-invalid")).toBe("true");
    expect(password.className).toContain("border-danger");
    // The e-mail field is not marked: the message does not say which one is wrong.
    expect(email.hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("FR-3: gyldig skjema sender trimmet e-post og uendret passord til /api/identity/login, og går til /", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: "1", email: "klara@eksempel.no" }));
    fillAndSubmit("  Klara@Eksempel.NO ", " hemmelig1 ");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/identity/login");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
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

    resolve(jsonResponse(200, { id: "1", email: "klara@eksempel.no" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    // Still blocked while the page navigates away.
    fireEvent.click(submit);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("FR-3: etter feil passord kan hun prøve igjen, og meldingen forsvinner når passordet endres", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", details: {} } }));
    const { password, submit } = fillAndSubmit("klara@eksempel.no", "hemmelig2");
    await waitFor(() => expect(errorFor(password)).toBe(WRONG));
    expect(submit.hasAttribute("aria-disabled")).toBe(false);
    fireEvent.change(password, { target: { value: "hemmelig1" } });
    expect(password.hasAttribute("aria-invalid")).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("NFR-11: etter 401 forsvinner meldingen under passordet når e-posten endres", async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: { code: "INVALID_CREDENTIALS", details: {} } }));
    const { email, password } = fillAndSubmit("klara@eksempel.no", "hemmelig2");
    await waitFor(() => expect(errorFor(password)).toBe(WRONG));
    fireEvent.change(email, { target: { value: "klara@eksempel.n" } });
    expect(password.hasAttribute("aria-invalid")).toBe(false);
    expect(screen.queryByText(WRONG)).toBeNull();
  });
});
