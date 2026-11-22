"use client";

import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";

import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import { iconProps } from "@/components/icon";
import { SideMenu, useCloseSideMenu, useOpenShortcuts, useSideMenuCollapsed } from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { usePracticeShortcuts, useShortcutsEnabled, type ShortcutBinding } from "@/lib/practice-shortcuts";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";

import { quizAdapter } from "../adapter";
import {
  deleteQuizQuestion,
  fetchLectureQuizQuestions,
  fetchSubjectQuizQuestions,
  isSubjectPracticeQueryKey,
  lectureQuizQuestionsQueryKey,
  subjectQuizQuestionsQueryKey,
} from "../api";
import { MissedList, type MissedQuizItem } from "../components/missed-list";
import { QuizQuestion } from "../components/quiz-question";
import { ResultSummary } from "../components/result-summary";
import { SessionPanel } from "../components/session-panel";
import { ShortcutHints, quizResultHints } from "../components/shortcut-hints";
import {
  advance,
  answerCurrent,
  currentCard,
  gridCells,
  isFinished,
  removeCard,
  sessionCounts,
  shownCount,
  shuffle,
  startSession,
  totalCount,
  type SessionState,
} from "../session";
import type { QuizQuestion as QuizQuestionData } from "../types";
import { useSessionSaver, type SaverSnapshot } from "../use-session-saver";

const FINISHED = "Økten er ferdig";
const FINISHED_SAVED = "Økten er ferdig og lagret";

// The questions of a session: copied once from the first fetch made after the
// page opened, by id. answers holds the option (0–3) she confirmed on each
// question (the first confirmation counts), for the list of wrong answers.
type Session = {
  questions: Record<string, QuizQuestionData>;
  state: SessionState;
  answers: Record<string, number>;
};

// A new session over these questions, in a new random order (FR-34).
function newSession(questions: readonly QuizQuestionData[]): Session {
  return {
    questions: Object.fromEntries(questions.map((question) => [question.id, question])),
    state: startSession(shuffle(questions.map((question) => question.id))),
    answers: {},
  };
}

// Where the session's questions come from: one lecture (story 4.2) or the
// whole subject (story 4.4).
type ScopeProps = { lectureId: string; subjectId?: undefined } | { subjectId: string; lectureId?: undefined };

// What differs between a lecture quiz and a subject quiz: where the questions
// come from, the name in the panel and the result, the way back, and what is
// saved. Everything else in the session is the same code (mirrors useScope in
// flashcard-session-page.tsx).
type Scope = {
  // The query for the lecture or subject itself: its error (404) counts.
  owner: UseQueryResult<unknown>;
  questions: UseQueryResult<QuizQuestionData[]>;
  // The lecture's or the subject's name (the document title); undefined while loading.
  name: string | undefined;
  // The panel's and the result's scope: the lecture name or «<subject>, hele emnet».
  scopeName: string | undefined;
  colorIndex: number | undefined;
  // Saved with the session: the subject, and the lecture (null for a subject session).
  saveSubjectId: string | undefined;
  saveLectureId: string | null;
  backPath: string;
  backText: string;
  // The hint line's text for Esc on the result page.
  backHint: string;
  // A subject session shows each wrong answer's lecture in the list.
  showLecture: boolean;
};

