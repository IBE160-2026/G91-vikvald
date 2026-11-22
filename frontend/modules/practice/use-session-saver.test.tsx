// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runBeforeLogout } from "@/lib/before-logout";

import { OVERVIEW_QUERY_KEY } from "./api";
import { PRACTICE_SESSIONS_PATH, type SessionCounts } from "./save";
import { useSessionSaver, type SaverSnapshot } from "./use-session-saver";

const fetchMock = vi.fn<typeof fetch>();
const sendBeacon = vi.fn<(url: string, data?: BodyInit | null) => boolean>();

let counts: SessionCounts = { shown: 0, answered: 0, correct: 0, wrong: 0 };
let saver: ReturnType<typeof useSessionSaver>;

beforeEach(() => {
  counts = { shown: 0, answered: 0, correct: 0, wrong: 0 };
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetchMock);
  sendBeacon.mockReset();
  sendBeacon.mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function snapshot(): SaverSnapshot {
  return { subjectId: "s1", lectureId: "l1", kind: "flashcards", counts };
}

function Harness() {
  saver = useSessionSaver(snapshot);
  return <p data-testid="status">{saver.status}</p>;
}

function bodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter(([url]) => String(url) === PRACTICE_SESSIONS_PATH)
    .map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>);
}

function status(): string {
  return document.querySelector("[data-testid='status']")!.textContent!;
}

