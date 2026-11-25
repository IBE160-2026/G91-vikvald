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
import { useAppConfig } from "@/lib/config";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { usePracticeShortcuts, useShortcutsEnabled, type ShortcutBinding } from "@/lib/practice-shortcuts";
import { useDocumentTitle } from "@/lib/use-document-title";
import { fetchLecture, fetchSubject, lectureQueryKey, subjectQueryKey } from "@/modules/subjects/api";

import { flashcardAdapter } from "../adapter";
import {
  deleteFlashcard,
  fetchLectureFlashcards,
  fetchSubjectFlashcards,
  isSubjectFlashcardsQueryKey,
  lectureFlashcardsQueryKey,
  subjectFlashcardsQueryKey,
} from "../api";
import { EditFlashcardDialog } from "../components/edit-flashcard-dialog";
import { Flashcard } from "../components/flashcard";
import { MissedList, type MissedItem } from "../components/missed-list";
import { MnemonicDialog } from "../components/mnemonic-dialog";
import { ResultSummary } from "../components/result-summary";
import { SessionPanel } from "../components/session-panel";
import { ShortcutHints, resultHints } from "../components/shortcut-hints";
import {
  currentCard,
  gridCells,
  isFinished,
  markCurrent,
  removeCard,
  sessionCounts,
  shuffle,
  startSession,
  type SessionState,
} from "../session";
import type { Flashcard as FlashcardData, Mark, SubjectFlashcard } from "../types";
import { useSessionSaver, type SaverSnapshot } from "../use-session-saver";

const FINISHED = "Økten er ferdig";

// The cards of a session: copied once from the first answer, by id. A card
// in a subject session also has its lecture (SubjectFlashcard).
type Session = { cards: Record<string, FlashcardData>; state: SessionState };

// The lecture a card was made from: its own for a subject session's card,
// otherwise the session's lecture.
function lectureOf(card: FlashcardData | SubjectFlashcard, lectureId: string | undefined): string | undefined {
  return "lecture" in card ? card.lecture.id : lectureId;
}

// A new session over these cards, in a new random order.
function newSession(cards: readonly FlashcardData[]): Session {
  return {
    cards: Object.fromEntries(cards.map((card) => [card.id, card])),
    state: startSession(shuffle(cards.map((card) => card.id))),
  };
}

// Where the session's cards come from: one lecture (story 3.3) or the whole
// subject (story 3.6).
type ScopeProps = { lectureId: string; subjectId?: undefined } | { subjectId: string; lectureId?: undefined };

// What differs between a lecture session and a subject session: where the
// cards come from, the name in the panel and the result, the way back, and
// what is saved. Everything else in the session is the same code.
type Scope = {
  // The query for the lecture or subject itself: its error (404) counts.
  owner: UseQueryResult<unknown>;
  flashcards: UseQueryResult<FlashcardData[]>;
  // The lecture's or the subject's name (the document title); undefined while loading.
  name: string | undefined;
  // The panel's and the result's scope: the lecture name or «<subject> · hele emnet».
  scopeName: string | undefined;
  colorIndex: number | undefined;
  // Saved with the session: the subject, and the lecture (null for a subject session).
  saveSubjectId: string | undefined;
  saveLectureId: string | null;
  backPath: string;
  backText: string;
  // The hint line's text for Esc on the result page.
  backHint: string;
};

