import type { Ref } from "react";

import { cn } from "@/lib/utils";

import type { Mark } from "../types";
import { MARK_CLASSES, MarkIcon } from "./answer-grid";

type Props = {
  // Flashcards (mockup 08, the default), quiz (mockup 10) or free text (story 8.2).
  kind?: "flashcards" | "quiz" | "freetext";
  // The number of cards (or questions) in the session.
  total: number;
  counts: { answered: number; correct: number; wrong: number; partial?: number };
  // Ended with «Avslutt økt» or Esc before every card was marked «Kunne».
  aborted: boolean;
  // The lecture's name (the scope of the session).
  scopeName: string;
  // The title gets focus when the result is shown.
  titleRef?: Ref<HTMLHeadingElement>;
};

// The title over the result: all cards gone through, or where she stopped.
// A is the number of cards marked at least once.
export function resultTitle({ total, answered, aborted }: { total: number; answered: number; aborted: boolean }): string {
  if (aborted) return `Avbrutt etter ${answered} av ${total}`;
  return total === 1 ? "Du har gått gjennom 1 kort" : `Du har gått gjennom alle ${total} kortene`;
}

// The title over the free-text result (story 8.2): all questions gone
// through, or where she stopped (A = questions assessed).
export function freetextResultTitle({
  total,
  answered,
  aborted,
}: {
  total: number;
  answered: number;
  aborted: boolean;
}): string {
  if (aborted) return `Avbrutt etter ${answered} av ${total}`;
  return total === 1 ? "Du har gått gjennom 1 spørsmål" : `Du har gått gjennom alle ${total} spørsmålene`;
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

// The line under the quiz title (mockup 10): the scope; when aborted, the
// score for the questions she answered («9 av 12 riktige»); and, with at least
// one wrong answer, that the list below has them.
export function quizResultSubtitle({
  scopeName,
  answered,
  correct,
  wrong,
  aborted,
}: {
  scopeName: string;
  answered: number;
  correct: number;
  wrong: number;
  aborted: boolean;
}): string {
  return [
    scopeName,
    aborted ? `${correct} av ${answered} riktige` : null,
    wrong === 1
      ? "her er den ene du svarte feil på, med riktig svar og kilde"
      : wrong > 1
        ? `her er de ${wrong} du svarte feil på, med riktig svar og kilde`
        : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

// result-summary (DESIGN.md "Resultat", mockup 08): the overline ØKT FERDIG,
// the title (an h2 in page-title that gets focus), the lecture's name (and,
// when the finished session had «Kunne ikke» cards, that they were repeated),
// and a white card with two fields split by a hairline: «Kunne» with the share
// of the cards, and «Kunne ikke» («Repetert til slutt i økten» when finished),
// each with a tinted 32 px icon box and the number in result-title on the
// right. No celebration: the numbers stand as they are.
//
// kind="quiz" (mockup 10, story 4.3): the overline QUIZ FERDIG (also when
// aborted), the title «11 av 15 riktige» or «Avbrutt etter 12 av 20» in
// result-title, and the line from quizResultSubtitle. No fields: the list of
// wrong answers below explains the rest.
//
// kind="freetext" (story 8.2): the overline ØKT FERDIG, the title from
// freetextResultTitle in page-title, the lecture's name, and a card with three
// fields «Riktig», «Delvis riktig» and «Feil» (side by side from sm, under each
// other when narrow). No celebration and no share: she assessed herself.
export function ResultSummary({ kind = "flashcards", total, counts, aborted, scopeName, titleRef }: Props) {
  if (kind === "freetext") {
    return (
      <div data-slot="result-summary" className="w-full">
        <p className="text-overline text-ink-muted">ØKT FERDIG</p>
        <h2 ref={titleRef} tabIndex={-1} className="mt-2 text-page-title text-ink">
          {freetextResultTitle({ total, answered: counts.answered, aborted })}
        </h2>
        <p className="mt-2 text-body-sm break-words text-ink-muted">{scopeName}</p>
        <div className="mt-5 grid grid-cols-1 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Field mark="known" label="Riktig" detail={null} value={counts.correct} />
          <Field mark="partial" label="Delvis riktig" detail={null} value={counts.partial ?? 0} />
          <Field mark="missed" label="Feil" detail={null} value={counts.wrong} />
        </div>
      </div>
    );
  }
  if (kind === "quiz") {
    return (
      <div data-slot="result-summary" className="w-full">
        <p className="text-overline text-ink-muted">QUIZ FERDIG</p>
        <h2 ref={titleRef} tabIndex={-1} className="mt-2 text-result-title text-ink">
          {quizResultTitle({ total, answered: counts.answered, correct: counts.correct, aborted })}
        </h2>
        <p className="mt-2 text-body-sm break-words text-ink-muted">
          {quizResultSubtitle({ scopeName, ...counts, aborted })}
        </p>
      </div>
    );
  }
  const percent = counts.answered === 0 ? 0 : Math.round((counts.correct / counts.answered) * 100);
  const repeated = !aborted && counts.wrong > 0;

  return (
    <div data-slot="result-summary" className="w-full">
      <p className="text-overline text-ink-muted">ØKT FERDIG</p>
      <h2 ref={titleRef} tabIndex={-1} className="mt-2 text-page-title text-ink">
        {resultTitle({ total, answered: counts.answered, aborted })}
      </h2>
      <p className="mt-2 text-body-sm break-words text-ink-muted">
        {scopeName}
        {repeated ? " · kortene du ikke kunne, ble repetert til slutt i økten" : null}
      </p>
      <div className="mt-5 grid grid-cols-1 divide-y divide-divider rounded-lg border border-border-card bg-surface shadow-lift sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <Field mark="known" label="Kunne" detail={`${percent} % av kortene`} value={counts.correct} />
        <Field
          mark="missed"
          label="Kunne ikke"
          detail={aborted ? null : "Repetert til slutt i økten"}
          value={counts.wrong}
        />
      </div>
    </div>
  );
}

function Field({ mark, label, detail, value }: { mark: Mark; label: string; detail: string | null; value: number }) {
  return (
    <div data-slot="result-field" className="flex min-h-[112px] items-center gap-3 px-5 py-4">
      <span
        aria-hidden="true"
        className={cn("flex size-[32px] shrink-0 items-center justify-center rounded-md", MARK_CLASSES[mark])}
      >
        <MarkIcon mark={mark} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-item-title text-ink">{label}</p>
        {detail === null ? null : <p className="mt-1 text-meta text-ink-muted">{detail}</p>}
      </div>
      <p className="text-result-title text-ink">{value}</p>
    </div>
  );
}
