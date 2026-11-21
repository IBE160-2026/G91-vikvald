"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@/lib/api";

import { ACTIVE_JOBS_QUERY_KEY, fetchActiveJobs, fetchJob } from "../api";
import { finishedText } from "../texts";

// How often the running jobs are asked for while at least one is followed.
const POLL_MS = 1000;
// How long the message on another page stays (it pauses on hover and focus).
const TOAST_MS = 8000;

type FollowJob = (jobId: string) => void;

// Without a JobWatcher (e.g. a test of one page) following does nothing.
const FollowJobContext = createContext<FollowJob>(() => {});

// The row that starts a job hands it to the watcher, so the job is followed
// even if it ends before the next GET /api/jobs/active.
export function useFollowJob(): FollowJob {
  return useContext(FollowJobContext);
}

// The one job watcher in the (app) layout (AR-5, NFR-17), inside RequireLogin,
// so it only runs while she is logged in. It asks GET /api/jobs/active when it
// mounts, and every second while it follows at least one job. It follows every
// job it sees there and every job a row hands it. When a followed job is no
// longer running, it asks GET /api/jobs/{id} for the result, refreshes that
// lecture's queries (so the row shows the new count and message), and, when
// she is not on that lecture's page, shows the result as a short message
// (sonner, in a live region). The Toaster lives here too, so no message is
// shown after logout. It is put straight in body, outside main: a dialog makes
// everything but live regions inert, and main must still become inert.
export function JobWatcher({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const [followed, setFollowed] = useState<ReadonlySet<string>>(() => new Set());
  const followedRef = useRef(followed);
  useEffect(() => {
    pathnameRef.current = pathname;
    followedRef.current = followed;
  }, [pathname, followed]);
  // Jobs whose result is being fetched, so each is fetched once at a time.
  const checking = useRef(new Set<string>());
  // False after unmount (logout): a result that arrives then is not shown.
  // Sonner shows every message not yet dismissed to the next Toaster, so the
  // messages are dismissed too, and none is shown at the next login.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      toast.dismiss();
    };
  }, []);
  // body only exists in the browser, so the Toaster comes after the first render.
  const [toasterRoot, setToasterRoot] = useState<HTMLElement | null>(null);
  useEffect(() => setToasterRoot(document.body), []);

  const active = useQuery({
    queryKey: ACTIVE_JOBS_QUERY_KEY,
    queryFn: fetchActiveJobs,
    refetchInterval: followed.size > 0 ? POLL_MS : false,
  });

  const follow = useCallback<FollowJob>((jobId) => {
    setFollowed((old) => (old.has(jobId) ? old : new Set(old).add(jobId)));
  }, []);

  const unfollow = useCallback((jobId: string) => {
    setFollowed((old) => {
      if (!old.has(jobId)) return old;
      const next = new Set(old);
      next.delete(jobId);
      return next;
    });
  }, []);

  const check = useCallback(
    async (jobId: string) => {
      if (checking.current.has(jobId)) return;
      checking.current.add(jobId);
      try {
        const job = await fetchJob(jobId);
        // Started after the list was fetched: still running, keep following.
        if (job.status === "running" || !mounted.current) return;
        unfollow(jobId);
        void queryClient.invalidateQueries({ queryKey: ["lectures", job.lecture_id] });
        if (pathnameRef.current !== `/forelesninger/${job.lecture_id}`) {
          toast(finishedText(job, job.lecture_name), { duration: TOAST_MS });
        }
      } catch (error) {
        // Gone (e.g. the lecture was deleted): stop following. Otherwise try
        // again after the next answer.
        if (error instanceof ApiError && error.status === 404) unfollow(jobId);
      } finally {
        checking.current.delete(jobId);
      }
    },
    [queryClient, unfollow],
  );

  const data = active.data;
  const updatedAt = active.dataUpdatedAt;
  useEffect(() => {
    if (!data) return;
    const running = new Set(data.map((job) => job.id));
    setFollowed((old) => {
      const missing = [...running].filter((id) => !old.has(id));
      return missing.length === 0 ? old : new Set([...old, ...missing]);
    });
    for (const jobId of followedRef.current) {
      if (!running.has(jobId)) void check(jobId);
    }
  }, [data, updatedAt, check]);

  return (
    <FollowJobContext.Provider value={follow}>
      {children}
      {toasterRoot ? createPortal(<Toaster />, toasterRoot) : null}
    </FollowJobContext.Provider>
  );
}