function useScope({ lectureId, subjectId }: ScopeProps): Scope {
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
  const lectureCards = useQuery({
    queryKey: lectureFlashcardsQueryKey(lectureId ?? ""),
    queryFn: () => fetchLectureFlashcards(lectureId ?? ""),
    enabled: lectureId !== undefined && lecture.isSuccess,
  });
  const subjectCards = useQuery({
    queryKey: subjectFlashcardsQueryKey(subjectId ?? ""),
    queryFn: () => fetchSubjectFlashcards(subjectId ?? ""),
    enabled: subjectId !== undefined && subject.isSuccess,
  });

  if (subjectId !== undefined) {
    const name = subject.data?.name;
    return {
      owner: subject,
      flashcards: subjectCards,
      name,
      scopeName: name === undefined ? undefined : `${name} · hele emnet`,
      colorIndex: subject.data?.color_index,
      saveSubjectId: subjectId,
      saveLectureId: null,
      backPath: `/emner/${subjectId}`,
      backText: "Tilbake til emnet",
      backHint: "tilbake til emnet",
    };
  }
  return {
    owner: lecture,
    flashcards: lectureCards,
    name: lecture.data?.name,
    scopeName: lecture.data?.name,
    colorIndex: subject.data?.color_index,
    saveSubjectId: lecture.data?.subject_id,
    saveLectureId: lectureId ?? null,
    backPath: `/forelesninger/${lectureId}`,
    backText: "Tilbake til forelesningen",
    backHint: "tilbake til forelesningen",
  };
}

