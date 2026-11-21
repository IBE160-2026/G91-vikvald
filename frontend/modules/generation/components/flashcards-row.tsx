"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { CreateRow, type CreateRowState } from "@/components/create-row";
import { ApiError } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";

import { contentCountsQueryKey, fetchContentCounts, fetchLatestJobs, latestJobsQueryKey, startJob } from "../api";
import type { Job } from "../types";

const JOB_TEXT = "Lager flashcards …";
const NOTHING_MADE = "Notatene ga ikke grunnlag for flashcards. Ingenting er lagret.";
const NO_FILES = "Last opp notater først.";
// How often the latest job is asked for while one is running.
const POLL_MS = 1000;

type Props = {
  lectureId: string;
  lectureName: string;
  // Undefined while the files are loading.
  hasFiles: boolean | undefined;
};

function flashcardJob(jobs: Job[] | undefined): Job | undefined {
  return jobs?.find((job) => job.kind === "flashcards");
}

// The Flashcards row in «Lag og øv» (story 3.1, mockup 04). It asks for the
// latest job (every second while one is running) and the card count. The
// buttons start a job without params. When a job this tab has followed ends,
// the count is fetched again and the end is read out: «Flashcardene er ferdige:
// N kort i <forelesning>.», or «Notatene ga ikke grunnlag for flashcards.
// Ingenting er lagret.» (also shown until the next job), or the error text.
export function FlashcardsRow({ lectureId, lectureName, hasFiles }: Props) {
  const queryClient = useQueryClient();
  const jobs = useQuery({
    queryKey: latestJobsQueryKey(lectureId),
    queryFn: () => fetchLatestJobs(lectureId),
    refetchInterval: (query) => (flashcardJob(query.state.data)?.status === "running" ? POLL_MS : false),
  });
  const counts = useQuery({ queryKey: contentCountsQueryKey(lectureId), queryFn: () => fetchContentCounts(lectureId) });
  const [starting, setStarting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The id of the running job this tab follows (started here or seen running).
  const followed = useRef<string | null>(null);

  const job = flashcardJob(jobs.data);

  useEffect(() => {
    if (!job) return;
    if (job.status === "running") {
      followed.current = job.id;
      return;
    }
    if (followed.current !== job.id) return;
    followed.current = null;
    void queryClient.invalidateQueries({ queryKey: contentCountsQueryKey(lectureId) });
    if (job.status === "failed") {
      const text = messageFor(job.error_code);
      setAnnouncement(text);
      setError(text);
    } else if ((job.created ?? 0) === 0) {
      setAnnouncement(NOTHING_MADE);
      setMessage(NOTHING_MADE);
    } else {
      setAnnouncement(`Flashcardene er ferdige: ${job.created} kort i ${lectureName}.`);
    }
  }, [job, lectureId, lectureName, queryClient]);

  async function start() {
    setStarting(true);
    setMessage(null);
    setError(null);
    try {
      const started = await startJob(lectureId, "flashcards");
      followed.current = started.id;
      queryClient.setQueryData<Job[]>(latestJobsQueryKey(lectureId), (old) => [
        ...(old ?? []).filter((other) => other.kind !== "flashcards"),
        started,
      ]);
      setAnnouncement(JOB_TEXT);
    } catch (caught) {
      setError(caught instanceof ApiError ? messageFor(caught.code) : FALLBACK_MESSAGE);
      // Another tab may have started one: show it.
      void queryClient.invalidateQueries({ queryKey: latestJobsQueryKey(lectureId) });
    } finally {
      setStarting(false);
    }
  }

  const count = counts.data?.flashcards ?? 0;
  const running = starting || job?.status === "running";
  let state: CreateRowState = "idle";
  if (running) state = "running";
  else if (hasFiles !== true) state = "disabled";

  return (
    <CreateRow
      title="Flashcards"
      countText={count > 0 ? `${count} kort` : "Ingen ennå"}
      hasContent={count > 0}
      state={state}
      reason={hasFiles === false ? NO_FILES : undefined}
      createLabel="Lag flashcards"
      onCreate={() => void start()}
      onCreateMore={() => void start()}
      jobText={JOB_TEXT}
      announcement={announcement}
      message={message}
      error={error ?? (jobs.isError || counts.isError ? FALLBACK_MESSAGE : null)}
    />
  );
}
