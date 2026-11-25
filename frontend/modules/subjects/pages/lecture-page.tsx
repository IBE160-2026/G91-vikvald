"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleAlert, FileText, RotateCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { iconProps } from "@/components/icon";
import { NoteSurface } from "@/components/note-surface";
import { Button } from "@/components/ui/button";
import { ApiError, notFoundOnMissing } from "@/lib/api";
import { useAppConfig } from "@/lib/config";
import { focusHeadingAfterNavigation } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";
import { deleteFile, fetchFileDeletePreview, fetchFiles, filesQueryKey, replaceFile } from "@/modules/files/api";
import { FileList } from "@/modules/files/components/file-list";
import { UploadZone, rejectionText } from "@/modules/files/components/upload-zone";
import type { UploadedFile } from "@/modules/files/types";
import { FlashcardsRow } from "@/modules/generation/components/flashcards-row";
import { FreetextRow } from "@/modules/generation/components/freetext-row";
import { QuizRow } from "@/modules/generation/components/quiz-row";
import { OVERVIEW_QUERY_KEY } from "@/modules/practice/api";

import {
  SUBJECTS_QUERY_KEY,
  deleteLecture,
  fetchLecture,
  fetchLectureDeletePreview,
  lectureQueryKey,
} from "../api";
import { LectureFormDialog, type LectureFormMode } from "../components/lecture-form-dialog";
import { SemesterTimeline } from "../components/semester-timeline";
import { SubjectSidebar } from "../components/subject-sidebar";
import { fileCountLabel, formatWeekdayDate, pageCountLabel } from "../format";

// The codes that mean the new file was rejected (the same as for an upload).
const REPLACE_REJECTIONS = new Set([
  "NOT_PDF",
  "NO_READABLE_TEXT",
  "TOO_MANY_PAGES",
  "FILE_TOO_LARGE",
  "PDF_UNREADABLE",
  "TERMS_NOT_ACCEPTED",
  "VALIDATION_ERROR",
]);

