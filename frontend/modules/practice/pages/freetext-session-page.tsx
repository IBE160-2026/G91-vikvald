"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type Ref } from "react";

import { iconProps } from "@/components/icon";
import { SideMenu, useCloseSideMenu, useOpenShortcuts, useSideMenuCollapsed } from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { ApiError, notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { usePracticeShortcuts, useShortcutsEnabled, type ShortcutBinding } from "@/lib/practice-shortcuts";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";

import { freetextAdapter } from "../adapter";
import { fetchLectureFreetextQuestions, lectureFreetextQuestionsQueryKey } from "../api";
import { FreetextQuestion } from "../components/freetext-question";
import { MissedList, type MissedFreetextItem } from "../components/missed-list";
import { ResultSummary } from "../components/result-summary";
import { SessionPanel } from "../components/session-panel";
import { ShortcutHints, resultHints } from "../components/shortcut-hints";
import {
  assessCurrent,
  currentCard,
  gridCells,
  isFinished,
  sessionCounts,
  shownCount,
  shuffle,
  startSession,
  totalCount,
  type SessionState,
} from "../session";
import type { FreetextQuestion as FreetextQuestionData, Mark } from "../types";
import { useSessionSaver, type SaverSnapshot } from "../use-session-saver";

const FINISHED = "Økten er ferdig";
const FINISHED_SAVED = "Økten er ferdig og lagret";
const BACK_TEXT = "Tilbake til forelesningen";
const BACK_HINT = "tilbake til forelesningen";

// The questions of a session: copied once from the first fetch made after the
// page opened, by id. Her answers are not here: each one lives only in its
// FreetextQuestion and is never kept or sent.
type Session = {
  questions: Record<string, FreetextQuestionData>;
  state: SessionState;
};

// A new session over these questions, in a new random order (FR-50).
function newSession(questions: readonly FreetextQuestionData[]): Session {
  return {
    questions: Object.fromEntries(questions.map((question) => [question.id, question])),
    state: startSession(shuffle(questions.map((question) => question.id))),
  };
}

// A switch that is off answers 404 FEATURE_DISABLED: the page is then not
// there («Fant ikke siden»), as for someone else's or a missing lecture.
// Like notFoundOnMissing, call it while rendering.
function notFoundWhenMissingOrOff(error: unknown): void {
  if (error instanceof ApiError && error.code === "FEATURE_DISABLED") notFound();
  notFoundOnMissing(error);
}

// The free-text session for one lecture (story 8.2, mockup 12), at
// /forelesninger/<id>/fritekst. It is built on the practice frame from epics
// 3–4: the session panel with the free-text adapter («Fritekst», «1 delvis
// riktig», the answer grid with ✓, ◐ and ✗ read as «Spørsmål 2: delvis
// riktig»), the pure session functions (assessCurrent sets the mark and moves
// on in one step), the shared keys and useSessionSaver with kind "freetext".
//
// The questions are shuffled and copied into component state the first time
// they arrive (from a fetch made after the page opened); a refetch never
// changes a session in progress. Each question is shown once (FR-50).
//
// For each question (FreetextQuestion): she writes her answer, «Vis
// modellsvar» (only with something written, E28) locks the field and shows
// the model answer with its source and the self-assessment, and «Feil»,
// «Delvis riktig» or «Riktig» (or 1, 2, 3) marks the question and moves on at
// once, with focus in the next «Ditt svar» (FR-51). Her answer is never sent.
//
// No questions: no panel and no session, only the h1 «Det finnes ingen
// fritekstspørsmål her ennå.» and «Tilbake til forelesningen». Someone else's
// or a missing lecture, or the switch FEATURE_FREETEXT off, shows «Fant ikke
// siden»; other errors show the fallback text in role="alert".
//
// Saving (FR-56): answered = questions assessed, with correct, partial and
// wrong. The last assessment finishes the session (sent once with
// aborted=false). «Avslutt økt» or Esc with at least one assessment sends it
// as aborted and shows the result; with none it goes straight back and sends
// nothing. Navigation, «Logg ut» and pagehide work as in epic 3 (the saver).
//
// The result: result-summary with kind="freetext" (ØKT FERDIG, «Du har gått
// gjennom alle 10 spørsmålene» or «Avbrutt etter 4 av 10», the lecture, and
// the fields Riktig, Delvis riktig and Feil), the fallback text if saving
// failed, missed-list with kind="freetext" (the questions she assessed as
// Feil or Delvis riktig, with model answer and source, never her answer), and
// a footer with the hint line and «Tilbake til forelesningen» and «Øv igjen».
// The title gets focus. Enter practises again (not while another button or
// link has focus), Esc goes back.
//
// Keys (lib/practice-shortcuts.ts): 1/2/3 = Feil/Delvis riktig/Riktig, only
// while the self-assessment is shown (E27) and never in a text field; Esc ends
// the session (not while focus is in the answer field); «?» opens the shortcut
// dialog.
//
// Narrow screen: the panel is behind «Meny» (SideMenu), with the hidden h1 «Fritekst».
export function FreetextSessionPage({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const subjectId = lecture.data?.subject_id;
  const subject = useQuery({
    queryKey: subjectQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubject(subjectId ?? ""),
    enabled: subjectId !== undefined,
  });
  const questions = useQuery({
    queryKey: lectureFreetextQuestionsQueryKey(lectureId),
    queryFn: () => fetchLectureFreetextQuestions(lectureId),
    enabled: lecture.isSuccess,
  });
  const [session, setSession] = useState<Session | null>(null);
  // «Vis modellsvar» has been pressed for the current question.
  const [revealed, setRevealed] = useState(false);
  // Bumped by «Øv igjen», so the same question in a new session is a new
  // FreetextQuestion (an empty field with focus).
  const [round, setRound] = useState(0);
  const [aborted, setAborted] = useState(false);
  // «Øv igjen» is waiting for the questions.
  const restartingRef = useRef(false);
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
      ? { subjectId, lectureId, kind: "freetext", counts: sessionCounts(session.state) }
      : null,
  );

  const name = lecture.data?.name;
  useDocumentTitle(name ? `Fritekst – ${name} – Studiekamerat` : null);

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

  // Her self-assessment: only once the model answer is shown.
  function assess(mark: Mark) {
    if (!revealed || !question) return;
    setSession((old) => (old ? { ...old, state: assessCurrent(old.state, mark) } : old));
    setRevealed(false);
  }

  // «Øv igjen»: the questions the lecture has now, a new order, a new
  // session_id and a new start time. If the fetch fails, the session's own questions.
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
      setRevealed(false);
      setRound((old) => old + 1);
    } finally {
      restartingRef.current = false;
    }
  }

  // «Avslutt økt» and Esc: nothing assessed goes straight back; otherwise the
  // session is saved as aborted and the result is shown.
  function end() {
    if (!session || sessionCounts(session.state).answered === 0) {
      back();
      return;
    }
    saver.abort();
    setAborted(true);
    closeSideMenu(() => resultTitleRef.current);
  }

  // Errors count only before the session starts.
  if (session === null && lecture.error) notFoundWhenMissingOrOff(lecture.error);
  if (session === null && questions.error) notFoundWhenMissingOrOff(questions.error);

  const loadError = session === null && (lecture.isError || questions.isError);
  const empty = session !== null && session.state.order.length === 0;
  const practising = session !== null && !empty && !loadError && name !== undefined;

  const assessBindings: ShortcutBinding[] = revealed
    ? [
        { key: "1", action: () => assess("missed") },
        { key: "2", action: () => assess("partial") },
        { key: "3", action: () => assess("known") },
      ]
    : [];
  const bindings: ShortcutBinding[] = !practising
    ? []
    : showResult
      ? [
          { key: "Enter", action: () => void playAgain() },
          { key: "Escape", action: back },
          { key: "?", action: openShortcuts },
        ]
      : [...assessBindings, { key: "Escape", action: end }, { key: "?", action: openShortcuts }];
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
            <h1 className="text-page-title">Det finnes ingen fritekstspørsmål her ennå.</h1>
            <Button asChild variant="outline" className="mt-5">
              <Link href={backPath}>{BACK_TEXT}</Link>
            </Button>
          </>
        ) : null}
      </div>
    );
  }

  const colorIndex = subject.data?.color_index;

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SideMenu title={freetextAdapter.kindLabel}>
        <SessionPanel
          adapter={freetextAdapter}
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
        {collapsed ? <h1 className="sr-only">{freetextAdapter.kindLabel}</h1> : null}
        {showResult ? (
          <FreetextResult
            session={session}
            aborted={aborted}
            scopeName={name}
            saveFailed={saver.status === "failed"}
            titleRef={resultTitleRef}
            backHref={backPath}
            onPlayAgain={() => void playAgain()}
            showHints={shortcutsOn}
          />
        ) : question ? (
          <FreetextQuestion
            key={`${round}:${question.id}`}
            question={question}
            number={shownCount(session.state)}
            total={totalCount(session.state)}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onAssess={assess}
            showHints={shortcutsOn}
            colorIndex={colorIndex}
          />
        ) : null}
      </div>
      <div role="status" className="sr-only">
        {finished ? (saver.status === "saved" ? FINISHED_SAVED : FINISHED) : ""}
      </div>
    </div>
  );
}

