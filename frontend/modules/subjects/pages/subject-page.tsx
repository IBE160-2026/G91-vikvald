"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";

import { fetchLectures, fetchSubject, lecturesQueryKey, subjectQueryKey } from "../api";
import { LectureFormDialog } from "../components/lecture-form-dialog";
import { LectureTable } from "../components/lecture-table";
import { SubjectFormDialog, type SubjectFormMode } from "../components/subject-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { formatWeekdayDate } from "../format";

// The subject page (mockup 03): the sidebar on the left; h1 with the name, the
// line «Eksamen fredag 04.12.2026», and the buttons «Ny forelesning», «Nytt navn»
// and «Endre eksamensdato». Under them the h2 «Forelesninger» («etter dato» in
// muted grey) and the lecture table, or «Ingen forelesninger ennå.». Someone
// else's or a missing subject shows «Fant ikke siden».
export function SubjectPage({ subjectId }: { subjectId: string }) {
  const subject = useQuery({ queryKey: subjectQueryKey(subjectId), queryFn: () => fetchSubject(subjectId) });
  const lectures = useQuery({
    queryKey: lecturesQueryKey(subjectId),
    queryFn: () => fetchLectures(subjectId),
    enabled: subject.isSuccess,
  });
  const [lectureDialogOpen, setLectureDialogOpen] = useState(false);
  // Which dialog was opened last; it keeps its mode while it closes.
  const [dialogMode, setDialogMode] = useState<SubjectFormMode>("rename");
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = subject.data?.name;
  useDocumentTitle(name ? `${name} – Studiekamerat` : null);

  function openDialog(mode: SubjectFormMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  if (subject.error) notFoundOnMissing(subject.error);

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SubjectSidebar currentSubjectId={subjectId} />
      <div className="min-w-0 flex-1 pt-7 pr-content-margin-right pb-7 pl-content-inset">
        {subject.isError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}

        {subject.data ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-page-title break-words">{subject.data.name}</h1>
                <p className="mt-1 text-body-sm text-ink-muted">
                  Eksamen {formatWeekdayDate(subject.data.exam_date)}
                </p>
              </div>
              <Button variant="outline" className="shrink-0" onClick={() => setLectureDialogOpen(true)}>
                <Plus {...iconProps} />
                Ny forelesning
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => openDialog("rename")}>
                Nytt navn
              </Button>
              <Button variant="outline" onClick={() => openDialog("examDate")}>
                Endre eksamensdato
              </Button>
            </div>

            <section aria-labelledby="lectures-heading" className="mt-6">
              <h2 id="lectures-heading" className="text-section-title">
                Forelesninger <span className="text-body-sm font-normal text-ink-muted">etter dato</span>
              </h2>
              <div className="mt-3">
                {lectures.isError ? (
                  <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
                    <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
                    <span>{FALLBACK_MESSAGE}</span>
                  </p>
                ) : null}
                {lectures.data && lectures.data.length > 0 ? <LectureTable lectures={lectures.data} /> : null}
                {lectures.data && lectures.data.length === 0 ? (
                  <p className="text-body-sm text-ink-muted">Ingen forelesninger ennå.</p>
                ) : null}
              </div>
            </section>

            <SubjectFormDialog
              mode={dialogMode}
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              subject={subject.data}
            />
            <LectureFormDialog
              mode="create"
              open={lectureDialogOpen}
              onClose={() => setLectureDialogOpen(false)}
              subjectId={subject.data.id}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
