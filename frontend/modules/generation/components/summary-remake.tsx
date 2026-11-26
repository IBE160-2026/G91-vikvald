"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, RotateCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { iconProps } from "@/components/icon";
import { JobStatus } from "@/components/job-status";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";

import { contentCountsQueryKey, fetchLatestJobs, latestJobsQueryKey, startJob } from "../api";
import { generationTexts, jobOutcome } from "../texts";
import type { Job } from "../types";
import { useFollowJob } from "./job-watcher";
import { SUMMARY_POINTS } from "./summary-row";

const texts = generationTexts.summary;

export type SummaryRemakeProps = {
  lectureId: string;
  lectureName: string;
  // Called when a summary job this tab followed has ended, so the page can
  // fetch the summary again (the job watcher refreshes it too).
  onJobEnded?: () => void;
};

// «Lag nytt sammendrag» in the summary page's content card (story 9.2, FR-55,
// mockup 13). The outline button with the RotateCw icon starts the usual
// summary job (`{kind: "summary", params: {requested: 15}}`) and hands it to
// the job watcher, like the Sammendrag row.
//
// While the job runs, job-status («Lager sammendrag …») stands in place of the
// button, and the old summary stays on the page. When the button goes away,
// focus goes to this area. An always-mounted live region reads the start and
// the end («Sammendraget er ferdig: 7 punkter i <lecture>.»).
//
// What it says about the result comes from the latest summary job in
// jobs/latest, as on the row, so an error stays after a reload until the next
// job starts: a failed job (also TOO_FEW_SUMMARY_POINTS) gives its error text
// (role="alert") and «Prøv igjen» in place of «Lag nytt sammendrag». While a
// job of another kind runs in the lecture, the button is not active and that
// kind's waiting text says why. An error from the start request itself is
// shown with messageFor, and the button stays.
export function SummaryRemake({ lectureId, lectureName, onJobEnded }: SummaryRemakeProps) {
  const queryClient = useQueryClient();
  const followJob = useFollowJob();
  const jobs = useQuery({ queryKey: latestJobsQueryKey(lectureId), queryFn: () => fetchLatestJobs(lectureId) });
  const [starting, setStarting] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  // The id of the running summary job this tab follows.
  const followed = useRef<string | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const reasonId = useId();

  const job = jobs.data?.find((other) => other.kind === "summary");
  const otherRunning = jobs.data?.find((other) => other.kind !== "summary" && other.status === "running");

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
    setStartError(null);
    void queryClient.invalidateQueries({ queryKey: contentCountsQueryKey(lectureId) });
    onJobEnded?.();
    // A failed job is read out by its alert, not twice.
    setAnnouncement(job.status === "done" ? texts.done(job.created ?? 0, lectureName) : "");
  }, [job, lectureId, lectureName, queryClient, followJob, onJobEnded]);

  async function start() {
    // The button goes away while the job runs, so the area keeps the focus.
    areaRef.current?.focus();
    setStarting(true);
    setStartError(null);
    try {
      const started = await startJob(lectureId, "summary", { requested: SUMMARY_POINTS });
      followed.current = started.id;
      followJob(started.id);
      queryClient.setQueryData<Job[]>(latestJobsQueryKey(lectureId), (old) => [
        ...(old ?? []).filter((other) => other.kind !== "summary"),
        started,
      ]);
      setAnnouncement(texts.jobText);
    } catch (caught) {
      setStartError(caught instanceof ApiError ? messageFor(caught.code) : FALLBACK_MESSAGE);
      // Another tab may have started a job: show it.
      void queryClient.invalidateQueries({ queryKey: latestJobsQueryKey(lectureId) });
    } finally {
      setStarting(false);
    }
  }

  const running = starting || job?.status === "running";
  const outcome = job && !starting ? jobOutcome(job) : null;
  const failed = outcome?.type === "failed" && !startError ? outcome.text : null;
  const waitingText = !running && otherRunning ? generationTexts[otherRunning.kind].waiting : null;
  const error = startError ?? failed ?? (jobs.isError ? FALLBACK_MESSAGE : null);

  return (
    <div ref={areaRef} tabIndex={-1} role="group" aria-label="Nytt sammendrag" className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="flex w-full items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
      {running ? (
        <JobStatus text={texts.jobText} />
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => void start()}
          disabled={waitingText !== null}
          aria-describedby={waitingText ? reasonId : undefined}
        >
          <RotateCw {...iconProps} />
          {failed ? "Prøv igjen" : "Lag nytt sammendrag"}
        </Button>
      )}
      {waitingText ? (
        <p id={reasonId} className="text-meta text-ink-muted">
          {waitingText}
        </p>
      ) : null}
      <p className="text-meta text-ink-muted">Det nye sammendraget erstatter dette. Det gamle blir ikke lagret.</p>
      <div role="status" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