function useQuizScope({ lectureId, subjectId }: ScopeProps): Scope {
  const lecture = useQuery({
    queryKey: lectureQueryKey(lectureId ?? ""),
    queryFn: () => fetchLecture(lectureId ?? ""),
    enabled: lectureId !== undefined,
  });
  const ownSubjectId = subjectId ?? lecture.data?.subject_id;
  const subject = useQuery({
    queryKey: subjectQueryKey(ownSubjectId ?? ""),
    queryFn: () => fetchSubject(ownSubjectId ?? ""),
    enabled: ownSubjectId !== undefined,
  });
  const lectureQuestions = useQuery({
    queryKey: lectureQuizQuestionsQueryKey(lectureId ?? ""),
    queryFn: () => fetchLectureQuizQuestions(lectureId ?? ""),
    enabled: lectureId !== undefined && lecture.isSuccess,
  });
  const subjectQuestions = useQuery({
    queryKey: subjectQuizQuestionsQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubjectQuizQuestions(subjectId ?? ""),
    enabled: subjectId !== undefined && subject.isSuccess,
  });

  if (subjectId !== undefined) {
    const name = subject.data?.name;
    return {
      owner: subject,
      questions: subjectQuestions,
      name,
      scopeName: name === undefined ? undefined : `${name}, hele emnet`,
      colorIndex: subject.data?.color_index,
      saveSubjectId: subjectId,
      saveLectureId: null,
      backPath: `/emner/${subjectId}`,
      backText: "Tilbake til emnet",
      backHint: "tilbake til emnet",
      showLecture: true,
    };
  }
  return {
    owner: lecture,
    questions: lectureQuestions,
    name: lecture.data?.name,
    scopeName: lecture.data?.name,
    colorIndex: subject.data?.color_index,
    saveSubjectId: lecture.data?.subject_id,
    saveLectureId: lectureId ?? null,
    backPath: `/forelesninger/${lectureId}`,
    backText: "Tilbake til forelesningen",
    backHint: "tilbake til forelesningen",
    showLecture: false,
  };
}

