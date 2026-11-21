// Saving a practice session's result (story 3.5, FR-56): the body for
// POST /api/practice-sessions, the session id, and the two ways to send it.
// Only the counts are sent, never the single marks or a time of day.

import { apiFetch } from "@/lib/api";

export const PRACTICE_SESSIONS_PATH = "/api/practice-sessions";

// The longest duration the server accepts: 31 days, in seconds.
export const MAX_DURATION_SECONDS = 31 * 24 * 60 * 60;

export type PracticeKind = "flashcards" | "quiz" | "freetext";

export type SessionCounts = { shown: number; answered: number; correct: number; wrong: number; partial?: number };

// Mirrors backend/app/modules/practice/schemas.py (PracticeSessionIn).
export type SessionPayload = {
  session_id: string;
  subject_id: string;
  // null for a session over the whole subject (story 3.6).
  lecture_id: string | null;
  kind: PracticeKind;
  aborted: boolean;
  shown: number;
  answered: number;
  correct: number;
  partial: number;
  wrong: number;
  duration_seconds: number;
};

type CryptoLike = Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string };

// A new random session id (UUID v4). crypto.randomUUID only exists on secure
// pages (https or localhost); elsewhere the id is built from getRandomValues.
export function newSessionId(source: CryptoLike = globalThis.crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type PayloadInput = {
  sessionId: string;
  subjectId: string;
  lectureId: string | null;
  kind: PracticeKind;
  aborted: boolean;
  counts: SessionCounts;
  // performance.now() when the session started, and now. performance.now()
  // counts from when the page was opened and does not follow the computer's
  // clock, so a wrong clock cannot change the duration. The server turns the
  // duration into a time with its own clock.
  startedAt: number;
  now: number;
};

// The body for POST /api/practice-sessions (a pure function).
export function buildSessionPayload(input: PayloadInput): SessionPayload {
  const seconds = Math.round((input.now - input.startedAt) / 1000);
  return {
    session_id: input.sessionId,
    subject_id: input.subjectId,
    lecture_id: input.lectureId,
    kind: input.kind,
    aborted: input.aborted,
    shown: input.counts.shown,
    answered: input.counts.answered,
    correct: input.counts.correct,
    partial: input.counts.partial ?? 0,
    wrong: input.counts.wrong,
    duration_seconds: Math.min(MAX_DURATION_SECONDS, Math.max(0, Number.isFinite(seconds) ? seconds : 0)),
  };
}

// Sends the result with fetch. keepalive lets the request finish even when
// the page is left at the same moment (navigation, logout).
export function postPracticeSession(payload: SessionPayload): Promise<void> {
  return apiFetch<void>(PRACTICE_SESSIONS_PATH, { method: "POST", body: JSON.stringify(payload), keepalive: true });
}

// Sends the result with navigator.sendBeacon when the tab is closed (pagehide).
// A string is sent as text/plain, which needs no CORS preflight; the server
// reads it as JSON. False when the browser would not queue it.
export function beaconPracticeSession(payload: SessionPayload): boolean {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return false;
  try {
    return navigator.sendBeacon(PRACTICE_SESSIONS_PATH, JSON.stringify(payload));
  } catch {
    return false;
  }
}
