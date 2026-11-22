"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CircleAlert, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { focusHeadingAfterNavigation, useFocusHeadingOnArrival } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchFileCounts, fileCountsQueryKey } from "@/modules/files/api";
import {
  OVERVIEW_QUERY_KEY,
  fetchOverview,
  fetchSubjectFlashcards,
  fetchSubjectQuizQuestions,
  subjectFlashcardsQueryKey,
  subjectQuizQuestionsQueryKey,
} from "@/modules/practice/api";
import { PracticeAllCard, type PracticeAllRow } from "@/modules/practice/components/practice-all-card";
import { lastSessionLines } from "@/modules/practice/last-session";
import type { QuizQuestion, SubjectFlashcard } from "@/modules/practice/types";

import {
  SUBJECTS_QUERY_KEY,
  deleteSubject,
  fetchLectures,
  fetchSubject,
  fetchSubjectDeletePreview,
  lecturesQueryKey,
  subjectQueryKey,
} from "../api";
import { LectureFormDialog } from "../components/lecture-form-dialog";
import { LectureTable } from "../components/lecture-table";
import { SubjectFormDialog, type SubjectFormMode } from "../components/subject-form-dialog";
import { SubjectSidebar } from "../components/subject-sidebar";
import { fileCountLabel, formatWeekdayDate, lectureCountLabel } from "../format";

// The subject page (mockup 03): the sidebar on the left; h1 with the name, the
// line «8 forelesninger · 11 filer · eksamen fredag 04.12.2026», and the buttons «Ny forelesning», «Nytt navn»
// «Endre eksamensdato» and «Slett emnet». Under them the h2 «Forelesninger»
// («etter dato» in muted grey) and the lecture table, or «Ingen forelesninger
// ennå.». Next to the table (under it when the content area is narrower than
// 1008 px, a container query) stands practice-all-card «Øv på hele emnet»
// (story 3.6) with the row Flashcards («120 kort fra 6 forelesninger», «Øv på
// flashcards»), shown only when the subject has cards, and under it the row
// Quiz («8 spørsmål fra 2 forelesninger», «Start ›», story 4.4), shown only
// when the subject has quiz questions. At the bottom of the card stands SISTE
// ØKT (story 5.1), from GET /api/overview, when the subject has a session.
// Someone else's or a missing subject shows «Fant ikke siden».
//
// After a lecture is deleted on 04 she lands here, and the h1 gets focus (#75).
// After the subject is deleted (FR-6) she is taken to the front page (02).
export function SubjectPage({ subjectId }: { subjectId: string }) {
  const subject = useQuery({ queryKey: subjectQueryKey(subjectId), queryFn: () => fetchSubject(subjectId) });
  const lectures = useQuery({
    queryKey: lecturesQueryKey(subjectId),
    queryFn: () => fetchLectures(subjectId),
    enabled: subject.isSuccess,
  });
  const fileCounts = useQuery({
    queryKey: fileCountsQueryKey(subjectId),
    queryFn: () => fetchFileCounts(subjectId),
    enabled: subject.isSuccess,
  });
  const flashcards = useQuery({
    queryKey: subjectFlashcardsQueryKey(subjectId),
    queryFn: () => fetchSubjectFlashcards(subjectId),
    enabled: subject.isSuccess,
  });
  const quizQuestions = useQuery({
    queryKey: subjectQuizQuestionsQueryKey(subjectId),
    queryFn: () => fetchSubjectQuizQuestions(subjectId),
    enabled: subject.isSuccess,
  });
  // Shared with the sidebar (same key), and refetched when a session is saved.
  const overview = useQuery({ queryKey: OVERVIEW_QUERY_KEY, queryFn: fetchOverview });
  const overviewSubject = overview.data?.subjects.find((item) => item.id === subjectId);
  const lastSession = overviewSubject?.last_session
    ? lastSessionLines(
        overviewSubject.last_session,
        (lectureId) => overviewSubject.lectures.find((lecture) => lecture.id === lectureId)?.name,
      )
    : null;
  const practiceRows = [
    ...flashcardRows(subjectId, flashcards.data),
    ...quizRows(subjectId, quizQuestions.data),
  ];
  // Only a failed first load shows the fallback text; a failed background
  // refetch keeps the row it has.
  const practiceError =
    (flashcards.isError && flashcards.data === undefined) ||
    (quizQuestions.isError && quizQuestions.data === undefined);
  const [lectureDialogOpen, setLectureDialogOpen] = useState(false);
  // Which dialog was opened last; it keeps its mode while it closes.
  const [dialogMode, setDialogMode] = useState<SubjectFormMode>("rename");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useFocusHeadingOnArrival(headingRef, subject.isSuccess);
  const name = subject.data?.name;
  useDocumentTitle(name ? `${name} – Studiekamerat` : null);

  function openDialog(mode: SubjectFormMode) {
    setDialogMode(mode);
    setDialogOpen(true);
  }

  function subjectDeleted() {
    focusHeadingAfterNavigation();
    router.push("/");
    // Only the list: this subject's own keys are left alone, so this page does
    // not show «Fant ikke siden» before she has left it.
    void queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY, exact: true });
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
                <h1 ref={headingRef} tabIndex={-1} className="text-page-title break-words">
                  {subject.data.name}
                </h1>
                <p className="mt-1 text-body-sm text-ink-muted">
                  {lectureCountLabel(subject.data.lecture_count)}
                  {fileCounts.data ? ` · ${fileCountLabel(fileCounts.data.file_count)}` : null}
                  {` · eksamen ${formatWeekdayDate(subject.data.exam_date)}`}
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
              <Button variant="outline" className="text-danger" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 {...iconProps} />
                Slett emnet
              </Button>
            </div>

            <div className="@container mt-6">
              <div className="flex flex-col gap-column-gap @min-[1008px]:flex-row @min-[1008px]:items-start">
                <section aria-labelledby="lectures-heading" className="min-w-0 flex-1">
                  <h2 id="lectures-heading" className="text-section-title">
                    Forelesninger <span className="text-body-sm font-normal text-ink-muted">etter dato</span>
                  </h2>
                  <div className="mt-3">
                    {lectures.isError || fileCounts.isError ? (
                      <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
                        <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
                        <span>{FALLBACK_MESSAGE}</span>
                      </p>
                    ) : null}
                    {lectures.data && lectures.data.length > 0 ? <LectureTable lectures={lectures.data} fileCounts={fileCounts.data} /> : null}
                    {lectures.data && lectures.data.length === 0 ? (
                      <p className="text-body-sm text-ink-muted">Ingen forelesninger ennå.</p>
                    ) : null}
                  </div>
                </section>
                {practiceRows.length > 0 || practiceError ? (
                  <div className="@min-[1008px]:w-[344px] @min-[1008px]:shrink-0">
                    <PracticeAllCard rows={practiceRows} error={practiceError} lastSession={lastSession} />
                  </div>
                ) : null}
              </div>
            </div>

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
            <DeleteConfirmDialog
              open={deleteDialogOpen}
              title="Slette emnet?"
              confirmLabel="Slett emnet"
              item={{ name: subject.data.name }}
              target="subject"
              previewKey={["subjects", subjectId]}
              loadCounts={() => fetchSubjectDeletePreview(subjectId)}
              remove={() => deleteSubject(subjectId)}
              onClose={() => setDeleteDialogOpen(false)}
              onDeleted={subjectDeleted}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