// The lecture page (mockup 04): the sidebar with the lecture's subject open and
// the lecture selected; h1 with the name, the line «Forelesning fredag
// 11.09.2026 · 2 filer · 18 sider», and the buttons «Nytt navn», «Endre
// dato» and «Slett forelesningen». Under them the h2 «Filer» with one file-row
// per file (each with «Erstatt» and «Slett»), the upload-zone, and in demo mode the note «I
// demomodus sendes ingenting ut.». Next to it the h2 «Lag og øv» with the
// Flashcards create-row (stories 3.1 and 3.2), which gets the file and page
// counts for its dialog «Lag flashcards». Between the buttons and «Filer»
// stands the semester line for the lecture's subject, with «Du er her» at this
// lecture (story 5.5). Someone else's or a missing lecture shows
// «Fant ikke siden».
//
// Deleting (FR-7, FR-14) goes through the shared delete confirmation. After a
// file is deleted, focus goes to «Filer» (its row is gone, #75). After the
// lecture is deleted, she is taken to the subject page (03), whose h1 gets focus.
//
// Replacing a file (FR-13): «Erstatt» on a row opens the file picker, then the
// same confirmation with «Erstatte fila?», the old file in the box, «Erstattes
// med <new filename>.» and «Erstatt fila». Accepted: the old file leaves the
// list and the new one comes last, and focus goes to «Filer». Rejected (E17):
// the dialog closes, «<new filename>: <message>» stands by the row, and focus
// goes back to «Erstatt».
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
  // The file whose «Erstatt» was used and the new version; kept while its dialog closes.
  const [replacing, setReplacing] = useState<{ file: UploadedFile; replacement: File } | null>(null);
  const [replaceDialogOpen, setReplaceDialogOpen] = useState(false);
  // The new file from a successful replace, read by replaced().
  const replacedRef = useRef<UploadedFile | null>(null);
  // «<new filename>: <message>» by the id of the file that was not replaced.
  const [replaceRejections, setReplaceRejections] = useState<Record<string, string>>({});
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

  function openReplaceDialog(file: UploadedFile, replacement: File) {
    // A new pick on this row clears its old message.
    setReplaceRejections(({ [file.id]: _old, ...rest }) => rest);
    replacedRef.current = null;
    setReplacing({ file, replacement });
    setReplaceDialogOpen(true);
  }

  async function replace(file: UploadedFile, replacement: File) {
    replacedRef.current = await replaceFile(file.id, replacement);
  }

  function replaced(file: UploadedFile, subjectId: string) {
    // The old file goes and the new one comes last (the newest upload). After a
    // 404 (already gone) there is no new file; the list is refetched anyway.
    const created = replacedRef.current;
    queryClient.setQueryData<UploadedFile[]>(filesQueryKey(lectureId), (old) => {
      const kept = old?.filter((other) => other.id !== file.id);
      return kept && created ? [...kept, created] : kept;
    });
    void queryClient.invalidateQueries({ queryKey: ["lectures", lectureId] });
    void queryClient.invalidateQueries({ queryKey: ["subjects", subjectId] });
  }

  // A rejected new file is shown by the row, not in the dialog (E17).
  function replaceRejected(file: UploadedFile, replacement: File, error: unknown): boolean {
    if (!(error instanceof ApiError) || !REPLACE_REJECTIONS.has(error.code)) return false;
    setReplaceRejections((old) => ({ ...old, [file.id]: rejectionText(replacement, error) }));
    return true;
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
    // The overview too: the semester line shows its lectures (story 5.5).
    void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
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

            <div className="mt-6">
              <SemesterTimeline
                variant="lecture"
                subjectId={lecture.data.subject_id}
                currentLectureId={lectureId}
              />
            </div>

            {/* Mockup 04: «Filer» (up to 496 px) and «Lag og øv» (up to 512 px) side by
                side, each at least 360 px; below that they wrap, «Lag og øv» under «Filer». */}
            <div className="mt-6 flex flex-wrap items-start gap-column-gap">
              <section aria-labelledby="files-heading" className="min-w-0 max-w-[496px] flex-1 basis-[360px]">
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
                  {files.data ? (
                    <FileList
                      files={files.data}
                      onDelete={openFileDialog}
                      onReplace={openReplaceDialog}
                      rejections={replaceRejections}
                    />
                  ) : null}
                  {/* A new key per lecture, so the messages never follow her to another lecture. */}
                  <UploadZone key={lectureId} lectureId={lectureId} subjectId={lecture.data.subject_id} />
                  {/* Mockup 04: the privacy note. In demo mode nothing leaves the app; with
                      Gemini the notes go to Google in the EU. Nothing until the config is known. */}
                  {config.data ? (
                    config.data.demo_mode ? (
                      <NoteSurface>I demomodus sendes ingenting ut.</NoteSurface>
                    ) : (
                      <NoteSurface>
                        <p className="text-ink">Notatene sendes til Googles språkmodell i EU.</p>
                        <p>Ikke last opp personopplysninger, f.eks. navn på medstudenter.</p>
                      </NoteSurface>
                    )
                  ) : null}
                </div>
              </section>

              <section aria-labelledby="create-heading" className="min-w-0 max-w-[512px] flex-1 basis-[360px]">
                <h2 id="create-heading" className="text-section-title">
                  Lag og øv
                </h2>
                {/* One row per content type, separated by a divider line. */}
                <div className="mt-3 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift">
                  <FlashcardsRow
                    key={`flashcards-${lectureId}`}
                    lectureId={lectureId}
                    lectureName={lecture.data.name}
                    fileCount={files.data?.length}
                    pageCount={files.data?.reduce((sum, file) => sum + file.page_count, 0)}
                  />
                  <QuizRow
                    key={`quiz-${lectureId}`}
                    lectureId={lectureId}
                    lectureName={lecture.data.name}
                    fileCount={files.data?.length}
                    pageCount={files.data?.reduce((sum, file) => sum + file.page_count, 0)}
                  />
                  {/* Behind FEATURE_FREETEXT (story 8.1): not shown while the config loads. */}
                  {config.data?.feature_freetext === true ? (
                    <FreetextRow
                      key={`freetext-${lectureId}`}
                      lectureId={lectureId}
                      lectureName={lecture.data.name}
                      fileCount={files.data?.length}
                      pageCount={files.data?.reduce((sum, file) => sum + file.page_count, 0)}
                    />
                  ) : null}
                </div>
              </section>
            </div>

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
            {replacing ? (
              <DeleteConfirmDialog
                open={replaceDialogOpen}
                title="Erstatte fila?"
                confirmLabel="Erstatt fila"
                confirmIcon={<RotateCw {...iconProps} />}
                item={{
                  name: replacing.file.original_name,
                  detail: `${pageCountLabel(replacing.file.page_count)} · ${lecture.data.name}`,
                  icon: <FileText {...iconProps} />,
                }}
                note={`Erstattes med ${replacing.replacement.name}.`}
                target="file"
                previewKey={["files", replacing.file.id, "replace"]}
                loadCounts={() => fetchFileDeletePreview(replacing.file.id)}
                remove={() => replace(replacing.file, replacing.replacement)}
                onRemoveError={(error) => replaceRejected(replacing.file, replacing.replacement, error)}
                onClose={() => setReplaceDialogOpen(false)}
                onDeleted={() => replaced(replacing.file, lecture.data.subject_id)}
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