type FreetextResultProps = {
  session: Session;
  aborted: boolean;
  scopeName: string;
  saveFailed: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  backHref: string;
  onPlayAgain: () => void;
  showHints: boolean;
};

// The result page in the 832 px column: the summary, the fallback text if
// saving failed, the questions assessed as Feil or Delvis riktig (in the
// grid's order), and the footer with the hint line on the left and the
// buttons on the right.
function FreetextResult({
  session,
  aborted,
  scopeName,
  saveFailed,
  titleRef,
  backHref,
  onPlayAgain,
  showHints,
}: FreetextResultProps) {
  const counts = sessionCounts(session.state);
  const missed: MissedFreetextItem[] = gridCells(session.state).flatMap((cell) => {
    if (cell.mark !== "missed" && cell.mark !== "partial") return [];
    const question = session.questions[cell.id];
    return [
      {
        id: cell.id,
        number: cell.number,
        mark: cell.mark,
        front: question.question,
        modelAnswer: question.model_answer,
        source: question.source,
        formula_flag: question.formula_flag,
      },
    ];
  });

  return (
    <div data-slot="freetext-result" className="flex w-full max-w-quiz-column flex-col">
      <ResultSummary
        kind="freetext"
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
          <MissedList kind="freetext" items={missed} />
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {showHints ? <ShortcutHints hints={resultHints(BACK_HINT)} align="start" /> : null}
        </div>
        <div className="ml-auto flex flex-wrap gap-3">
          <Button asChild variant="outline" size="lg">
            <Link href={backHref}>{BACK_TEXT}</Link>
          </Button>
          <Button size="lg" onClick={onPlayAgain}>
            Øv igjen
          </Button>
        </div>
      </div>
    </div>
  );
}