// The row Flashcards in «Øv på hele emnet»: «N kort fra M forelesninger» (M is
// the number of lectures the cards come from) and «Øv på flashcards». No row
// while the cards load or when the subject has none.
function flashcardRows(subjectId: string, cards: SubjectFlashcard[] | undefined): PracticeAllRow[] {
  if (!cards || cards.length === 0) return [];
  const lectures = new Set(cards.map((card) => card.lecture.id)).size;
  return [
    {
      id: "flashcards",
      title: "Flashcards",
      scope: `${cards.length} kort fra ${lectureCountLabel(lectures)}`,
      action: (
        <Button asChild>
          <Link href={`/emner/${subjectId}/flashcards`}>Øv på flashcards</Link>
        </Button>
      ),
    },
  ];
}

// The row Quiz in «Øv på hele emnet», under Flashcards: «N spørsmål fra M
// forelesninger» (M is the number of lectures the questions come from) and the
// text button «Start ›», read as «Start quiz på hele emnet». Always on one
// line. No row while the questions load or when the subject has none.
function quizRows(subjectId: string, questions: QuizQuestion[] | undefined): PracticeAllRow[] {
  if (!questions || questions.length === 0) return [];
  const lectures = new Set(questions.map((question) => question.lecture.id)).size;
  return [
    {
      id: "quiz",
      title: "Quiz",
      scope: `${questions.length} spørsmål fra ${lectureCountLabel(lectures)}`,
      inline: true,
      action: (
        // -mr-2: the text button's padding lies in the card's padding, so the
        // arrow ends at the card's inner edge (mockup 03) and the scope keeps
        // one line in the 344 px card.
        <Button asChild variant="text" className="-mr-2">
          <Link href={`/emner/${subjectId}/quiz`}>
            Start <span className="sr-only">quiz på hele emnet</span>
            <ArrowRight {...iconProps} />
          </Link>
        </Button>
      ),
    },
  ];
}
