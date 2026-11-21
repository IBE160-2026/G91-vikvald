"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { iconProps } from "@/components/icon";
import { SideMenu, useOpenShortcuts, useSideMenuCollapsed } from "@/components/side-menu";
import { Button } from "@/components/ui/button";
import { notFoundOnMissing } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { usePracticeShortcuts, useShortcutsEnabled, type ShortcutBinding } from "@/lib/practice-shortcuts";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";

import { flashcardAdapter } from "../adapter";
import { fetchLectureFlashcards, lectureFlashcardsQueryKey } from "../api";
import { Flashcard } from "../components/flashcard";
import { SessionPanel } from "../components/session-panel";
import { currentCard, isFinished, markCurrent, shuffle, startSession, type SessionState } from "../session";
import type { Flashcard as FlashcardData, Mark } from "../types";

const FINISHED = "Økten er ferdig";

// The cards of a session: copied once from the first answer, by id.
type Session = { cards: Record<string, FlashcardData>; state: SessionState };

// The flashcard session for one lecture (story 3.3, mockup 07), at
// /forelesninger/<id>/flashcards. The session panel stands where the sidebar
// is, and the card is centred in the area to the right.
//
// The cards are shuffled and copied into component state the first time they
// arrive. The job watcher refetches the lecture's queries when a job ends, but
// that never changes a session in progress: new cards come in the next one.
//
// No cards: no panel and no session, only the h1 «Det finnes ingen flashcards
// her ennå.» and «Tilbake til forelesningen». Finished: the panel in its
// finished state, the h2 «Økten er ferdig» (which gets focus, and is also read
// by an always-mounted live region) and «Tilbake til forelesningen». The result
// page and saving come in story 3.5. «Avslutt økt» goes straight back to the
// lecture without asking and sends nothing.
//
// Someone else's or a missing lecture shows «Fant ikke siden»; other errors
// show the fallback text in role="alert".
//
// Keys (story 3.4, lib/practice-shortcuts.ts): Space flips the card, «1» marks
// «Kunne ikke» and «2» «Kunne» (both only after the flip, like the buttons),
// Esc does what «Avslutt økt» does, and «?» opens the shortcut dialog. When the
// session is finished, only «?» works. The single keys and the hint line
// follow the switch «Bruk hurtigtaster»; Esc always works.
//
// Narrow screen: the panel is behind «Meny» in the top bar (SideMenu). Its
// title is then an h2, and the content has a hidden h1 «Flashcards», so the
// page always has one h1.
export function FlashcardSessionPage({ lectureId }: { lectureId: string }) {
  const router = useRouter();
  const lecture = useQuery({ queryKey: lectureQueryKey(lectureId), queryFn: () => fetchLecture(lectureId) });
  const subjectId = lecture.data?.subject_id;
  const subject = useQuery({
    queryKey: subjectQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubject(subjectId ?? ""),
    enabled: subjectId !== undefined,
  });
  const flashcards = useQuery({
    queryKey: lectureFlashcardsQueryKey(lectureId),
    queryFn: () => fetchLectureFlashcards(lectureId),
    enabled: lecture.isSuccess,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [flipped, setFlipped] = useState(false);
  // The number of marks so far. Each mark shows the next card as a new card
  // (also when the same card comes straight back), and after the first mark
  // the new card puts focus on «Snu kortet».
  const [step, setStep] = useState(0);
  const finishedRef = useRef<HTMLHeadingElement>(null);
  const shortcutsOn = useShortcutsEnabled();
  const openShortcuts = useOpenShortcuts();
  const collapsed = useSideMenuCollapsed();

  // Lock the shuffled list the first time the cards arrive from a fetch made
  // after this page opened (a cached list from an earlier visit may be old).
  if (session === null && flashcards.data && flashcards.isFetchedAfterMount) {
    const cards = Object.fromEntries(flashcards.data.map((card) => [card.id, card]));
    setSession({ cards, state: startSession(shuffle(flashcards.data.map((card) => card.id))) });
  }

  const name = lecture.data?.name;
  useDocumentTitle(name ? `Flashcards – ${name} – Studiekamerat` : null);

  const finished = session !== null && session.state.order.length > 0 && isFinished(session.state);
  useEffect(() => {
    if (finished) finishedRef.current?.focus();
  }, [finished]);

  function mark(value: Mark) {
    setSession((old) => (old ? { ...old, state: markCurrent(old.state, value) } : old));
    setFlipped(false);
    setStep((old) => old + 1);
  }

  const lecturePath = `/forelesninger/${lectureId}`;
  const end = () => router.push(lecturePath);
  // Errors count only before the session starts: a failed background refetch
  // (job watcher, window focus) never replaces a session in progress.
  if (session === null && lecture.error) notFoundOnMissing(lecture.error);
  if (session === null && flashcards.error) notFoundOnMissing(flashcards.error);

  const loadError = session === null && (lecture.isError || flashcards.isError);
  const currentId = session ? currentCard(session.state) : undefined;
  const card = currentId ? session?.cards[currentId] : undefined;
  const empty = session !== null && session.state.order.length === 0;
  const practising = session !== null && !empty && !loadError && lecture.data !== undefined;

  const bindings: ShortcutBinding[] = !practising
    ? []
    : finished
      ? [{ key: "?", action: openShortcuts }]
      : [
          { key: " ", action: () => setFlipped(true) },
          { key: "1", action: () => (flipped ? mark("missed") : undefined) },
          { key: "2", action: () => (flipped ? mark("known") : undefined) },
          { key: "Escape", action: end },
          { key: "?", action: openShortcuts },
        ];
  usePracticeShortcuts(bindings, { singleKeys: shortcutsOn });

  if (loadError || empty || !session || !lecture.data) {
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
            <h1 className="text-page-title">Det finnes ingen flashcards her ennå.</h1>
            <BackToLecture href={lecturePath} className="mt-5" />
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--spacing-topbar-height))]">
      <SideMenu title={flashcardAdapter.kindLabel}>
        <SessionPanel
          adapter={flashcardAdapter}
          state={session.state}
          scopeName={lecture.data.name}
          colorIndex={subject.data?.color_index}
          onEnd={end}
          headingLevel={collapsed ? 2 : 1}
        />
      </SideMenu>
      <div className="flex min-w-0 flex-1 items-center justify-center px-content-inset py-7">
        {collapsed ? <h1 className="sr-only">{flashcardAdapter.kindLabel}</h1> : null}
        {finished ? (
          <div className="flex w-full max-w-flashcard-width flex-col items-start">
            <h2 ref={finishedRef} tabIndex={-1} className="text-page-title">
              {FINISHED}
            </h2>
            <BackToLecture href={lecturePath} className="mt-5" />
          </div>
        ) : card ? (
          <Flashcard
            key={step}
            card={card}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            onMark={mark}
            focusOnMount={step > 0}
            showHints={shortcutsOn}
          />
        ) : null}
      </div>
      <div role="status" className="sr-only">
        {finished ? FINISHED : ""}
      </div>
    </div>
  );
}

function BackToLecture({ href, className }: { href: string; className?: string }) {
  return (
    <Button asChild variant="outline" className={className}>
      <Link href={href}>Tilbake til forelesningen</Link>
    </Button>
  );
}
