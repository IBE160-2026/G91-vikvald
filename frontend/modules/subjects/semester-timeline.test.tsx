// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FALLBACK_MESSAGE } from "@/lib/messages";
import { OVERVIEW_QUERY_KEY } from "@/modules/practice/api";
import type { Overview, OverviewLecture, OverviewSubject } from "@/modules/practice/types";

import { SemesterTimeline } from "./components/semester-timeline";

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function lecture(id: string, date: string, practiced: boolean): OverviewLecture {
  return { id, name: id, date, practiced, last_practiced_at: practiced ? "2026-11-03T10:00:00Z" : null };
}

function overviewSubject(overrides: Partial<OverviewSubject>): OverviewSubject {
  return {
    id: "a",
    name: "Markedsføring",
    color_index: 0,
    exam_date: "2026-12-04",
    lectures: [],
    last_session: null,
    ...overrides,
  };
}

const MARKETING = overviewSubject({
  lectures: [lecture("l1", "2026-09-11", true), lecture("l2", "2026-09-18", false)],
});
const ECONOMICS = overviewSubject({ id: "b", name: "Samfunnsøkonomi", color_index: 1, exam_date: "2027-01-14" });

let overview: Overview | (() => Response | Promise<Response>) = { subjects: [MARKETING, ECONOMICS] };

function renderTimeline(element: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
  return client;
}

// The hidden graphic: the one aria-hidden container in the card.
function graphic(): HTMLElement {
  const region = screen.getByRole("region", { name: "Semesterlinje" });
  return region.querySelector('[aria-hidden="true"]') as HTMLElement;
}

beforeEach(() => {
  overview = { subjects: [MARKETING, ECONOMICS] };
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async (url) => {
    if (String(url) !== "/api/overview") return jsonResponse(404, {});
    return typeof overview === "function" ? overview() : jsonResponse(200, overview);
  });
  vi.useFakeTimers({ toFake: ["Date"] });
  // Tuesday 10.11.2026 at noon, as in mockup 02.
  vi.setSystemTime(new Date(2026, 10, 10, 12));
});