// The flashcard session for one lecture (story 3.3, mockup 07), at
// /forelesninger/<id>/flashcards, or for the whole subject (story 3.6), at
// /emner/<id>/flashcards. The session panel stands where the sidebar is, and
// the card is centred in the area to the right.
//
// A subject session takes the cards from all the subject's lectures; the panel
// and the result say «<subject> · hele emnet», the session is saved with
// lecture_id null, and every way back («Tilbake til emnet», Esc, «Avslutt økt»
// with nothing marked) goes to the subject page. The text «lecture» below
// means the subject for a subject session.
//
// The cards are shuffled and copied into component state the first time they
// arrive. The job watcher refetches the lecture's queries when a job ends, but
// that never changes a session in progress: new cards come in the next one.
//
// No cards: no panel and no session, only the h1 «Det finnes ingen flashcards
// her ennå.» and «Tilbake til forelesningen».
//
// Saving and the result (story 3.5, mockup 08): useSessionSaver sends the
// result exactly once, and only when at least one card is marked. Finished:
// sent with aborted=false, the panel in its finished state («✓ Økten er ferdig
// og lagret» once saved), «Økten er ferdig» in the always-mounted live region,
// and the result page (result-summary, missed-list when a card was «Kunne
// ikke», «Tilbake til forelesningen» and «Øv igjen»); its title gets focus.
// «Avslutt økt» or Esc without a marked card goes straight back to the lecture
// and sends nothing; with marked cards the session is sent as aborted and the
// result page shows «Avbrutt etter A av N». Leaving in another way (a link,
// «Logg ut», closing the tab) sends it as aborted without a result page. A
// failed save shows the fallback text in role="alert" on the result page.
// «Øv igjen» starts a new session over the cards the lecture has now (a new
// order and a new session_id) and puts focus on «Snu kortet».
//
// Someone else's or a missing lecture shows «Fant ikke siden»; other errors
// show the fallback text in role="alert".
//
// Keys (story 3.4, lib/practice-shortcuts.ts): Space flips the card, «1» marks
// «Kunne ikke» and «2» «Kunne» (both only after the flip, like the buttons),
// Esc does what «Avslutt økt» does, and «?» opens the shortcut dialog. On the
// result page Enter is «Øv igjen», Esc goes back to the lecture and «?» opens
// the dialog. The single keys and the hint lines follow the switch «Bruk
// hurtigtaster»; Esc and Enter always work.
//
// Narrow screen: the panel is behind «Meny» in the top bar (SideMenu). Its
// title is then an h2, and the content has a hidden h1 «Flashcards», so the
// page always has one h1.
//
// Edit and delete (story 3.7): «Rediger» on a flipped card opens «Rediger
// kortet»; once saved, the card in the session shows the new text at once. «Slett»
// opens the shared delete confirmation («Slette kortet?», the card's question,
// no counts). Deleted (204, or 404 when it was already gone): the card leaves
// the session (removeCard). If the session then has no cards left to show and
// something is marked, it is finished (saved, result page); with nothing
// marked (no cards left at all) she goes back to where the session started,
// and nothing is saved. After a save or a delete, the lecture's queries and
// every subject's card list are refetched, so «Øv igjen», «Lag og øv» and the
// subject page show the right numbers. The keys are off while a dialog is open.
//
// Model cards (story 7.2, FR-56): they come with the other cards from the
// same lists, are shuffled in, marked and counted like any card, and the
// session is saved as "flashcards". «Endre huskeregel» / «Legg til
// huskeregel» on a flipped model card opens the mnemonic dialog; once saved,
// the card shows the new mnemonic at once and its marking is not changed.
// With FEATURE_MNEMONICS off (or before the config has loaded) the button is
// not shown, but the mnemonic a card has is.
export function FlashcardSessionPage(props: ScopeProps) {
  const router = useRouter();
  const scope = useScope(props);
  const { flashcards } = scope;
  const [session, setSession] = useState<Session | null>(null);
  const [flipped, setFlipped] = useState(false);
  // The number of marks so far. Each mark shows the next card as a new card
  // (also when the same card comes straight back), and after the first mark
  // the new card puts focus on «Snu kortet».
  const [step, setStep] = useState(0);
  // Ended with «Avslutt økt» or Esc after at least one mark: the result page.
  const [aborted, setAborted] = useState(false);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const shortcutsOn = useShortcutsEnabled();
  const openShortcuts = useOpenShortcuts();
  const collapsed = useSideMenuCollapsed();
  const closeSideMenu = useCloseSideMenu();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingMnemonic, setEditingMnemonic] = useState(false);
  const mnemonicsOn = useAppConfig().data?.feature_mnemonics === true;
  const [deleting, setDeleting] = useState(false);
  // The card the delete confirmation is about (kept while the dialog closes).
  const [deleteTarget, setDeleteTarget] = useState<FlashcardData | null>(null);

  // Lock the shuffled list the first time the cards arrive from a fetch made
  // after this page opened (a cached list from an earlier visit may be old).
  if (session === null && flashcards.data && flashcards.isFetchedAfterMount) {
    setSession(newSession(flashcards.data));
  }

  const { saveSubjectId, saveLectureId } = scope;
  const saver = useSessionSaver((): SaverSnapshot | null =>
    session && saveSubjectId
      ? { subjectId: saveSubjectId, lectureId: saveLectureId, kind: "flashcards", counts: sessionCounts(session.state) }
      : null,
  );

  const name = scope.name;
  useDocumentTitle(name ? `Flashcards – ${name} – Studiekamerat` : null);

  const finished = session !== null && session.state.order.length > 0 && isFinished(session.state);
  const showResult = finished || aborted;
  const { finish } = saver;
  useEffect(() => {
    if (finished) finish();
  }, [finished, finish]);
  useEffect(() => {
    if (showResult) resultTitleRef.current?.focus();
  }, [showResult]);

  function mark(value: Mark) {
    setSession((old) => (old ? { ...old, state: markCurrent(old.state, value) } : old));
    setFlipped(false);
    setStep((old) => old + 1);
  }

  const { backPath, backText, backHint } = scope;
  const back = () => router.push(backPath);
  // «Avslutt økt» and Esc: nothing marked goes straight back; otherwise the
  // session is saved as aborted and the result page is shown.
  function end() {
    if (!session || sessionCounts(session.state).answered === 0) {
      back();
      return;
    }
    saver.abort();
    setAborted(true);
    // On a narrow screen «Avslutt økt» is in the panel: close it, so the
    // result page (and its title, which gets focus) is not hidden under it.
    closeSideMenu(() => resultTitleRef.current);
  }

  // «Øv igjen»: the cards the lecture (or subject) has now (or the locked ones, if the
  // query has none), a new order, a new session_id and a new start time.
  function playAgain() {
    const cards = flashcards.data ?? (session ? session.state.order.map((id) => session.cards[id]) : []);
    saver.restart();
    setSession(newSession(cards));
    setAborted(false);
    setFlipped(false);
    // A new key for the card, and focus on «Snu kortet» when it appears.
    setStep((old) => old + 1);
  }
  // After a card is saved or deleted: the lecture's queries (its counts and
  // cards) and every subject's card list (the subject page, a subject
  // session's «Øv igjen») are refetched. The session itself keeps its copy.
  // The session's own card list in the cache, changed at once, so «Øv igjen»
  // never brings back a deleted card or old text (even if the refetch fails).
  const ownCardsKey =
    props.subjectId !== undefined
      ? subjectFlashcardsQueryKey(props.subjectId)
      : lectureFlashcardsQueryKey(props.lectureId ?? "");
  function updateOwnCards(change: (cards: FlashcardData[]) => FlashcardData[]) {
    queryClient.setQueryData<FlashcardData[]>(ownCardsKey, (old) => (old ? change(old) : old));
  }

  function refreshCardQueries(changed: FlashcardData) {
    const lecture = lectureOf(changed, props.lectureId);
    if (lecture !== undefined) void queryClient.invalidateQueries({ queryKey: ["lectures", lecture] });
    void queryClient.invalidateQueries({ predicate: (query) => isSubjectFlashcardsQueryKey(query.queryKey) });
  }

  function cardSaved(saved: FlashcardData) {
    const own = session?.cards[saved.id];
    if (!session || !own) return;
    // Keep what the session has beyond the API's fields (a subject card's
    // lecture, which the PATCH answer does not have). The marks are not touched.
    const merged = { ...own, ...saved } as FlashcardData;
    setSession({ ...session, cards: { ...session.cards, [saved.id]: merged } });
    updateOwnCards((cards) =>
      cards.map((other) => (other.id === saved.id ? ({ ...other, ...saved } as FlashcardData) : other)),
    );
    refreshCardQueries(merged);
  }

  function cardDeleted(deleted: FlashcardData) {
    updateOwnCards((cards) => cards.filter((other) => other.id !== deleted.id));
    refreshCardQueries(deleted);
    if (!session) return;
    const state = removeCard(session.state, deleted.id);
    if (state.order.length === 0) {
      // No cards left and nothing marked: back to where the session started.
      back();
      return;
    }
    setSession({ ...session, state });
    setFlipped(false);
    // The next card is shown as a new card, with focus on «Snu kortet».
    setStep((old) => old + 1);
  }

  // Errors count only before the session starts: a failed background refetch
  // (job watcher, window focus) never replaces a session in progress.
  if (session === null && scope.owner.error) notFoundOnMissing(scope.owner.error);
  if (session === null && flashcards.error) notFoundOnMissing(flashcards.error);

  const loadError = session === null && (scope.owner.isError || flashcards.isError);
  const currentId = session ? currentCard(session.state) : undefined;
  const card = currentId ? session?.cards[currentId] : undefined;
  const empty = session !== null && session.state.order.length === 0;
  const scopeName = scope.scopeName;
  const practising = session !== null && !empty && !loadError && scopeName !== undefined;

  const bindings: ShortcutBinding[] = !practising
    ? []
    : showResult
      ? [
          { key: "Enter", action: playAgain },
          { key: "Escape", action: back },
          { key: "?", action: openShortcuts },
        ]
      : [
          { key: " ", action: () => setFlipped(true) },
          { key: "1", action: () => (flipped ? mark("missed") : undefined) },
          { key: "2", action: () => (flipped ? mark("known") : undefined) },
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
            <h1 className="text-page-title">Det finnes ingen flashcards her ennå.</h1>
            <BackLink href={backPath} text={backText} className="mt-5" />
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
          scopeName={scopeName}
          colorIndex={scope.colorIndex}
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
        {collapsed ? <h1 className="sr-only">{flashcardAdapter.kindLabel}</h1> : null}
        {showResult ? (
          <ResultView
            session={session}
            aborted={aborted}
            scopeName={scopeName}
            saveFailed={saver.status === "failed"}
            titleRef={resultTitleRef}
            backHref={backPath}
            backText={backText}
            backHint={backHint}
            onPlayAgain={playAgain}
            showHints={shortcutsOn}
          />
        ) : card ? (
          <Flashcard
            key={step}
            card={card}
            flipped={flipped}
            onFlip={() => setFlipped(true)}
            onMark={mark}
            focusOnMount={step > 0}
            showHints={shortcutsOn}
            onEdit={() => setEditing(true)}
            onEditMnemonic={mnemonicsOn ? () => setEditingMnemonic(true) : undefined}
            onDelete={() => {
              setDeleteTarget(card);
              setDeleting(true);
            }}
          />
        ) : null}
      </div>
      {card ? <EditFlashcardDialog open={editing} card={card} onClose={() => setEditing(false)} onSaved={cardSaved} /> : null}
      {card?.kind === "model" ? (
        <MnemonicDialog
          open={editingMnemonic}
          card={card}
          onClose={() => setEditingMnemonic(false)}
          onSaved={cardSaved}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteConfirmDialog
          open={deleting}
          title="Slette kortet?"
          confirmLabel="Slett kortet"
          item={{ name: deleteTarget.front }}
          target="flashcard"
          previewKey={["flashcards", deleteTarget.id]}
          // A card takes nothing with it: no counts, only «Det kan ikke angres.».
          loadCounts={async () => []}
          remove={() => deleteFlashcard(deleteTarget.id)}
          onClose={() => setDeleting(false)}
          onDeleted={() => cardDeleted(deleteTarget)}
          // The deleted card's «Slett» is gone: focus goes to the result title
          // (session finished) or to the next card's «Snu kortet».
          focusAfterDelete={() =>
            resultTitleRef.current ?? document.querySelector<HTMLElement>("[data-flip-button]")
          }
        />
      ) : null}
      <div role="status" className="sr-only">
        {finished ? FINISHED : ""}
      </div>
    </div>
  );
}

