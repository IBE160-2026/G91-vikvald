"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";

import { fetchLecture, lectureQueryKey } from "../api";
import { LectureFormDialog, type LectureFormMode } from "../components/lecture-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { formatWeekdayDate } from "../format";

// The lecture page (mockup 04): the sidebar with the lecture's subject open and
// the lecture selected; h1 with the name, the line «Forelesning fredag
// 11.09.2026», and the buttons «Nytt navn» and «Endre dato». Files come in
// story 2.3. Someone else's or a missing lecture shows «Fant ikke siden».
export function LecturePage({ lectureId }: { lectureId: string }) {
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  // Which dialog was opened last; it keeps its mode while it closes.
  const [dialogMode, setDialogMode] = useState<LectureFormMode>("rename");
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = lecture.data?.name;
  useDocumentTitle(name ? `${name} – Studiekamerat` : null);

  function openDialog(mode: LectureFormMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  if (lecture.error) notFoundOnMissing(lecture.error);

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SubjectSidebar currentSubjectId={lecture.data?.subject_id} currentLectureId={lectureId} />
      <div className="min-w-0 flex-1 pt-7 pr-content-margin-right pb-7 pl-content-inset">
        {lecture.isError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}

        {lecture.data ? (
          <>
            <h1 className="text-page-title break-words">{lecture.data.name}</h1>
            <p className="mt-1 text-body-sm text-ink-muted">Forelesning {formatWeekdayDate(lecture.data.date)}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => openDialog("rename")}>
                Nytt navn
              </Button>
              <Button variant="outline" onClick={() => openDialog("date")}>
                Endre dato
              </Button>
            </div>
            <LectureFormDialog
              mode={dialogMode}
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              lecture={lecture.data}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
