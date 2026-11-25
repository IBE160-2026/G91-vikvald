"use client";

import { useId, useState } from "react";

import { ChoiceOption } from "@/components/choice-option";
import { Dialog } from "@/components/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { useAppConfig } from "@/lib/config";
import { fileCountLabel, pageCountLabel } from "@/modules/subjects/format";

import type { Difficulty, JobParams, QuestionKind, Requested, ScopedJobKind } from "../types";

// «Rask», «Vanlig» and «Dyp», in that order, with each type's own values.
const SCOPE_TITLES = ["Rask", "Vanlig", "Dyp"] as const;
// 10/20/30 with «Vanlig» (20) chosen, as for flashcards and quiz.
const STANDARD_SCOPES: Scopes = { values: [10, 20, 30], default: 20 };

type Scopes = { values: [Requested, Requested, Requested]; default: Requested };

const DIFFICULTIES: { value: Difficulty; title: string; description: string }[] = [
  { value: "easy", title: "Lett", description: "Kjenne igjen en definisjon" },
  { value: "medium", title: "Middels", description: "Forstå sammenhenger" },
  { value: "hard", title: "Vanskelig", description: "Bruke stoffet på et eksempel" },
];
const DEFAULT_DIFFICULTY: Difficulty = "medium";

// The free-text question types (story 8.1), shown before «Omfang».
const QUESTION_KINDS: { value: QuestionKind; title: string; description: string }[] = [
  { value: "short", title: "Kortsvar", description: "Svar med noen få setninger" },
  { value: "long", title: "Langsvar", description: "Forklar sammenhenger eller gi et eksempel" },
];
const DEFAULT_QUESTION_KIND: QuestionKind = "short";

// What differs between the types: the title (also the button), the noun in
// «Inntil 20 kort», the line about what she has, the scopes and the chosen
// one, and whether there is a difficulty or a question type to choose.
const KIND_TEXTS: Record<
  ScopedJobKind,
  {
    title: string;
    unit: string;
    addedTo: (count: number) => string;
    scopes: Scopes;
    hasDifficulty: boolean;
    hasQuestionKind: boolean;
  }
> = {
  flashcards: {
    title: "Lag flashcards",
    unit: "kort",
    addedTo: (count) => `Nye kort legges til de ${count} du har fra før.`,
    scopes: STANDARD_SCOPES,
    hasDifficulty: false,
    hasQuestionKind: false,
  },
  quiz: {
    title: "Lag quiz",
    unit: "spørsmål",
    addedTo: (count) => `Nye spørsmål legges til de ${count} du har fra før.`,
    scopes: STANDARD_SCOPES,
    hasDifficulty: true,
    hasQuestionKind: false,
  },
  freetext: {
    title: "Lag fritekstspørsmål",
    unit: "spørsmål",
    addedTo: (count) => `Nye spørsmål legges til de ${count} du har fra før.`,
    scopes: { values: [5, 10, 15], default: 10 },
    hasDifficulty: false,
    hasQuestionKind: true,
  },
};

type Props = {
  kind: ScopedJobKind;
  open: boolean;
  onClose: () => void;
  // Called by the primary button («Lag flashcards», «Lag quiz», «Lag
  // fritekstspørsmål») with the job's params: the chosen scope, for quiz the
  // chosen difficulty and for free text the chosen question type.
  onStart: (params: JobParams) => void;
  lectureName: string;
  fileCount: number;
  pageCount: number;
  // The lecture's cards or questions so far (0: the line about adding is left out).
  contentCount: number;
  // Where focus goes when the dialog closes, if not back to the opener (see Dialog).
  returnFocus?: () => HTMLElement | null;
};

