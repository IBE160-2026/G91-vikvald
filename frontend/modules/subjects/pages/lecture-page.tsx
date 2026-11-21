"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { NoteSurface } from "@/components/note-surface";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { useAppConfig } from "@/lib/config";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchFiles, filesQueryKey } from "@/modules/files/api";
import { FileList } from "@/modules/files/components/file-list";
import { UploadZone } from "@/modules/files/components/upload-zone";

import { fetchLecture, lectureQueryKey } from "../api";
import { LectureFormDialog, type LectureFormMode } from "../components/lecture-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { fileCountLabel, formatWeekdayDate, pageCountLabel } from "../format";

// The lecture page (mockup 04): the sidebar with the lecture's subject open and
// the lecture selected; h1 with the name, the line «Forelesning fredag
// 11.09.2026 · 2 filer · 18 sider», and the buttons «Nytt navn» and «Endre
// dato». Under them the h2 «Filer» with one file-row per file, the upload-zone,
// and in demo mode the note «I demomodus sendes ingenting ut.». Someone else's
// or a missing lecture shows «Fant ikke siden».
export function LecturePage({ lectureId }: { lectureId: string }) {
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const files = useQuery({
    queryKey: filesQueryKey(lectureId),
    queryFn: () => fetchFiles(lectureId),
    enabled: lecture.isSuccess,
  });
  const config = useAppConfig();
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
            <p className="mt-1 text-body-sm text-ink-muted">
              Forelesning {formatWeekdayDate(lecture.data.date)}
              {files.data
                ? ` · ${fileCountLabel(files.data.length)} · ${pageCountLabel(
                    files.data.reduce((sum, file) => sum + file.page_count, 0),
                  )}`
                : null}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => openDialog("rename")}>
                Nytt navn
              </Button>
              <Button variant="outline" onClick={() => openDialog("date")}>
                Endre dato
              </Button>
            </div>

            {/* The left column of mockup 04 (496 px); «Lag og øv» comes to the right in epic 3. */}
            <section aria-labelledby="files-heading" className="mt-6 max-w-[496px]">
              <h2 id="files-heading" className="text-section-title">
                Filer
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {files.isError ? (
                  <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
                    <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
                    <span>{FALLBACK_MESSAGE}</span>
                  </p>
                ) : null}
                {files.data ? <FileList files={files.data} /> : null}
                {/* A new key per lecture, so the messages never follow her to another lecture. */}
                <UploadZone key={lectureId} lectureId={lectureId} subjectId={lecture.data.subject_id} />
                {config.data?.demo_mode ? <NoteSurface>I demomodus sendes ingenting ut.</NoteSurface> : null}
              </div>
            </section>

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
