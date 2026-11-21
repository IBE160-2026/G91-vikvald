// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFollowJob } from "@/modules/generation/components/job-watcher";

import AppLayout from "./layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/",
}));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const JOB = {
  id: "j1",
  lecture_id: "l1",
  kind: "flashcards",
  status: "done",
  requested: 20,
  created: 18,
  discarded: 0,
  error_code: null,
  started_at: "2026-11-21T10:00:00Z",
  finished_at: "2026-11-21T10:00:03Z",
  lecture_name: "Uke 37: Merkevare",
};

beforeEach(() => {
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path === "/api/identity/me") {
      return jsonResponse(200, { id: "u1", email: "klara@eksempel.no", terms_accepted_at: "2026-09-01T08:00:00Z" });
    }
    // The job ended before the watcher asked: it is never in the list.
    if (path === "/api/jobs/active") return jsonResponse(200, []);
    if (path === "/api/jobs/j1") return jsonResponse(200, JOB);
    return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  toast.dismiss();
  cleanup();
  vi.unstubAllGlobals();
});

function StartedJob() {
  const follow = useFollowJob();
  return <button onClick={() => follow("j1")}>Følg jobben</button>;
}

describe("(app)-layouten", () => {
  it("AR-5, NFR-17: innlogget følger jobbvakten en jobb siden melder inn, og viser ferdigmeldingen", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AppLayout>
          <StartedJob />
        </AppLayout>
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Følg jobben" }));
    expect(
      await screen.findByText("Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.", {}, { timeout: 3000 }),
    ).toBeTruthy();
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => String(url) === "/api/jobs/j1")).toBe(true));
    expect(screen.getByRole("region", { name: /Varsler/ }).getAttribute("aria-live")).toBe("polite");
  });
});
