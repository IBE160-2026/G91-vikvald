"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus } from "lucide-react";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";

import { fetchSubject, subjectQueryKey } from "../api";
import { SubjectFormDialog, type SubjectFormMode } from "../components/subject-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { formatWeekdayDate } from "../format";

// The subject page (mockup 03): the sidebar on the left; h1 with the name, the
// line «Eksamen fredag 04.12.2026», and the buttons «Ny forelesning» (comes in
// story 2.2), «Nytt navn» and «Endre eksamensdato». Someone else's or a missing
// subject shows «Fant ikke siden».
export function SubjectPage({ subjectId }: { subjectId: string }) {
  const subject = useQuery({ queryKey: subjectQueryKey(subjectId), queryFn: () => fetchSubject(subjectId) });
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
              <Button variant="outline" disabled className="shrink-0">
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
            <SubjectFormDialog
              mode={dialogMode}
              open={dialogOpen}
              onClose={() => setDialogOpen(false)}
              subject={subject.data}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