describe("useSessionSaver", () => {
  it("FR-56: ferdig økt sendes én gang med aborted=false, og status blir «saved»", async () => {
    render(<Harness />);
    counts = { shown: 3, answered: 3, correct: 2, wrong: 1 };
    expect(status()).toBe("idle");
    let sent = false;
    await act(async () => {
      sent = saver.finish();
    });
    expect(sent).toBe(true);
    expect(status()).toBe("saved");
    await act(async () => {
      expect(saver.finish()).toBe(false);
      expect(saver.abort()).toBe(false);
    });
    cleanup();
    window.dispatchEvent(new Event("pagehide"));
    const [body] = bodies();
    expect(bodies()).toHaveLength(1);
    expect(sendBeacon).not.toHaveBeenCalled();
    expect(body).toMatchObject({ aborted: false, shown: 3, answered: 3, correct: 2, wrong: 1, partial: 0, lecture_id: "l1" });
    expect(typeof body.session_id).toBe("string");
    expect(typeof body.duration_seconds).toBe("number");
  });

  it("FR-56: uten markerte kort sendes ingenting, uansett hvordan økten slutter", async () => {
    render(<Harness />);
    await act(async () => {
      expect(saver.abort()).toBe(false);
      expect(saver.finish()).toBe(false);
    });
    window.dispatchEvent(new Event("pagehide"));
    await runBeforeLogout();
    cleanup();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("FR-56: avbrudd med «Avslutt økt» sendes med aborted=true", async () => {
    render(<Harness />);
    counts = { shown: 2, answered: 1, correct: 0, wrong: 1 };
    await act(async () => {
      expect(saver.abort()).toBe(true);
    });
    expect(status()).toBe("saved");
    expect(bodies()).toEqual([expect.objectContaining({ aborted: true, answered: 1 })]);
  });

  it("FR-56: når siden forlates i appen (avmontering), sendes økten som avbrutt med keepalive", () => {
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    cleanup();
    expect(bodies()).toEqual([expect.objectContaining({ aborted: true })]);
    expect(fetchMock.mock.calls[0][1]?.keepalive).toBe(true);
  });

  it("FR-56: pagehide sender med sendBeacon som text/plain, og en side hentet tilbake sendes ikke på nytt", () => {
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    window.dispatchEvent(new Event("pagehide"));
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const [url, data] = sendBeacon.mock.calls[0];
    expect(url).toBe(PRACTICE_SESSIONS_PATH);
    expect(typeof data).toBe("string");
    expect(JSON.parse(String(data))).toMatchObject({ aborted: true, answered: 1 });
    // Back from the back/forward cache, then left again.
    window.dispatchEvent(new Event("pagehide"));
    cleanup();
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("FR-56: når sendBeacon sier nei, sendes økten med fetch keepalive", () => {
    sendBeacon.mockReturnValue(false);
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    window.dispatchEvent(new Event("pagehide"));
    expect(bodies()).toEqual([expect.objectContaining({ aborted: true })]);
    expect(fetchMock.mock.calls[0][1]?.keepalive).toBe(true);
  });

  it("FR-56: «Logg ut» venter på lagringen av økten", async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    render(<Harness />);
    counts = { shown: 2, answered: 2, correct: 1, wrong: 1 };
    let done = false;
    const waiting = runBeforeLogout().then(() => {
      done = true;
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(bodies()).toEqual([expect.objectContaining({ aborted: true })]);
    expect(done).toBe(false);
    await act(async () => {
      answer(new Response(null, { status: 204 }));
      await waiting;
    });
    expect(done).toBe(true);
  });

  it("FR-56: lagring som feiler gir status «failed»", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", details: {} } }), { status: 500 }));
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    await act(async () => {
      saver.finish();
    });
    expect(status()).toBe("failed");
  });

  it("SK-20: restart() gir ny session_id og lar den nye økten sendes", async () => {
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    await act(async () => {
      saver.finish();
    });
    await act(async () => {
      saver.restart();
    });
    expect(status()).toBe("idle");
    await act(async () => {
      expect(saver.finish()).toBe(true);
    });
    const [first, second] = bodies();
    expect(first.session_id).not.toBe(second.session_id);
  });

  it("FR-56: «Logg ut» rett etter «Avslutt økt» venter på lagringen som alt er i gang", async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    await act(async () => {
      expect(saver.abort()).toBe(true);
    });
    let done = false;
    const waiting = runBeforeLogout().then(() => {
      done = true;
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(done).toBe(false);
    expect(bodies()).toHaveLength(1);
    await act(async () => {
      answer(new Response(null, { status: 204 }));
      await waiting;
    });
    expect(done).toBe(true);
  });

  it("SK-20: en lagring fra forrige økt som blir ferdig etter restart(), endrer ikke status for den nye økten", async () => {
    let answer: (response: Response) => void = () => {};
    fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    render(<Harness />);
    counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
    await act(async () => {
      saver.finish();
    });
    expect(status()).toBe("saving");
    await act(async () => {
      saver.restart();
    });
    expect(status()).toBe("idle");
    await act(async () => {
      answer(new Response(null, { status: 204 }));
      await Promise.resolve();
    });
    expect(status()).toBe("idle");
  });

  describe("oversikten (story 5.1)", () => {
    function renderWithClient() {
      const client = new QueryClient();
      const invalidate = vi.spyOn(client, "invalidateQueries");
      render(
        <QueryClientProvider client={client}>
          <Harness />
        </QueryClientProvider>,
      );
      return invalidate;
    }

    it("FR-56: en lagring serveren har bekreftet, ugyldiggjør oversikten", async () => {
      const invalidate = renderWithClient();
      counts = { shown: 3, answered: 3, correct: 2, wrong: 1 };
      await act(async () => {
        saver.finish();
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: OVERVIEW_QUERY_KEY });
    });

    it("FR-56: også når siden er forlatt før svaret kom", async () => {
      let answer: (response: Response) => void = () => {};
      fetchMock.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
      const invalidate = renderWithClient();
      counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
      cleanup();
      expect(invalidate).not.toHaveBeenCalled();
      await act(async () => {
        answer(new Response(null, { status: 204 }));
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(invalidate).toHaveBeenCalledWith({ queryKey: OVERVIEW_QUERY_KEY });
    });

    it("FR-56: en lagring som feiler, ugyldiggjør ikke oversikten", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", details: {} } }), { status: 500 }));
      const invalidate = renderWithClient();
      counts = { shown: 1, answered: 1, correct: 1, wrong: 0 };
      await act(async () => {
        saver.finish();
      });
      expect(status()).toBe("failed");
      expect(invalidate).not.toHaveBeenCalled();
    });
  });
});
