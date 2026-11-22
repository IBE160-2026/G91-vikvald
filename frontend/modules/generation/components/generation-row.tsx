"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { CreateRow, type CreateRowState } from "@/components/create-row";
import { ApiError } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";
import { filesQueryKey } from "@/modules/files/api";

import { contentCountsQueryKey, fetchContentCounts, fetchLatestJobs, latestJobsQueryKey, startJob } from "../api";
import { generationTexts, jobOutcome } from "../texts";
import type { ContentCounts, Difficulty, Job, JobKind, Requested } from "../types";
import { useFollowJob } from "./job-watcher";
import { ScopeDialog } from "./scope-dialog";

const NO_FILES = "Last opp notater først.";

export type GenerationRowProps = {
  lectureId: string;
  lectureName: string;
  // The lecture's files and their pages. Undefined while the files are loading.
  fileCount: number | undefined;
  pageCount: number | undefined;
};

type Props = GenerationRowProps & {
  kind: JobKind;
  // «Flashcards», «Quiz»: the row's title and the name of its group.
  title: string;
  // The test id of the row's group (e.g. «flashcards-row»).
  testId: string;
  // The row's count from the lecture's content counts.
  countOf: (counts: ContentCounts) => number;
  // «24 kort», «15 spørsmål».
  countText: (count: number) => string;
  // «Lag flashcards», «Lag quiz».
  createLabel: string;
  // «Øv nå». Without it the button is shown but not active (a type without practice yet).
  onPractice?: () => void;
};

// One row in «Lag og øv» for a content type that is made by a generation job
// (FR-17-FR-22, FR-28-FR-30, UX-DR18, UX-DR19, mockup 04). The Flashcards and
// Quiz rows are thin wrappers around it.
//
// «Lag …» and «Lag flere» open the scope dialog for the type (for quiz also
// with the difficulty). The started job is handed to the job watcher in the
// (app) layout, which refreshes this lecture's queries when the job ends; the
// row does not poll by itself.
//
// What the row says about the result comes from the latest job of its kind,
// so it stays after a reload and until the next job starts: a failed job
// gives the error text (role="alert") and «Prøv igjen» (a new job with the
// same choices, without the dialog); done with nothing gives the «nothing»
// text and done with fewer than chosen the «fewer» text, both on the note
// surface. An error from the start request itself (409, 422, network) is
// shown as before, without «Prøv igjen».
//
// While a job of another kind runs in the lecture, the row is waiting: its
// buttons are not active and the other type's waiting text («Venter til
// flashcardene er ferdige») says why.
//
// The always-mounted live region reads the job text when a job starts and,
// when a job this tab followed ends, the fewer, nothing or done text. An error
// is read by role="alert" instead, not twice. Focus never moves for a message.
export function GenerationRow({
  kind,
  title,
  testId,
  countOf,
  countText,
  createLabel,
  onPractice,
  lectureId,
  lectureName,
  fileCount,
  pageCount,
}: Props) {
  const texts = generationTexts[kind];
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

  const job = jobs.data?.find((other) => other.kind === kind);
  // A running job of another kind in the same lecture (at most one runs).
  const otherRunning = jobs.data?.find((other) => other.kind !== kind && other.status === "running");

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
  }, [job, lectureId, lectureName, queryClient, followJob, texts]);

  async function start(requested: Requested, difficulty?: Difficulty) {
    setStarting(true);
    setStartError(null);
    try {
      const started = await startJob(lectureId, kind, requested, difficulty);
      followed.current = started.id;
      followJob(started.id);
      queryClient.setQueryData<Job[]>(latestJobsQueryKey(lectureId), (old) => [
        ...(old ?? []).filter((other) => other.kind !== kind),
        started,
      ]);
      setAnnouncement(texts.jobText);
    } catch (caught) {
      setStartError(caught instanceof ApiError ? messageFor(caught.code) : FALLBACK_MESSAGE);
      // The files were deleted elsewhere: refresh them, so the button is no longer active.
      if (caught instanceof ApiError && caught.code === "LECTURE_HAS_NO_FILES") {
        void queryClient.invalidateQueries({ queryKey: filesQueryKey(lectureId) });
      }
      // Another tab (or row) may have started one: show it.
      void queryClient.invalidateQueries({ queryKey: latestJobsQueryKey(lectureId) });
    } finally {
      setStarting(false);
    }
  }

  function startFromDialog(requested: Requested, difficulty?: Difficulty) {
    startedFromDialog.current = true;
    setDialogOpen(false);
    void start(requested, difficulty);
  }

  function retry(failedJob: Job) {
    rowRef.current?.focus();
    // The same choices as the failed job.
    const requested = (failedJob.params?.requested ?? failedJob.requested) as Requested;
    void start(requested, failedJob.params?.difficulty);
  }

  const count = counts.data ? countOf(counts.data) : 0;
  const hasFiles = fileCount === undefined ? undefined : fileCount > 0;
  const running = starting || job?.status === "running";
  let state: CreateRowState = "idle";
  if (running) state = "running";
  else if (hasFiles !== true) state = "disabled";
  else if (otherRunning) state = "waiting";

  let reason: string | undefined;
  if (state === "disabled" && hasFiles === false) reason = NO_FILES;
  else if (state === "waiting" && otherRunning) reason = generationTexts[otherRunning.kind].waiting;

  // While a new job is being started, the old result no longer applies.
  const outcome = job && !starting ? jobOutcome(job) : null;
  const message = outcome?.type === "fewer" || outcome?.type === "nothing" ? outcome.text : null;
  const failed = outcome?.type === "failed" ? outcome.text : null;
  const loadError = jobs.isError || counts.isError ? FALLBACK_MESSAGE : null;
  const failedJob = failed && !startError ? job : undefined;

  return (
    <div ref={rowRef} tabIndex={-1} role="group" aria-label={title} data-testid={testId}>
      <CreateRow
        title={title}
        countText={count > 0 ? countText(count) : "Ingen ennå"}
        hasContent={count > 0}
        state={state}
        reason={reason}
        createLabel={createLabel}
        onCreate={() => setDialogOpen(true)}
        onCreateMore={() => setDialogOpen(true)}
        onPractice={onPractice}
        jobText={texts.jobText}
        announcement={announcement}
        message={message}
        error={startError ?? failed ?? loadError}
        onRetry={failedJob ? () => retry(failedJob) : undefined}
      />
      <ScopeDialog
        kind={kind}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onStart={startFromDialog}
        lectureName={lectureName}
        fileCount={fileCount ?? 0}
        pageCount={pageCount ?? 0}
        contentCount={count}
        returnFocus={() => {
          const target = startedFromDialog.current ? rowRef.current : null;
          startedFromDialog.current = false;
          return target;
        }}
      />
    </div>
  );
}
