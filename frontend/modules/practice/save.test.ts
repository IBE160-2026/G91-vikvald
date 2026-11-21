import { afterEach, describe, expect, it, vi } from "vitest";

import {
  beaconPracticeSession,
  buildSessionPayload,
  MAX_DURATION_SECONDS,
  newSessionId,
  postPracticeSession,
  PRACTICE_SESSIONS_PATH,
} from "./save";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => {
  vi.unstubAllGlobals();
});

const BASE = {
  sessionId: "11111111-1111-4111-8111-111111111111",
  subjectId: "s1",
  lectureId: "l1",
  kind: "flashcards" as const,
  aborted: false,
  counts: { shown: 3, answered: 3, correct: 2, wrong: 1 },
};

describe("buildSessionPayload", () => {
  it("FR-56: bygger kroppen med tellingene og varigheten i hele sekunder", () => {
    expect(buildSessionPayload({ ...BASE, startedAt: 1000, now: 126_400 })).toEqual({
      session_id: BASE.sessionId,
      subject_id: "s1",
      lecture_id: "l1",
      kind: "flashcards",
      aborted: false,
      shown: 3,
      answered: 3,
      correct: 2,
      partial: 0,
      wrong: 1,
      duration_seconds: 125,
    });
  });

  it("AR-9: ingen klokkeslett sendes, og varigheten holdes mellom 0 og 31 dager", () => {
    const payload = buildSessionPayload({ ...BASE, aborted: true, lectureId: null, startedAt: 5000, now: 1000 });
    expect(payload.duration_seconds).toBe(0);
    expect(payload.lecture_id).toBeNull();
    expect(payload.aborted).toBe(true);
    expect(Object.keys(payload)).not.toContain("started_at");
    const long = buildSessionPayload({ ...BASE, startedAt: 0, now: (MAX_DURATION_SECONDS + 10) * 1000 });
    expect(long.duration_seconds).toBe(MAX_DURATION_SECONDS);
  });
});

describe("newSessionId", () => {
  it("SK-20: bruker crypto.randomUUID når den finnes", () => {
    expect(newSessionId({ randomUUID: () => "fra-randomUUID", getRandomValues: ((array: Uint8Array) => array) as Crypto["getRandomValues"] })).toBe("fra-randomUUID");
    expect(newSessionId()).toMatch(UUID_V4);
  });

  it("SK-20: lager en UUID v4 med getRandomValues når randomUUID mangler", () => {
    const fill = <T extends ArrayBufferView | null>(array: T): T => {
      if (array instanceof Uint8Array) array.fill(0xff);
      return array;
    };
    const id = newSessionId({ getRandomValues: fill as Crypto["getRandomValues"] });
    expect(id).toMatch(UUID_V4);
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(newSessionId({ getRandomValues: globalThis.crypto.getRandomValues.bind(globalThis.crypto) })).toMatch(UUID_V4);
  });
});

describe("sending", () => {
  const payload = buildSessionPayload({ ...BASE, startedAt: 0, now: 0 });

  it("FR-56: postPracticeSession sender JSON med keepalive", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await postPracticeSession(payload);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(PRACTICE_SESSIONS_PATH);
    expect(init?.method).toBe("POST");
    expect(init?.keepalive).toBe(true);
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  it("FR-56: beaconPracticeSession sender teksten med sendBeacon og gir svaret videre", () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal("navigator", { sendBeacon });
    expect(beaconPracticeSession(payload)).toBe(true);
    expect(sendBeacon).toHaveBeenCalledWith(PRACTICE_SESSIONS_PATH, JSON.stringify(payload));
    // A plain string is sent as text/plain (no CORS preflight).
    expect(typeof sendBeacon.mock.calls[0][1]).toBe("string");
    sendBeacon.mockReturnValue(false);
    expect(beaconPracticeSession(payload)).toBe(false);
  });

  it("FR-56: uten sendBeacon gir beaconPracticeSession false", () => {
    vi.stubGlobal("navigator", {});
    expect(beaconPracticeSession(payload)).toBe(false);
  });
});
