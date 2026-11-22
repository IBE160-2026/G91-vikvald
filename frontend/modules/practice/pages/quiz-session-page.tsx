"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";

import { iconProps } from "@/components/icon";
import { SideMenu, useCloseSideMenu, useOpenShortcuts, useSideMenuCollapsed } from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { usePracticeShortcuts, useShortcutsEnabled, type ShortcutBinding } from "@/lib/practice-shortcuts";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";

import { quizAdapter } from "../adapter";
import { fetchLectureQuizQuestions, lectureQuizQuestionsQueryKey } from "../api";
import { QuizQuestion } from "../components/quiz-question";
import { SessionPanel } from "../components/session-panel";
import { ShortcutHints, quizResultHints } from "../components/shortcut-hints";
import {
  advance,
  answerCurrent,
  currentCard,
  isFinished,
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

// The questions of a session: copied once from the first fetch made after the page opened, by id.
type Session = { questions: Record<string, QuizQuestionData>; state: SessionState };

// A new session over these questions, in a new random order (FR-34).
function newSession(questions: readonly QuizQuestionData[]): Session {
  return {
    questions: Object.fromEntries(questions.map((question) => [question.id, question])),
    state: startSession(shuffle(questions.map((question) => question.id))),
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
// The result (the simple view of this story; story 4.3 adds the rest): the
// overline «QUIZ FERDIG», the h2 «11 av 15 riktige» (aborted: «Avbrutt etter
// 12 av 20»), the lecture's name, the fallback text if saving failed, and the
// outline button «Tilbake til forelesningen». The title gets focus; Esc goes back.
//
// Keys (lib/practice-shortcuts.ts): «a»–«d» and «A»–«D» choose (single keys,
// only before confirmation), Enter confirms when something is chosen (and
// does nothing otherwise) and goes to the next question after confirmation,
// Esc ends the session, and «?» opens the shortcut dialog. Enter on a focused
// button does only what that button does.
//
// Narrow screen: the panel is behind «Meny» (SideMenu), with the hidden h1 «Quiz».
export function QuizSessionPage({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const subjectId = lecture.data?.subject_id;
  const subject = useQuery({
    queryKey: subjectQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubject(subjectId ?? ""),
    enabled: subjectId !== undefined,
  });
  const questions = useQuery({
    queryKey: lectureQuizQuestionsQueryKey(lectureId),
    queryFn: () => fetchLectureQuizQuestions(lectureId),
    enabled: lecture.isSuccess,
  });
  const [session, setSession] = useState<Session | null>(null);
  // The chosen option (0–3) of the current question, or null.
  const [selected, setSelected] = useState<number | null>(null);
  // The number of questions moved past. After the first, a new question puts
  // focus on its title.
  const [step, setStep] = useState(0);
  const [aborted, setAborted] = useState(false);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const shortcutsOn = useShortcutsEnabled();
  const openShortcuts = useOpenShortcuts();
  const collapsed = useSideMenuCollapsed();
  const closeSideMenu = useCloseSideMenu();

  if (session === null && questions.data && questions.isFetchedAfterMount) {
    setSession(newSession(questions.data));
  }

  const saver = useSessionSaver((): SaverSnapshot | null =>
    session && subjectId
      ? { subjectId, lectureId, kind: "quiz", counts: { ...sessionCounts(session.state), partial: 0 } }
      : null,
  );

  const name = lecture.data?.name;
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

  const backPath = `/forelesninger/${lectureId}`;
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
    setSession((old) => (old ? { ...old, state: answerCurrent(old.state, mark) } : old));
  }

  function next() {
    if (!confirmed) return;
    setSession((old) => (old ? { ...old, state: advance(old.state) } : old));
    setSelected(null);
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
  if (session === null && lecture.error) notFoundOnMissing(lecture.error);
  if (session === null && questions.error) notFoundOnMissing(questions.error);

  const loadError = session === null && (lecture.isError || questions.isError);
  const empty = session !== null && session.state.order.length === 0;
  const practising = session !== null && !empty && !loadError && name !== undefined;

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

  if (loadError || empty || !session || name === undefined) {
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
              <Link href={backPath}>Tilbake til forelesningen</Link>
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  const colorIndex = subject.data?.color_index;

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SideMenu title={quizAdapter.kindLabel}>
        <SessionPanel
          adapter={quizAdapter}
          state={session.state}
          scopeName={name}
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
            state={session.state}
            aborted={aborted}
            scopeName={name}
            saveFailed={saver.status === "failed"}
            titleRef={resultTitleRef}
            backHref={backPath}
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
            focusOnMount={step > 0}
            showHints={shortcutsOn}
            colorIndex={colorIndex}
          />
        ) : null}
      </div>
      <div role="status" className="sr-only">
        {finished ? FINISHED : ""}
      </div>
    </div>
  );
}

// The title over the quiz result: «11 av 15 riktige», or where she stopped
// («Avbrutt etter 12 av 20», with 12 the confirmed answers).
export function quizResultTitle({
  total,
  answered,
  correct,
  aborted,
}: {
  total: number;
  answered: number;
  correct: number;
  aborted: boolean;
}): string {
  return aborted ? `Avbrutt etter ${answered} av ${total}` : `${correct} av ${total} riktige`;
}

type QuizResultProps = {
  state: SessionState;
  aborted: boolean;
  scopeName: string;
  saveFailed: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  backHref: string;
  showHints: boolean;
};

// The simple result of story 4.2 (result-summary, mockup 10, without what
// story 4.3 adds): the overline QUIZ FERDIG, the title in result-title (an h2
// that gets focus), the lecture's name, the fallback text if saving failed,
// the outline button «Tilbake til forelesningen», and the hint line.
function QuizResult({ state, aborted, scopeName, saveFailed, titleRef, backHref, showHints }: QuizResultProps) {
  const counts = sessionCounts(state);
  return (
    <div data-slot="quiz-result" className="flex w-full max-w-quiz-column flex-col">
      <p className="text-overline text-ink-muted">QUIZ FERDIG</p>
      <h2 ref={titleRef} tabIndex={-1} className="mt-2 text-result-title text-ink">
        {quizResultTitle({ total: state.order.length, answered: counts.answered, correct: counts.correct, aborted })}
      </h2>
      <p className="mt-2 text-body-sm break-words text-ink-muted">{scopeName}</p>
      {saveFailed ? (
        <p role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild variant="outline" size="lg" className="w-[224px]">
          <Link href={backHref}>Tilbake til forelesningen</Link>
        </Button>
      </div>
      {showHints ? (
        <div className="mt-5">
          <ShortcutHints hints={quizResultHints("tilbake til forelesningen")} align="start" />
        </div>
      ) : null}
    </div>
  );
}