// The dialogs «Lag flashcards», «Lag quiz» and «Lag fritekstspørsmål» (FR-17,
// FR-29, FR-48, FR-49, UX-DR24, mockup 06): the shared dialog, 720 px wide. The lecture with its files and pages,
// «Nye kort legges til de 24 du har fra før.» (quiz: «Nye spørsmål …») when
// there is content, «Omfang» with three choice cards (Rask/Vanlig/Dyp,
// «Vanlig» chosen when it opens), for quiz «Vanskelighetsgrad» with three
// full-width rows (Lett/Middels/Vanskelig, «Middels» chosen when it opens),
// for free text «Type» with two choice cards (Kortsvar/Langsvar, «Kortsvar»
// chosen when it opens) before «Omfang» (Rask 5, Vanlig 10, Dyp 15, «Vanlig»
// chosen), the expected wait (shorter in demo mode) and «Du kan bruke resten av appen
// imens.». Each group is its own radio group: Tab enters on the chosen option
// and the arrow keys move the choice within the group. The scope cards stand
// side by side from 640 px, under each other on narrower screens. «Avbryt»,
// the cross and Esc close without starting anything; focus goes back to the
// button that opened the dialog.
export function ScopeDialog({
  kind,
  open,
  onClose,
  onStart,
  lectureName,
  fileCount,
  pageCount,
  contentCount,
  returnFocus,
}: Props) {
  const config = useAppConfig();
  const scopeHeadingId = useId();
  const difficultyHeadingId = useId();
  const questionKindHeadingId = useId();
  const texts = KIND_TEXTS[kind];
  const [requested, setRequested] = useState<Requested>(texts.scopes.default);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);
  const [questionKind, setQuestionKind] = useState<QuestionKind>(DEFAULT_QUESTION_KIND);

  // «Vanlig», «Middels» and «Kortsvar» again each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRequested(texts.scopes.default);
      setDifficulty(DEFAULT_DIFFICULTY);
      setQuestionKind(DEFAULT_QUESTION_KIND);
    }
  }

  // Only the fields the type has: the backend rejects the others.
  function params(): JobParams {
    return {
      requested,
      ...(texts.hasDifficulty ? { difficulty } : {}),
      ...(texts.hasQuestionKind ? { question_kind: questionKind } : {}),
    };
  }

  return (
    <Dialog
      open={open}
      title={texts.title}
      width={720}
      onClose={onClose}
      returnFocus={returnFocus}
      primaryAction={{
        label: texts.title,
        onClick: () => onStart(params()),
      }}
    >
      <p className="text-body-sm text-ink-muted">
        {lectureName} · {fileCountLabel(fileCount)}, {pageCountLabel(pageCount)}
      </p>
      {contentCount > 0 ? <p className="mt-1 text-body-sm text-ink-muted">{texts.addedTo(contentCount)}</p> : null}
      {texts.hasQuestionKind ? (
        <>
          <h3 id={questionKindHeadingId} className="mt-4 text-label text-ink">
            Type
          </h3>
          <RadioGroup
            aria-labelledby={questionKindHeadingId}
            value={questionKind}
            onValueChange={(value) => setQuestionKind(value as QuestionKind)}
            className="mt-2 grid-cols-1 min-[640px]:grid-cols-2"
          >
            {QUESTION_KINDS.map((option) => (
              <ChoiceOption
                key={option.value}
                value={option.value}
                title={option.title}
                description={option.description}
              />
            ))}
          </RadioGroup>
        </>
      ) : null}
      <h3 id={scopeHeadingId} className="mt-4 text-label text-ink">
        Omfang
      </h3>
      <RadioGroup
        aria-labelledby={scopeHeadingId}
        value={String(requested)}
        onValueChange={(value) => setRequested(Number(value) as Requested)}
        className="mt-2 grid-cols-1 min-[640px]:grid-cols-3"
      >
        {texts.scopes.values.map((value, index) => (
          <ChoiceOption
            key={value}
            value={String(value)}
            title={SCOPE_TITLES[index]}
            description={`Inntil ${value} ${texts.unit}`}
          />
        ))}
      </RadioGroup>
      {texts.hasDifficulty ? (
        <>
          <h3 id={difficultyHeadingId} className="mt-4 text-label text-ink">
            Vanskelighetsgrad
          </h3>
          <RadioGroup
            aria-labelledby={difficultyHeadingId}
            value={difficulty}
            onValueChange={(value) => setDifficulty(value as Difficulty)}
            className="mt-2 grid-cols-1"
          >
            {DIFFICULTIES.map((option) => (
              <ChoiceOption
                key={option.value}
                value={option.value}
                title={option.title}
                description={option.description}
                layout="row"
              />
            ))}
          </RadioGroup>
        </>
      ) : null}
      <p className="mt-4 text-meta text-ink-muted">
        {config.data?.demo_mode ? "Tar noen sekunder." : "Tar vanligvis under to minutter."}
      </p>
      <p className="text-meta text-ink-muted">Du kan bruke resten av appen imens.</p>
    </Dialog>
  );
}