type ResultViewProps = {
  session: Session;
  aborted: boolean;
  scopeName: string;
  saveFailed: boolean;
  titleRef: Ref<HTMLHeadingElement>;
  backHref: string;
  backText: string;
  backHint: string;
  onPlayAgain: () => void;
  showHints: boolean;
};

// The result page (mockup 08) in the 768 px column: the summary, the fallback
// text if saving failed, the cards she could not («Kunne ikke», in the grid's
// order), the buttons «Tilbake til forelesningen» or «Tilbake til emnet»
// (outline link) and «Øv igjen» (primary), centred, and the hint line under them.
function ResultView({
  session,
  aborted,
  scopeName,
  saveFailed,
  titleRef,
  backHref,
  backText,
  backHint,
  onPlayAgain,
  showHints,
}: ResultViewProps) {
  const counts = sessionCounts(session.state);
  const missed: MissedItem[] = gridCells(session.state)
    .filter((cell) => cell.mark === "missed")
    .map((cell) => ({
      id: cell.id,
      number: cell.number,
      front: session.cards[cell.id].front,
      source: session.cards[cell.id].source,
      formula_flag: session.cards[cell.id].formula_flag,
    }));

  return (
    <div className="flex w-full max-w-flashcard-width flex-col">
      <ResultSummary
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
      {counts.wrong >= 1 ? (
        <div className="mt-6">
          <MissedList items={missed} />
        </div>
      ) : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild variant="outline" size="lg" className="w-[224px]">
          <Link href={backHref}>{backText}</Link>
        </Button>
        <Button size="lg" className="w-[224px]" onClick={onPlayAgain}>
          Øv igjen
        </Button>
      </div>
      {showHints ? (
        <div className="mt-5">
          <ShortcutHints hints={resultHints(backHint)} />
        </div>
      ) : null}
    </div>
  );
}

function BackLink({ href, text, className }: { href: string; text: string; className?: string }) {
  return (
    <Button asChild variant="outline" className={className}>
      <Link href={href}>{text}</Link>
    </Button>
  );
}
