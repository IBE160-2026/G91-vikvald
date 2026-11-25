"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { CreateRow, type CreateRowState } from "@/components/create-row";
import { ApiError } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";
import { filesQueryKey } from "@/modules/files/api";

import { contentCountsQueryKey, fetchContentCounts, fetchLatestJobs, latestJobsQueryKey, startJob } from "../api";
import { generationTexts, jobOutcome } from "../texts";
import type { ContentCounts, Difficulty, Job, JobKind, Requested, ScopedJobKind } from "../types";
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

// A second job kind the row also starts and follows, with its own text button
// and no dialog (story 7.1: «Lag modellkort» on the Flashcards row).
export type ExtraJob = {
  kind: JobKind;
  // «Lag modellkort».
  label: string;
  // The scope sent with the job. There is no dialog, so the largest one.
  requested: Requested;
};

type Props = GenerationRowProps & {
  kind: ScopedJobKind;
  // The extra kind, or undefined. The row follows its jobs whenever it is
  // given, also while the button is hidden (showExtra false: the feature
  // switch is off or the config has not loaded), so a running model-card job
  // never makes the row wait for itself.
  extra?: ExtraJob;
  showExtra?: boolean;
  // «Flashcards», «Quiz»: the row's title and the name of its group.
  title: string;
  // The test id of the row's group (e.g. «flashcards-row»).
  testId: string;
  // The row's count from the lecture's content counts.
  countOf: (counts: ContentCounts) => number;
  // What «Øv nå» can practise, when it is less than the count (model cards are
  // counted on the Flashcards row but practised from story 7.2). 0 makes
  // «Øv nå» not active. Defaults to countOf.
  practiceCountOf?: (counts: ContentCounts) => number;
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
//
// With `extra`, the row follows the newest job (by started_at) of its own kind
// and the extra kind, and shows that job's text, error or nothing message.
// «Prøv igjen» starts the same kind again. The extra button starts its job
// directly, without the dialog.
export function GenerationRow({
  kind,
  extra,
  showExtra = true,
  title,
  testId,
  countOf,
  practiceCountOf,
  countText,
  createLabel,
  onPractice,
  lectureId,
  lectureName,
  fileCount,
  pageCount,
}: Props) {
  const queryClient = useQueryClient();
  const followJob = useFollowJob();
  const jobs = useQuery({ queryKey: latestJobsQueryKey(lectureId), queryFn: () => fetchLatestJobs(lectureId) });
  const counts = useQuery({ queryKey: contentCountsQueryKey(lectureId), queryFn: () => fetchContentCounts(lectureId) });
  const [starting, setStarting] = useState(false);
  // The kind being started, for the job text before the job is known.
  const [startingKind, setStartingKind] = useState<JobKind>(kind);
  const [announcement, setAnnouncement] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // The id of the running job this tab follows (started here or seen running).
  const followed = useRef<string | null>(null);
  // The row itself takes focus when the button that had it goes away because
  // a job starts (from the dialog or «Prøv igjen»).
  const rowRef = useRef<HTMLDivElement>(null);
  const startedFromDialog = useRef(false);

  const ownKinds: JobKind[] = extra ? [kind, extra.kind] : [kind];
  const isOwn = (other: Job) => ownKinds.includes(other.kind);
  // The newest of the row's jobs (one per kind from jobs/latest).
  const job = jobs.data
    ?.filter(isOwn)
    .reduce<Job | undefined>(
      (newest, other) => (!newest || Date.parse(other.started_at) > Date.parse(newest.started_at) ? other : newest),
      undefined,
    );
  const texts = generationTexts[job?.kind ?? kind];
  // A running job of another row's kind in the same lecture (at most one runs).
  const otherRunning = jobs.data?.find((other) => !isOwn(other) && other.status === "running");

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

  async function start(startKind: JobKind, requested: Requested, difficulty?: Difficulty) {
    setStarting(true);
    setStartingKind(startKind);
    setStartError(null);
    try {
      const started = await startJob(lectureId, startKind, requested, difficulty);
      followed.current = started.id;
      followJob(started.id);
      queryClient.setQueryData<Job[]>(latestJobsQueryKey(lectureId), (old) => [
        ...(old ?? []).filter((other) => other.kind !== startKind),
        started,
      ]);
      setAnnouncement(generationTexts[startKind].jobText);
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
    void start(kind, requested, difficulty);
  }

  function retry(failedJob: Job) {
    rowRef.current?.focus();
    // The same kind and choices as the failed job.
    const requested = (failedJob.params?.requested ?? failedJob.requested) as Requested;
    void start(failedJob.kind, requested, failedJob.params?.difficulty);
  }

  function startExtra() {
    if (!extra) return;
    // The button goes away while the job runs, so the row keeps the focus.
    rowRef.current?.focus();
    void start(extra.kind, extra.requested);
  }

  const count = counts.data ? countOf(counts.data) : 0;
  const practiceCount = counts.data ? (practiceCountOf ?? countOf)(counts.data) : 0;
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
        extraAction={extra && showExtra ? { label: extra.label, onClick: startExtra } : undefined}
        onPractice={practiceCount > 0 ? onPractice : undefined}
        jobText={generationTexts[starting ? startingKind : (job?.kind ?? kind)].jobText}
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
