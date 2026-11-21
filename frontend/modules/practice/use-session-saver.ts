"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { registerBeforeLogout } from "@/lib/before-logout";

import {
  beaconPracticeSession,
  buildSessionPayload,
  newSessionId,
  postPracticeSession,
  type PracticeKind,
  type SessionCounts,
} from "./save";

// What is saved, read when the result is sent. null while it cannot be sent
// yet (the lecture or the session is still loading).
export type SaverSnapshot = {
  subjectId: string;
  lectureId: string | null;
  kind: PracticeKind;
  counts: SessionCounts;
};

export type SaveStatus = "idle" | "saving" | "saved" | "failed";

// Sends a practice session's result exactly once (story 3.5, FR-56).
//
// The hook keeps the session id, the start time (performance.now()) and a
// «sent» flag in refs. Nothing is sent before at least one card is marked
// (answered >= 1), and nothing is sent twice. The ways out:
// - finish(): the session is finished; aborted=false, with fetch.
// - abort(): «Avslutt økt» or Esc; aborted=true, with fetch.
// - the page unmounts (navigation in the app) or «Logg ut» (which waits for
//   it, see lib/before-logout.ts): aborted=true, with fetch keepalive.
// - pagehide (the tab is closed or the browser leaves the app): aborted=true
//   with navigator.sendBeacon; if the browser refuses it, fetch keepalive.
//   A page brought back from the back/forward cache is already sent and is
//   not saved again.
// finish() and abort() return true when something was sent. status follows
// the latest send for the panel and the result page. restart() starts a new
// session: a new id, a new start time and the flag cleared.
export function useSessionSaver(getSnapshot: () => SaverSnapshot | null) {
  const snapshotRef = useRef(getSnapshot);
  useEffect(() => {
    snapshotRef.current = getSnapshot;
  });
  const sessionIdRef = useRef<string | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const sentRef = useRef(false);
  const mountedRef = useRef(true);
  // The save in flight (if any): «Logg ut» waits for it.
  const pendingRef = useRef<Promise<void> | null>(null);
  // Bumped by restart(): a save from an earlier session never sets the status.
  const generationRef = useRef(0);
  const [status, setStatus] = useState<SaveStatus>("idle");

  // Set once, on the first render after mount (never during render).
  useEffect(() => {
    if (sessionIdRef.current === null) sessionIdRef.current = newSessionId();
    if (startedAtRef.current === null) startedAtRef.current = performance.now();
  }, []);

  // The body to send, or null when nothing should be sent. Marks it as sent.
  const take = useCallback((aborted: boolean) => {
    if (sentRef.current) return null;
    const snapshot = snapshotRef.current();
    if (snapshot === null || snapshot.counts.answered < 1) return null;
    sentRef.current = true;
    sessionIdRef.current ??= newSessionId();
    const now = performance.now();
    return buildSessionPayload({
      sessionId: sessionIdRef.current,
      subjectId: snapshot.subjectId,
      lectureId: snapshot.lectureId,
      kind: snapshot.kind,
      aborted,
      counts: snapshot.counts,
      startedAt: startedAtRef.current ?? now,
      now,
    });
  }, []);

  const send = useCallback(
    (aborted: boolean): Promise<void> | null => {
      const payload = take(aborted);
      if (payload === null) return null;
      const generation = generationRef.current;
      const current = () => mountedRef.current && generationRef.current === generation;
      if (current()) setStatus("saving");
      const pending = postPracticeSession(payload).then(
        () => {
          if (current()) setStatus("saved");
        },
        () => {
          if (current()) setStatus("failed");
        },
      );
      pendingRef.current = pending;
      return pending;
    },
    [take],
  );

  const finish = useCallback(() => send(false) !== null, [send]);
  const abort = useCallback(() => send(true) !== null, [send]);

  const restart = useCallback(() => {
    generationRef.current += 1;
    sessionIdRef.current = newSessionId();
    startedAtRef.current = performance.now();
    sentRef.current = false;
    setStatus("idle");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    function onPageHide() {
      const payload = take(true);
      if (payload === null) return;
      if (!beaconPracticeSession(payload)) void postPracticeSession(payload).catch(() => {});
    }
    window.addEventListener("pagehide", onPageHide);
    // Sends what is marked, or waits for a save that has already started.
    const unregister = registerBeforeLogout(() => send(true) ?? pendingRef.current ?? undefined);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      unregister();
      mountedRef.current = false;
      // Leaving the page in the app: send what is marked as aborted.
      void send(true);
    };
  }, [take, send]);

  return { status, finish, abort, restart };
}