afterEach(() => {
  cleanup();
  fetchMock.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("semesterlinja (story 5.5)", () => {
  it("UX-DR11: tekstlig versjon med én setning per emne for skjermleser", async () => {
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a", "b"]} />);
    const items = await screen.findAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Markedsføring: 1 av 2 forelesninger øvd. Eksamen fredag 04.12, om 3 uker.",
      "Samfunnsøkonomi: Ingen forelesninger ennå. Eksamen torsdag 14.01, om 9 uker.",
    ]);
    expect(items[0].closest("ul")?.className).toContain("sr-only");
    expect(items[0].closest("[aria-hidden]")).toBeNull();
  });

  it("UX-DR11: overskriften står utenfor grafikken, som er aria-hidden og uten fokuserbare elementer", async () => {
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a", "b"]} />);
    await screen.findAllByRole("listitem");
    const heading = screen.getByRole("heading", { level: 2, name: "Semesterlinje" });
    expect(heading.closest("[aria-hidden]")).toBeNull();
    const hidden = graphic();
    expect(hidden).toBeTruthy();
    // Legend, left text, lines and pills are all inside the hidden container.
    for (const text of ["Øvd", "Ikke øvd ennå", "Eksamen", "Tid igjen", "Markedsføring", "2 forelesninger", "I dag 10.11"]) {
      expect(within(hidden).getAllByText(text).length).toBeGreaterThan(0);
    }
    expect(hidden.querySelectorAll("a, button, input, [tabindex]")).toHaveLength(0);
    hidden.querySelectorAll("svg").forEach((svg) => expect(svg.getAttribute("focusable")).toBe("false"));
  });

  it("FR-57: venstreteksten har navn, antall forelesninger og «Eksamen 04.12 · om 3 uker»", async () => {
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a", "b"]} />);
    await screen.findAllByRole("listitem");
    const hidden = graphic();
    expect(within(hidden).getByText("Markedsføring").className).toContain("text-item-title");
    expect(within(hidden).getByText("Eksamen 04.12 · om 3 uker").className).toContain("text-meta");
    expect(within(hidden).getByText("Eksamen 14.01 · om 9 uker")).toBeTruthy();
    // The months from the span over both subjects.
    for (const month of ["SEP", "OKT", "NOV", "DES", "JAN"]) expect(within(hidden).getByText(month)).toBeTruthy();
  });

  it("FR-57: stasjonene er fylt i emnefargen når oversikten sier øvd, ellers hvite med strek", async () => {
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a", "b"]} />);
    await screen.findAllByRole("listitem");
    const done = graphic().querySelector('[data-station="l1"] circle') as SVGCircleElement;
    const open = graphic().querySelector('[data-station="l2"] circle') as SVGCircleElement;
    expect(done.getAttribute("fill")).toBe("var(--color-subject-1)");
    expect(open.getAttribute("fill")).toBe("var(--color-surface)");
    expect(open.getAttribute("stroke")).toBe("var(--color-subject-1)");
    const line = graphic().querySelector('[data-subject-line="a"]') as SVGElement;
    expect(line.querySelector('[data-part="solid"]')).toBeTruthy();
    expect(line.querySelector('[data-part="dashed"]')?.getAttribute("stroke-dasharray")).toBe("0.5 7");
  });

  it("E6: et emne uten forelesninger har ingen stasjoner, bare stiplet linje, og «Ingen forelesninger ennå»", async () => {
    renderTimeline(<SemesterTimeline variant="subject" subjectId="b" />);
    await screen.findAllByRole("listitem");
    const line = graphic().querySelector('[data-subject-line="b"]') as SVGElement;
    expect(line.querySelectorAll("[data-station]")).toHaveLength(0);
    expect(line.querySelector('[data-part="solid"]')).toBeNull();
    expect(line.querySelector('[data-part="dashed"]')).toBeTruthy();
    expect(within(graphic()).getByText("Ingen forelesninger ennå")).toBeTruthy();
  });

  it("FR-57: passert eksamen gir «Eksamen var 04.12», heltrukket linje og ingen stiplet del", async () => {
    vi.setSystemTime(new Date(2026, 11, 10, 12));
    renderTimeline(<SemesterTimeline variant="subject" subjectId="a" />);
    const [item] = await screen.findAllByRole("listitem");
    expect(item.textContent).toBe("Markedsføring: 1 av 2 forelesninger øvd. Eksamen var fredag 04.12.");
    expect(within(graphic()).getByText("Eksamen var 04.12")).toBeTruthy();
    const line = graphic().querySelector('[data-subject-line="a"]') as SVGElement;
    expect(line.querySelector('[data-part="solid"]')).toBeTruthy();
    expect(line.querySelector('[data-part="dashed"]')).toBeNull();
  });

  it("FR-57: eksamen i dag gir «Eksamen i dag» og ingen stiplet del", async () => {
    vi.setSystemTime(new Date(2026, 11, 4, 12));
    renderTimeline(<SemesterTimeline variant="subject" subjectId="a" />);
    const [item] = await screen.findAllByRole("listitem");
    expect(item.textContent).toBe("Markedsføring: 1 av 2 forelesninger øvd. Eksamen i dag.");
    expect(within(graphic()).getByText("Eksamen i dag")).toBeTruthy();
    const line = graphic().querySelector('[data-subject-line="a"]') as SVGElement;
    expect(line.querySelector('[data-part="solid"]')).toBeTruthy();
    expect(line.querySelector('[data-part="dashed"]')).toBeNull();
  });

  it("UX-DR11: emnesiden viser ukenummer og dato under hver stasjon og «Eksamen» / dato under firkanten", async () => {
    renderTimeline(<SemesterTimeline variant="subject" subjectId="a" />);
    await screen.findAllByRole("listitem");
    const hidden = graphic();
    expect(within(hidden).getByText("37")).toBeTruthy();
    expect(within(hidden).getByText("11.09")).toBeTruthy();
    expect(within(hidden).getByText("38")).toBeTruthy();
    expect(within(hidden).getByText("18.09")).toBeTruthy();
    expect(within(hidden).getByText("04.12")).toBeTruthy();
    // Only this subject.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(within(hidden).queryByText("Samfunnsøkonomi")).toBeNull();
  });

  it("UX-DR11: forsiden viser ingen ukenummer under stasjonene", async () => {
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a"]} />);
    await screen.findAllByRole("listitem");
    expect(within(graphic()).queryByText("37")).toBeNull();
  });

  it("UX-DR11: du er her står bare ved stasjonen til forelesningen som er åpen", async () => {
    renderTimeline(<SemesterTimeline variant="lecture" subjectId="a" currentLectureId="l2" />);
    await screen.findAllByRole("listitem");
    const hidden = graphic();
    expect(within(hidden).getByText("Du er her")).toBeTruthy();
    expect(hidden.querySelectorAll('[data-part="current"]')).toHaveLength(1);
    expect(hidden.querySelector('[data-station="l2"] [data-part="current"]')).toBeTruthy();
    expect(hidden.querySelector('[data-station="l1"] [data-part="current"]')).toBeNull();
    // «I dag» stands too, in its own row.
    expect(within(hidden).getByText("I dag 10.11")).toBeTruthy();
  });

  it("FR-57: til oversikten er lastet, står bare overskriften i kortet", async () => {
    overview = () => new Promise<Response>(() => {});
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a"]} />);
    expect(screen.getByRole("heading", { level: 2, name: "Semesterlinje" })).toBeTruthy();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByRole("region", { name: "Semesterlinje" }).querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByText(/Eksamen/)).toBeNull();
  });

  it("FR-57: når oversikten feiler, står reserveteksten i kortet, uten linje og tall", async () => {
    overview = () => jsonResponse(500, { error: { code: "INTERNAL_ERROR", details: {} } });
    renderTimeline(<SemesterTimeline variant="all" subjectIds={["a"]} />);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(FALLBACK_MESSAGE);
    expect(within(screen.getByRole("region", { name: "Semesterlinje" })).getByRole("alert")).toBe(alert);
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.queryByText(/forelesninger/)).toBeNull();
  });

  it("FR-57: mangler emnet i oversikten, vises ikke kortet", async () => {
    const client = renderTimeline(<SemesterTimeline variant="subject" subjectId="x" />);
    await waitFor(() => expect(client.getQueryState(OVERVIEW_QUERY_KEY)?.status).toBe("success"));
    expect(screen.queryByRole("region", { name: "Semesterlinje" })).toBeNull();
  });

  it("SK-22: når oversikten ugyldiggjøres, er stasjonen fylt og teksten viser nytt antall uten omlasting", async () => {
    const client = renderTimeline(<SemesterTimeline variant="subject" subjectId="a" />);
    expect(await screen.findByText(/1 av 2 forelesninger øvd/)).toBeTruthy();
    overview = {
      subjects: [{ ...MARKETING, lectures: MARKETING.lectures.map((item) => ({ ...item, practiced: true })) }],
    };
    await act(async () => {
      await client.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
    });
    expect(await screen.findByText(/2 av 2 forelesninger øvd/)).toBeTruthy();
    expect(graphic().querySelector('[data-station="l2"]')?.getAttribute("data-practiced")).toBe("true");
  });
});