// The quiz session for one lecture (story 4.2, mockup 09), at
// /forelesninger/<id>/quiz. It is built on the practice frame from epic 3: the
// session panel with the quiz adapter («Quiz», «3 riktige · 1 feil», the
// answer grid read as «Spørsmål 4: feil»), the pure session functions
// (answerCurrent when an answer is confirmed, advance on «Neste spørsmål»),
// the shared keys and useSessionSaver with kind "quiz".
//
// The questions are shuffled and copied into component state the first time
// they arrive (from a fetch made after the page opened); a refetch never
// changes a session in progress. Each question is asked once.
//
// No questions: no panel and no session, only the h1 «Det finnes ingen
// quizspørsmål her ennå.» and «Tilbake til forelesningen». Someone else's or a
// missing lecture shows «Fant ikke siden»; other errors show the fallback text
// in role="alert".
//
// Saving (FR-56): answered = confirmed answers, partial 0. The last «Se
// resultatet» finishes the session (sent once with aborted=false). «Avslutt
// økt» or Esc with at least one confirmed answer sends it as aborted and shows
// the result; with none it goes straight back and sends nothing. Navigation,
// «Logg ut» and pagehide work as in epic 3 (the saver).
//
// The result (story 4.3, mockup 10): result-summary with kind="quiz" (the
// overline «QUIZ FERDIG», the h2 «11 av 15 riktige» or «Avbrutt etter 12 av
// 20», the lecture's name and how many she got wrong), the fallback text if
// saving failed, missed-list with kind="quiz" (her answer, the correct answer,
// the explanation and the source for each wrong answer), and a footer with the
// hint line on the left and «Tilbake til forelesningen» (outline link) and
// «Ta quizen igjen» (primary) on the right. The title gets focus. Enter takes
// the quiz again (not while another button or link has focus), Esc goes back.
//
// «Ta quizen igjen» fetches the questions again (if that fails, the session's
// own questions are used), starts the saver over with a new session_id, and
// starts a new session in a new order with focus on the first question. A ref
// keeps a double press during the fetch from starting two sessions.
//
// Keys (lib/practice-shortcuts.ts): «a»–«d» and «A»–«D» choose (single keys,
// only before confirmation), Enter confirms when something is chosen (and
// does nothing otherwise) and goes to the next question after confirmation,
// Esc ends the session, and «?» opens the shortcut dialog. Enter on a focused
// button does only what that button does.
//
// Narrow screen: the panel is behind «Meny» (SideMenu), with the hidden h1 «Quiz».
//
// The whole subject (story 4.4), at /emner/<id>/quiz: the questions from all
// the subject's lectures; the panel and the result say «<subject>, hele
// emnet» with the subject's colour; the explanation card shows each
// question's own lecture, and so does the list of wrong answers (under the
// source). The session is saved with lecture_id null, and every way back
// («Tilbake til emnet», Esc, «Avslutt økt» with nothing confirmed, the empty
// state) goes to the subject page. The text «lecture» above means the subject
// for a subject session.
//
// Delete (story 4.5, E22): «Slett» in the question's footer (before and after
// confirmation) opens the shared delete confirmation («Slette spørsmålet?», the
// question's text, no counts). «Avbryt» and Esc delete nothing and give focus
// back to «Slett»; the keys are off while the dialog is open. Deleted (204, or
// 404 when it was already gone): the question leaves the session with
// removeCard. An unconfirmed question leaves the counter, the grid and the
// total; a confirmed one keeps its answer in the score, the grid and the list
// of wrong answers. The next question is shown with no choice and focus on its
// title. No questions left to show: with something confirmed the session is
// finished (saved as not aborted, the result page); with nothing confirmed (no
// questions left at all) she goes back to where the session started, and
// nothing is saved. The session's own question list in the cache loses the
// question, and the question's lecture and every subject's practice lists are
// refetched, so the lecture page, the subject page and «Ta quizen igjen» show
// the right numbers.
export function QuizSessionPage(props: ScopeProps) {
  const router = useRouter();
  const scope = useQuizScope(props);
  const { owner, questions } = scope;
  const [session, setSession] = useState<Session | null>(null);
  // The chosen option (0–3) of the current question, or null.
  const [selected, setSelected] = useState<number | null>(null);
  // The number of questions moved past. After the first, a new question puts
  // focus on its title.
  const [step, setStep] = useState(0);
  const [aborted, setAborted] = useState(false);
  // «Ta quizen igjen» is waiting for the questions.
  const restartingRef = useRef(false);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const shortcutsOn = useShortcutsEnabled();
  const openShortcuts = useOpenShortcuts();
  const collapsed = useSideMenuCollapsed();
  const closeSideMenu = useCloseSideMenu();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  // The question the delete confirmation is about (kept while the dialog closes).
  const [deleteTarget, setDeleteTarget] = useState<QuizQuestionData | null>(null);

  if (session === null && questions.data && questions.isFetchedAfterMount) {
    setSession(newSession(questions.data));
  }

  const { saveSubjectId, saveLectureId } = scope;
  const saver = useSessionSaver((): SaverSnapshot | null =>
    session && saveSubjectId
      ? {
          subjectId: saveSubjectId,
          lectureId: saveLectureId,
          kind: "quiz",
          counts: { ...sessionCounts(session.state), partial: 0 },
        }
      : null,
  );

  const name = scope.name;
  const scopeName = scope.scopeName;
  useDocumentTitle(name ? `Quiz – ${name} – Studiekamerat` : null);

  const finished = session !== null && session.state.order.length > 0 && isFinished(session.state);
  const showResult = finished || aborted;
  const { finish } = saver;
  useEffect(() => {
    if (finished) finish();
  }, [finished, finish]);
  useEffect(() => {
    if (showResult) resultTitleRef.current?.focus();
  }, [showResult]);

  const { backPath, backText, backHint } = scope;
  const back = () => router.push(backPath);

  const currentId = session ? currentCard(session.state) : undefined;
  const question = currentId ? session?.questions[currentId] : undefined;
  const confirmed = session !== null && currentId !== undefined && Object.hasOwn(session.state.firstMarks, currentId);

  function choose(index: number) {
    if (confirmed) return;
    setSelected(index);
  }

  function confirm() {
    if (!question || confirmed || selected === null) return;
    const mark = selected === question.correct_index ? "known" : "missed";
    const id = question.id;
    const chosen = selected;
    setSession((old) =>
      old
        ? {
            ...old,
            state: answerCurrent(old.state, mark),
            answers: Object.hasOwn(old.answers, id) ? old.answers : { ...old.answers, [id]: chosen },
          }
        : old,
    );
  }

  function next() {
    if (!confirmed) return;
    setSession((old) => (old ? { ...old, state: advance(old.state) } : old));
    setSelected(null);
    setStep((old) => old + 1);
  }

  // «Ta quizen igjen»: the questions the lecture (or the whole subject) has now
  // (or the session's own, if the fetch fails), a new order, a new session_id and a new start time.
  async function playAgain() {
    if (!session || restartingRef.current) return;
    restartingRef.current = true;
    const own = session.state.order.map((id) => session.questions[id]);
    try {
      const result = await questions.refetch();
      const fresh = !result.isError && result.data ? result.data : own;
      saver.restart();
      setSession(newSession(fresh));
      setAborted(false);
      setSelected(null);
      // A new key for the question, and focus on its title when it appears.
      setStep((old) => old + 1);
    } finally {
      restartingRef.current = false;
    }
  }

  // After a delete: the session's own question list in the cache loses the
  // question at once (so «Ta quizen igjen» never brings it back), and the
  // question's lecture (its counts and lists) and every subject's practice
  // lists are refetched. The session itself keeps its own copy.
  const ownQuestionsKey =
    props.subjectId !== undefined
      ? subjectQuizQuestionsQueryKey(props.subjectId)
      : lectureQuizQuestionsQueryKey(props.lectureId ?? "");

  function questionDeleted(deleted: QuizQuestionData) {
    queryClient.setQueryData<QuizQuestionData[]>(ownQuestionsKey, (old) =>
      old ? old.filter((other) => other.id !== deleted.id) : old,
    );
    void queryClient.invalidateQueries({ queryKey: ["lectures", deleted.lecture.id] });
    void queryClient.invalidateQueries({ predicate: (query) => isSubjectPracticeQueryKey(query.queryKey) });
    if (!session) return;
    const state = removeCard(session.state, deleted.id);
    if (state.order.length === 0) {
      // No questions left and nothing confirmed: back to where the session started.
      back();
      return;
    }
    setSession({ ...session, state });
    setSelected(null);
    // The next question gets focus on its title when it appears.
    setStep((old) => old + 1);
  }

  // «Avslutt økt» and Esc: nothing confirmed goes straight back; otherwise the
  // session is saved as aborted and the result is shown.
  function end() {
    if (!session || sessionCounts(session.state).answered === 0) {
      back();
      return;
    }
    // Every question answered (the last one confirmed): the quiz is done, not
    // aborted. Moving on finishes it (isFinished → finish() and the result).
    if (sessionCounts(session.state).answered === session.state.order.length) {
      next();
      closeSideMenu(() => resultTitleRef.current);
      return;
    }
    saver.abort();
    setAborted(true);
    closeSideMenu(() => resultTitleRef.current);
  }

  // Errors count only before the session starts.
  if (session === null && owner.error) notFoundOnMissing(owner.error);
  if (session === null && questions.error) notFoundOnMissing(questions.error);

  const loadError = session === null && (owner.isError || questions.isError);
  const empty = session !== null && session.state.order.length === 0;
  const practising = session !== null && !empty && !loadError && scopeName !== undefined;

  const letterBindings: ShortcutBinding[] = confirmed
    ? []
    : ["a", "b", "c", "d"].flatMap((letter, index) => [
        { key: letter, action: () => choose(index) },
        { key: letter.toUpperCase(), action: () => choose(index) },
      ]);
  const bindings: ShortcutBinding[] = !practising
    ? []
    : showResult
      ? [
          { key: "Enter", action: () => void playAgain() },
          { key: "Escape", action: back },
          { key: "?", action: openShortcuts },
        ]
      : [
          ...letterBindings,
          { key: "Enter", action: () => (confirmed ? next() : confirm()) },
          { key: "Escape", action: end },
          { key: "?", action: openShortcuts },
        ];
  usePracticeShortcuts(bindings, { singleKeys: shortcutsOn });

  if (loadError || empty || !session || scopeName === undefined) {
    return (
      <div className="min-w-0 px-content-inset pt-7 pb-7">
        {loadError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}
        {empty ? (
          <>
            <h1 className="text-page-title">Det finnes ingen quizspørsmål her ennå.</h1>
            <Button asChild variant="outline" className="mt-5">
              <Link href={backPath}>{backText}</Link>
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  const colorIndex = scope.colorIndex;

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SideMenu title={quizAdapter.kindLabel}>
        <SessionPanel
          adapter={quizAdapter}
          state={session.state}
          scopeName={scopeName}
          colorIndex={colorIndex}
          onEnd={end}
          aborted={aborted}
          saved={saver.status === "saved"}
          headingLevel={collapsed ? 2 : 1}
        />
      </SideMenu>
      <div
        className={
          "flex min-w-0 flex-1 justify-center px-content-inset py-7 " + (showResult ? "items-start" : "items-center")
        }
      >
        {collapsed ? <h1 className="sr-only">{quizAdapter.kindLabel}</h1> : null}
        {showResult ? (
          <QuizResult
            session={session}
            aborted={aborted}
            scopeName={scopeName}
            saveFailed={saver.status === "failed"}
            titleRef={resultTitleRef}
            backHref={backPath}
            backText={backText}
            backHint={backHint}
            showLecture={scope.showLecture}
            onPlayAgain={() => void playAgain()}
            showHints={shortcutsOn}
          />
        ) : question ? (
          <QuizQuestion
            key={question.id}
            question={question}
            number={shownCount(session.state)}
            total={totalCount(session.state)}
            selected={selected}
            confirmed={confirmed}
            last={session.state.queue.length === 1}
            onSelect={choose}
            onConfirm={confirm}
            onNext={next}
            onDelete={() => {
              setDeleteTarget(question);
              setDeleting(true);
            }}
            focusOnMount={step > 0}
            showHints={shortcutsOn}
            colorIndex={colorIndex}
          />
        ) : null}
      </div>
      {deleteTarget ? (
        <DeleteConfirmDialog
          open={deleting}
          title="Slette spørsmålet?"
          confirmLabel="Slett spørsmålet"
          item={{ name: deleteTarget.question }}
          target="quiz-question"
          previewKey={["quiz-questions", deleteTarget.id]}
          // A question takes nothing with it: no counts, only «Det kan ikke angres.».
          loadCounts={async () => []}
          remove={() => deleteQuizQuestion(deleteTarget.id)}
          onClose={() => setDeleting(false)}
          onDeleted={() => questionDeleted(deleteTarget)}
          // The deleted question's «Slett» is gone: focus goes to the result
          // title (session finished) or to the next question's title.
          focusAfterDelete={() =>
            resultTitleRef.current ?? document.querySelector<HTMLElement>("[data-question-title]")
          }
        />
      ) : null}
      <div role="status" className="sr-only">
        {finished ? (saver.status === "saved" ? FINISHED_SAVED : FINISHED) : ""}
      </div>
    </div>
  );
}

type QuizResultProps = {
  session: Session;
  aborted: boolean;
  scopeName: string;
  saveFailed: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  backHref: string;
  // «Tilbake til forelesningen» or «Tilbake til emnet».
  backText: string;
  // The hint line's text for Esc: «tilbake til forelesningen» or «tilbake til emnet».
  backHint: string;
  // A subject session: each wrong answer shows its lecture under the source.
  showLecture: boolean;
  onPlayAgain: () => void;
  showHints: boolean;
};

// The result page (mockup 10) in the quiz column: the summary, the fallback
// text if saving failed, the wrong answers (in the grid's order, with what she
// chose), and the footer with the hint line on the left and the buttons on
// the right.
function QuizResult({
  session,
  aborted,
  scopeName,
  saveFailed,
  titleRef,
  backHref,
  backText,
  backHint,
  showLecture,
  onPlayAgain,
  showHints,
}: QuizResultProps) {
  const counts = sessionCounts(session.state);
  const missed: MissedQuizItem[] = gridCells(session.state)
    .filter((cell) => cell.mark === "missed")
    .map((cell) => {
      const question = session.questions[cell.id];
      const chosen = session.answers[cell.id];
      return {
        id: cell.id,
        number: cell.number,
        front: question.question,
        source: question.source,
        chosen: chosen === undefined ? "" : question.options[chosen],
        correct: question.options[question.correct_index],
        explanation: question.explanation,
        ...(showLecture ? { lecture: question.lecture.name } : {}),
      };
    });

  return (
    <div data-slot="quiz-result" className="flex w-full max-w-quiz-column flex-col">
      <ResultSummary
        kind="quiz"
        total={session.state.order.length}
        counts={counts}
        aborted={aborted}
        scopeName={scopeName}
        titleRef={titleRef}
      />
      {saveFailed ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : null}
      {missed.length > 0 ? (
        <div className="mt-6">
          <MissedList kind="quiz" items={missed} />
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {showHints ? <ShortcutHints hints={quizResultHints(backHint)} align="start" /> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href={backHref}>{backText}</Link>
          </Button>
          <Button size="lg" onClick={onPlayAgain}>
            Ta quizen igjen
          </Button>
        </div>
      </div>
    </div>
  );
}
