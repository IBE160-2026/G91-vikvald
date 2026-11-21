"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileText, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";

import { iconProps } from "@/components/icon";
import { NoteSurface } from "@/components/note-surface";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { useAppConfig } from "@/lib/config";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { focusHeadingAfterNavigation } from "@/lib/focus-heading";
import { useDocumentTitle } from "@/lib/use-document-title";
import { deleteFile, fetchFileDeletePreview, fetchFiles, filesQueryKey } from "@/modules/files/api";
import { FileList } from "@/modules/files/components/file-list";
import { UploadZone } from "@/modules/files/components/upload-zone";
import type { UploadedFile } from "@/modules/files/types";

import {
  SUBJECTS_QUERY_KEY,
  deleteLecture,
  fetchLecture,
  fetchLectureDeletePreview,
  lectureQueryKey,
} from "../api";
import { LectureFormDialog, type LectureFormMode } from "../components/lecture-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { fileCountLabel, formatWeekdayDate, pageCountLabel } from "../format";

// The lecture page (mockup 04): the sidebar with the lecture's subject open and
// the lecture selected; h1 with the name, the line «Forelesning fredag
// 11.09.2026 · 2 filer · 18 sider», and the buttons «Nytt navn», «Endre
// dato» and «Slett forelesningen». Under them the h2 «Filer» with one file-row
// per file (each with «Slett»), the upload-zone, and in demo mode the note «I
// demomodus sendes ingenting ut.». Someone else's or a missing lecture shows
// «Fant ikke siden».
//
// Deleting (FR-7, FR-14) goes through the shared delete confirmation. After a
// file is deleted, focus goes to «Filer» (its row is gone, #75). After the
// lecture is deleted, she is taken to the subject page (03), whose h1 gets focus.
export function LecturePage({ lectureId }: { lectureId: string }) {
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const files = useQuery({
    queryKey: filesQueryKey(lectureId),
    queryFn: () => fetchFiles(lectureId),
    enabled: lecture.isSuccess,
  });
  const config = useAppConfig();
  const queryClient = useQueryClient();
  const router = useRouter();
  const filesHeadingRef = useRef<HTMLHeadingElement>(null);
  // The file whose «Slett» was pressed; kept while its dialog closes.
  const [fileToDelete, setFileToDelete] = useState<UploadedFile | null>(null);
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [lectureDialogOpen, setLectureDialogOpen] = useState(false);
  // Which dialog was opened last; it keeps its mode while it closes.
  const [dialogMode, setDialogMode] = useState<LectureFormMode>("rename");
  const [dialogOpen, setDialogOpen] = useState(false);
  const name = lecture.data?.name;
  useDocumentTitle(name ? `${name} – Studiekamerat` : null);

  function openDialog(mode: LectureFormMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  function openFileDialog(file: UploadedFile) {
    setFileToDelete(file);
    setFileDialogOpen(true);
  }

  function fileDeleted(file: UploadedFile, subjectId: string) {
    // Gone from the list at once; the counts on this page and the subject page are refetched.
    queryClient.setQueryData<UploadedFile[]>(filesQueryKey(lectureId), (old) =>
      old?.filter((other) => other.id !== file.id),
    );
    void queryClient.invalidateQueries({ queryKey: ["lectures", lectureId] });
    void queryClient.invalidateQueries({ queryKey: ["subjects", subjectId] });
  }

  function lectureDeleted(subjectId: string) {
    focusHeadingAfterNavigation();
    router.push(`/emner/${subjectId}`);
    // Only the subjects (list, the subject, its lectures, the sidebar). The
    // deleted lecture's own keys are left alone, so this page does not show
    // «Fant ikke siden» before she has left it.
    void queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY });
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
              <Button variant="outline" className="text-danger" onClick={() => setLectureDialogOpen(true)}>
                <Trash2 {...iconProps} />
                Slett forelesningen
              </Button>
            </div>

            {/* The left column of mockup 04 (496 px); «Lag og øv» comes to the right in epic 3. */}
            <section aria-labelledby="files-heading" className="mt-6 max-w-[496px]">
              <h2 id="files-heading" ref={filesHeadingRef} tabIndex={-1} className="text-section-title">
                Filer
              </h2>
              <div className="mt-3 flex flex-col gap-4">
                {files.isError ? (
                  <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
                    <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
                    <span>{FALLBACK_MESSAGE}</span>
                  </p>
                ) : null}
                {files.data ? <FileList files={files.data} onDelete={openFileDialog} /> : null}
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
            {fileToDelete ? (
              <DeleteConfirmDialog
                open={fileDialogOpen}
                title="Slette fila?"
                confirmLabel="Slett fila"
                item={{
                  name: fileToDelete.original_name,
                  detail: `${pageCountLabel(fileToDelete.page_count)} · ${lecture.data.name}`,
                  icon: <FileText {...iconProps} />,
                }}
                target="file"
                previewKey={["files", fileToDelete.id]}
                loadCounts={() => fetchFileDeletePreview(fileToDelete.id)}
                remove={() => deleteFile(fileToDelete.id)}
                onClose={() => setFileDialogOpen(false)}
                onDeleted={() => fileDeleted(fileToDelete, lecture.data.subject_id)}
                focusAfterDelete={() => filesHeadingRef.current}
              />
            ) : null}
            <DeleteConfirmDialog
              open={lectureDialogOpen}
              title="Slette forelesningen?"
              confirmLabel="Slett forelesningen"
              item={{ name: lecture.data.name }}
              target="lecture"
              previewKey={["lectures", lectureId]}
              loadCounts={() => fetchLectureDeletePreview(lectureId)}
              remove={() => deleteLecture(lectureId)}
              onClose={() => setLectureDialogOpen(false)}
              onDeleted={() => lectureDeleted(lecture.data.subject_id)}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
