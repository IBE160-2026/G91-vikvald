"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileText, Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCallback } from "react";

import { FormulaFlag } from "@/components/formula-flag";
import { iconProps } from "@/components/icon";
import { NoteSurface } from "@/components/note-surface";
import { SourceLink } from "@/components/source-link";
import { ApiError, notFoundOnMissing } from "@/lib/api";
import { formatLocalDate } from "@/lib/dates";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";
import { SummaryRemake } from "@/modules/generation/components/summary-remake";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";
import { SubjectSidebar } from "@/modules/subjects/components/subject-sidebar";
import { fileCountLabel, pageCountLabel } from "@/modules/subjects/format";

import { fetchSummary, summaryQueryKey } from "../api";
import type { Summary } from "../types";

// A missing summary, someone else's lecture (NOT_FOUND) and FEATURE_SUMMARY
// off (FEATURE_DISABLED) all show «Fant ikke siden».
function notFoundWhenMissingOrOff(error: unknown): void {
  if (error instanceof ApiError && error.code === "FEATURE_DISABLED") notFound();
  notFoundOnMissing(error);
}

function pointCountLabel(count: number): string {
  return `${count} ${count === 1 ? "punkt" : "punkter"}`;
}

function themeCountLabel(count: number): string {
  return `${count} ${count === 1 ? "tema" : "temaer"}`;
}

// «7 punkter i 3 temaer · laget 10.11.2026 fra 2 filer» (the date in local time).
export function summarySubtitle(summary: Summary): string {
  return (
    `${pointCountLabel(summary.point_count)} i ${themeCountLabel(summary.themes.length)}` +
    ` · laget ${formatLocalDate(summary.created_at)} fra ${fileCountLabel(summary.files.length)}`
  );
}

// The summary page (story 9.2, FR-54, FR-55, UX-DR38, mockup 13): the sidebar
// with the lecture selected, the breadcrumbs «<subject> › <lecture>» as links,
// one h1 «Sammendrag» and the line «7 punkter i 3 temaer · laget 10.11.2026
// fra 2 filer». The summary is read as an article in a column of at most
// 568 px: each theme an h2 with its points as a list, each point with the
// formula flag and the source («merkevare-notater.pdf, side 4») under the
// text. Generated text is shown as plain text.
//
// After the article in the DOM (to the right on a wide screen) stands the
// content card: INNHOLD (the themes and their number of points), KILDER (the
// files the points come from and their pages), and «Lag nytt sammendrag»
// (SummaryRemake). Under the card the note that a language model made the
// summary. While a new summary is made, the old one stays.
//
// Reading saves no session and does not mark the lecture as practised (FR-56).
export function SummaryPage({ lectureId }: { lectureId: string }) {
  const queryClient = useQueryClient();
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const subjectId = lecture.data?.subject_id;
  const subject = useQuery({
    queryKey: subjectQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubject(subjectId!),
    enabled: subjectId !== undefined,
  });
  const summary = useQuery({ queryKey: summaryQueryKey(lectureId), queryFn: () => fetchSummary(lectureId) });
  const lectureName = lecture.data?.name;
  useDocumentTitle(lectureName ? `Sammendrag – ${lectureName} – Studiekamerat` : null);

  const refetchSummary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: summaryQueryKey(lectureId) });
  }, [queryClient, lectureId]);

  if (lecture.error) notFoundWhenMissingOrOff(lecture.error);
  if (summary.error) notFoundWhenMissingOrOff(summary.error);

  // Only while there is no summary to show: a failed refetch keeps the old one.
  const loadError = (lecture.isError || summary.isError) && !summary.data;

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SubjectSidebar currentSubjectId={subjectId} currentLectureId={lectureId} />
      <div className="min-w-0 flex-1 pt-7 pr-content-margin-right pb-7 pl-content-inset">
        {loadError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}

        {lecture.data && summary.data ? (
          <div className="flex flex-wrap items-start gap-column-gap">
            <div className="min-w-0 max-w-article-width flex-1 basis-[360px]">
              <nav aria-label="Brødsmuler">
                <ol className="flex flex-wrap items-center gap-2 text-meta-strong text-ink-muted">
                  <li>
                    <Link href={`/emner/${encodeURIComponent(lecture.data.subject_id)}`} className="hover:text-ink">
                      {subject.data?.name ?? "Emnet"}
                    </Link>
                  </li>
                  <li aria-hidden="true">›</li>
                  <li className="min-w-0 break-words">
                    <Link href={`/forelesninger/${encodeURIComponent(lectureId)}`} className="hover:text-ink">
                      {lecture.data.name}
                    </Link>
                  </li>
                </ol>
              </nav>
              <h1 className="mt-4 text-page-title">Sammendrag</h1>
              <p className="mt-1 text-body-sm text-ink-muted">{summarySubtitle(summary.data)}</p>

              <article aria-label={`Sammendrag av ${lecture.data.name}`} className="mt-6 flex flex-col gap-6">
                {summary.data.themes.map((theme, index) => (
                  <section key={`${index}-${theme.title}`} aria-labelledby={`summary-theme-${index}`}>
                    <h2 id={`summary-theme-${index}`} className="text-section-title break-words">
                      {theme.title}
                    </h2>
                    <ul className="mt-3 flex list-disc flex-col gap-4 pl-5 marker:text-ink-muted">
                      {theme.points.map((point) => (
                        <li key={point.id} className="text-body text-ink">
                          <p className="break-words">{point.text}</p>
                          <FormulaFlag flagged={point.formula_flag} className="mt-2" />
                          <SourceLink source={point.source} className="mt-1" />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </article>
            </div>

            <aside aria-label="Om sammendraget" className="w-full max-w-[360px] min-w-0 flex-1 basis-[280px] lg:ml-auto">
              <div className="rounded-lg border border-border-card bg-surface p-4 shadow-lift">
                <h2 className="text-overline text-ink-muted uppercase">Innhold</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {summary.data.themes.map((theme, index) => (
                    <li key={`${index}-${theme.title}`} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-body-sm font-medium break-words text-ink">{theme.title}</span>
                      <span className="shrink-0 text-meta text-ink-muted">{pointCountLabel(theme.points.length)}</span>
                    </li>
                  ))}
                </ul>
                <h2 className="mt-6 text-overline text-ink-muted uppercase">Kilder</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {summary.data.files.map((file) => (
                    <li key={file.file_id} className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-start gap-2 text-meta-strong text-ink">
                        <FileText {...iconProps} className="mt-[2px] shrink-0" />
                        <span className="min-w-0 break-words">{file.file_name}</span>
                      </span>
                      <span className="shrink-0 text-meta text-ink-muted">{pageCountLabel(file.page_count)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <SummaryRemake lectureId={lectureId} lectureName={lecture.data.name} onJobEnded={refetchSummary} />
                </div>
              </div>
              <NoteSurface icon={Info} className="mt-4">
                <p className="text-ink">Sammendraget er laget av en språkmodell. Sjekk viktige punkter mot kilden.</p>
              </NoteSurface>
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
