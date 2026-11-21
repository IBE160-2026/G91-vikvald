// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TrackedJob } from "../types";
import { JobWatcher, useFollowJob } from "./job-watcher";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function tracked(changes: Partial<TrackedJob> = {}): TrackedJob {
  return {
    id: "j1",
    lecture_id: "l1",
    kind: "flashcards",
    status: "running",
    requested: 20,
    created: null,
    discarded: null,
    error_code: null,
    started_at: "2026-11-21T10:00:00Z",
    finished_at: null,
    lecture_name: "Uke 37: Merkevare",
    ...changes,
  };
}

// The fake backend: the job runs while `running` is true, then ends as `ended`.
let current: TrackedJob | null;
let ended: Partial<TrackedJob>;
let jobStatus = 200;

beforeEach(() => {
  pathname = "/";
  current = tracked();
  ended = { status: "done", created: 18, discarded: 0, finished_at: "2026-11-21T10:00:03Z" };
  jobStatus = 200;
  fetchMock.mockImplementation(async (url) => {
    const path = String(url);
    if (path === "/api/jobs/active") return jsonResponse(200, current?.status === "running" ? [current] : []);
    if (current && path === `/api/jobs/${current.id}`) {
      if (jobStatus !== 200) return jsonResponse(jobStatus, { error: { code: "NOT_FOUND", details: {} } });
      return jsonResponse(200, current);
    }
    return jsonResponse(404, { error: { code: "NOT_FOUND", details: {} } });
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  // Sonner keeps its messages in one shared store: none may follow to the next test.
  toast.dismiss();
  cleanup();
  vi.unstubAllGlobals();
});

function finish() {
  current = { ...current!, ...ended };
}

function calls(path: string) {
  return fetchMock.mock.calls.filter(([url]) => String(url) === path).length;
}

function Follower({ jobId }: { jobId: string }) {
  const follow = useFollowJob();
  return <button onClick={() => follow(jobId)}>Følg</button>;
}

function renderWatcher(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(
    <QueryClientProvider client={client}>
      <JobWatcher>
        <Follower jobId="j1" />
      </JobWatcher>
    </QueryClientProvider>,
  );
  return invalidate;
}

function toastRegion() {
  return screen.getByRole("region", { name: /Varsler/ });
}

describe("JobWatcher", () => {
  it("NFR-17: en jobb som blir ferdig mens hun er på forsiden, gir ferdigmeldingen i et levende område", async () => {
    const invalidate = renderWatcher();
    expect(toastRegion().getAttribute("aria-live")).toBe("polite");
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    finish();
    expect(
      await screen.findByText("Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.", {}, { timeout: 3000 }),
    ).toBeTruthy();
    expect(toastRegion().textContent).toContain("Flashcardene er ferdige: 18 kort i Uke 37: Merkevare.");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] });
  });

  it("FR-21: en feilet jobb gir feilteksten, og ingenting laget gir «ingenting»-teksten", async () => {
    ended = { status: "failed", error_code: "GENERATION_TIMEOUT", finished_at: "2026-11-21T10:00:03Z" };
    renderWatcher();
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    finish();
    expect(
      await screen.findByText("Vi klarte ikke å lage flashcardene. Ingenting er lagret. Prøv igjen.", {}, { timeout: 3000 }),
    ).toBeTruthy();
  });

  it("NFR-17: på forelesningssiden vises ingen melding (raden sier det selv), men spørringene oppdateres", async () => {
    pathname = "/forelesninger/l1";
    const invalidate = renderWatcher();
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    finish();
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["lectures", "l1"] }), { timeout: 3000 });
    expect(toastRegion().textContent).toBe("");
  });

  it("AR-5: en jobb raden melder inn, følges selv om den ble ferdig før neste spørring", async () => {
    current = null;
    renderWatcher();
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    // Started and finished between two questions: never seen in the list.
    current = tracked({ status: "done", created: 5, finished_at: "2026-11-21T10:00:03Z" });
    fireEvent.click(screen.getByRole("button", { name: "Følg" }));
    expect(
      await screen.findByText("Flashcardene er ferdige: 5 kort i Uke 37: Merkevare.", {}, { timeout: 3000 }),
    ).toBeTruthy();
    expect(calls("/api/jobs/j1")).toBe(1);
  });

  it("AR-5: uten jobber spør vakten bare én gang", async () => {
    current = null;
    renderWatcher();
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(calls("/api/jobs/active")).toBe(1);
  });

  it("E10: etter utlogging (vakten er borte) spørres ingenting, og ingen ferdigmelding vises", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <JobWatcher>
          <Follower jobId="j1" />
        </JobWatcher>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    // Logging out: RequireLogin no longer renders its children, so the watcher goes.
    rerender(<QueryClientProvider client={client}>{null}</QueryClientProvider>);
    finish();
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(calls("/api/jobs/active")).toBe(1);
    expect(calls("/api/jobs/j1")).toBe(0);
    expect(screen.queryByText(/Flashcardene er ferdige/)).toBeNull();
  });

  it("AR-5: en jobb som er borte (404), følges ikke lenger, og gir ingen melding", async () => {
    renderWatcher();
    await waitFor(() => expect(calls("/api/jobs/active")).toBe(1));
    jobStatus = 404;
    finish();
    await waitFor(() => expect(calls("/api/jobs/j1")).toBe(1), { timeout: 3000 });
    const asked = calls("/api/jobs/active");
    await act(() => new Promise((resolve) => setTimeout(resolve, 1500)));
    expect(calls("/api/jobs/active")).toBe(asked);
    expect(toastRegion().textContent).toBe("");
  });
});
