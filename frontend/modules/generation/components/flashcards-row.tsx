"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { CreateRow, type CreateRowState } from "@/components/create-row";
import { ApiError } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";
import { filesQueryKey } from "@/modules/files/api";

import { contentCountsQueryKey, fetchContentCounts, fetchLatestJobs, latestJobsQueryKey, startJob } from "../api";
import { generationTexts, jobOutcome } from "../texts";
import type { Job, Requested } from "../types";
import { useFollowJob } from "./job-watcher";
import { ScopeDialog } from "./scope-dialog";

const NO_FILES = "Last opp notater først.";
const texts = generationTexts.flashcards;

type Props = {
  lectureId: string;
  lectureName: string;
  // The lecture's files and their pages. Undefined while the files are loading.
  fileCount: number | undefined;
  pageCount: number | undefined;
};

function flashcardJob(jobs: Job[] | undefined): Job | undefined {
  return jobs?.find((job) => job.kind === "flashcards");
}

// The Flashcards row in «Lag og øv» (stories 3.1 and 3.2, mockup 04).
//
// «Lag flashcards» and «Lag flere» open the dialog «Lag flashcards», where she
// chooses the scope (10, 20 or 30 cards). The started job is handed to the job
// watcher in the (app) layout, which refreshes this lecture's queries when the
// job ends; the row does not poll by itself.
//
// What the row says about the result comes from the latest flashcards job, so
// it stays after a reload and until the next job starts: a failed job gives
// the error text (role="alert") and «Prøv igjen» (a new job with the same
// scope, without the dialog); done with no cards gives «Notatene ga ikke
// grunnlag for flashcards. Ingenting er lagret.» and done with fewer than
// chosen «Det ble laget 12 av inntil 20 flashcards. …», both on the note
// surface. An error from the start request itself (409, 422, network) is shown
// as before, without «Prøv igjen».
//
// The always-mounted live region reads «Lager flashcards …» when a job starts
// and, when a job this tab followed ends, the fewer, nothing or done text. An
// error is read by role="alert" instead, not twice. Focus never moves for a
// message.
export function FlashcardsRow({ lectureId, lectureName, fileCount, pageCount }: Props) {
  const queryClient = useQueryClient();
  const followJob = useFollowJob();
  const jobs = useQuery({ queryKey: latestJobsQueryKey(lectureId), queryFn: () => fetchLatestJobs(lectureId) });
  const counts = useQuery({ queryKey: contentCountsQueryKey(lectureId), queryFn: () => fetchContentCounts(lectureId) });
  const [starting, setStarting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // The id of the running job this tab follows (started here or seen running).
  const followed = useRef<string | null>(null);
  // The row itself takes focus when the button that had it goes away because
  // a job starts (from the dialog or «Prøv igjen»).
  const rowRef = useRef<HTMLDivElement>(null);
  const startedFromDialog = useRef(false);

  const job = flashcardJob(jobs.data);

  useEffect(() => {
    if (!job) return;
    if (job.status === "running") {
      if (followed.current !== job.id) {
        followed.current = job.id;
        followJob(job.id);
      }
      return;
    }
    if (followed.current !== job.id) return;
    followed.current = null;
    // An older error (e.g. a 409 while this job ran) no longer applies.
    setStartError(null);
    void queryClient.invalidateQueries({ queryKey: contentCountsQueryKey(lectureId) });
    const outcome = jobOutcome(job);
    if (outcome.type === "complete") setAnnouncement(texts.done(job.created ?? 0, lectureName));
    else if (outcome.type === "fewer" || outcome.type === "nothing") setAnnouncement(outcome.text);
    // A failed job is read out by its alert.
    else setAnnouncement("");
  }, [job, lectureId, lectureName, queryClient, followJob]);

  async function start(requested: Requested) {
    setStarting(true);
    setStartError(null);
    try {
      const started = await startJob(lectureId, "flashcards", requested);
      followed.current = started.id;
      followJob(started.id);
      queryClient.setQueryData<Job[]>(latestJobsQueryKey(lectureId), (old) => [
        ...(old ?? []).filter((other) => other.kind !== "flashcards"),
        started,
      ]);
      setAnnouncement(texts.jobText);
    } catch (caught) {
      setStartError(caught instanceof ApiError ? messageFor(caught.code) : FALLBACK_MESSAGE);
      // The files were deleted elsewhere: refresh them, so the button is no longer active.
      if (caught instanceof ApiError && caught.code === "LECTURE_HAS_NO_FILES") {
        void queryClient.invalidateQueries({ queryKey: filesQueryKey(lectureId) });
      }
      // Another tab may have started one: show it.
      void queryClient.invalidateQueries({ queryKey: latestJobsQueryKey(lectureId) });
    } finally {
      setStarting(false);
    }
  }

  function startFromDialog(requested: Requested) {
    startedFromDialog.current = true;
    setDialogOpen(false);
    void start(requested);
  }

  function retry(requested: Requested) {
    rowRef.current?.focus();
    void start(requested);
  }

  const count = counts.data?.flashcards ?? 0;
  const hasFiles = fileCount === undefined ? undefined : fileCount > 0;
  const running = starting || job?.status === "running";
  let state: CreateRowState = "idle";
  if (running) state = "running";
  else if (hasFiles !== true) state = "disabled";

  // While a new job is being started, the old result no longer applies.
  const outcome = job && !starting ? jobOutcome(job) : null;
  const message = outcome?.type === "fewer" || outcome?.type === "nothing" ? outcome.text : null;
  const failed = outcome?.type === "failed" ? outcome.text : null;
  const loadError = jobs.isError || counts.isError ? FALLBACK_MESSAGE : null;
  const failedJob = failed && !startError ? job : undefined;

  return (
    <div ref={rowRef} tabIndex={-1} role="group" aria-label="Flashcards" data-testid="flashcards-row">
      <CreateRow
        title="Flashcards"
        countText={count > 0 ? `${count} kort` : "Ingen ennå"}
        hasContent={count > 0}
        state={state}
        reason={hasFiles === false ? NO_FILES : undefined}
        createLabel="Lag flashcards"
        onCreate={() => setDialogOpen(true)}
        onCreateMore={() => setDialogOpen(true)}
        jobText={texts.jobText}
        announcement={announcement}
        message={message}
        error={startError ?? failed ?? loadError}
        onRetry={failedJob ? () => retry(failedJob.requested as Requested) : undefined}
      />
      <ScopeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStart={startFromDialog}
        lectureName={lectureName}
        fileCount={fileCount ?? 0}
        pageCount={pageCount ?? 0}
        cardCount={count}
        returnFocus={() => {
          const target = startedFromDialog.current ? rowRef.current : null;
          startedFromDialog.current = false;
          return target;
        }}
      />
    </div>
  );
}
