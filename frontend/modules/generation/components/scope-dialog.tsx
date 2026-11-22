"use client";

import { useId, useState } from "react";

import { ChoiceOption } from "@/components/choice-option";
import { Dialog } from "@/components/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { useAppConfig } from "@/lib/config";
import { fileCountLabel, pageCountLabel } from "@/modules/subjects/format";

import type { Difficulty, JobKind, Requested } from "../types";

const SCOPE_TITLES: { value: Requested; title: string }[] = [
  { value: 10, title: "Rask" },
  { value: 20, title: "Vanlig" },
  { value: 30, title: "Dyp" },
];
const DEFAULT_SCOPE: Requested = 20;

const DIFFICULTIES: { value: Difficulty; title: string; description: string }[] = [
  { value: "easy", title: "Lett", description: "Kjenne igjen en definisjon" },
  { value: "medium", title: "Middels", description: "Forstå sammenhenger" },
  { value: "hard", title: "Vanskelig", description: "Bruke stoffet på et eksempel" },
];
const DEFAULT_DIFFICULTY: Difficulty = "medium";

// What differs between the types: the title (also the button), the noun in
// «Inntil 20 kort», the line about what she has, and whether there is a
// difficulty to choose.
const KIND_TEXTS: Record<
  JobKind,
  { title: string; unit: string; addedTo: (count: number) => string; hasDifficulty: boolean }
> = {
  flashcards: {
    title: "Lag flashcards",
    unit: "kort",
    addedTo: (count) => `Nye kort legges til de ${count} du har fra før.`,
    hasDifficulty: false,
  },
  quiz: {
    title: "Lag quiz",
    unit: "spørsmål",
    addedTo: (count) => `Nye spørsmål legges til de ${count} du har fra før.`,
    hasDifficulty: true,
  },
};

type Props = {
  kind: JobKind;
  open: boolean;
  onClose: () => void;
  // Called by «Lag flashcards» / «Lag quiz» with the chosen scope, and for
  // quiz the chosen difficulty.
  onStart: (requested: Requested, difficulty?: Difficulty) => void;
  lectureName: string;
  fileCount: number;
  pageCount: number;
  // The lecture's cards or questions so far (0: the line about adding is left out).
  contentCount: number;
  // Where focus goes when the dialog closes, if not back to the opener (see Dialog).
  returnFocus?: () => HTMLElement | null;
};

// The dialogs «Lag flashcards» and «Lag quiz» (FR-17, FR-29, UX-DR24, mockup
// 06): the shared dialog, 720 px wide. The lecture with its files and pages,
// «Nye kort legges til de 24 du har fra før.» (quiz: «Nye spørsmål …») when
// there is content, «Omfang» with three choice cards (Rask/Vanlig/Dyp,
// «Vanlig» chosen when it opens), for quiz «Vanskelighetsgrad» with three
// full-width rows (Lett/Middels/Vanskelig, «Middels» chosen when it opens),
// the expected wait (shorter in demo mode) and «Du kan bruke resten av appen
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
  const texts = KIND_TEXTS[kind];
  const [requested, setRequested] = useState<Requested>(DEFAULT_SCOPE);
  const [difficulty, setDifficulty] = useState<Difficulty>(DEFAULT_DIFFICULTY);

  // «Vanlig» and «Middels» again each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setRequested(DEFAULT_SCOPE);
      setDifficulty(DEFAULT_DIFFICULTY);
    }
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
        onClick: () => (texts.hasDifficulty ? onStart(requested, difficulty) : onStart(requested)),
      }}
    >
      <p className="text-body-sm text-ink-muted">
        {lectureName} · {fileCountLabel(fileCount)}, {pageCountLabel(pageCount)}
      </p>
      {contentCount > 0 ? <p className="mt-1 text-body-sm text-ink-muted">{texts.addedTo(contentCount)}</p> : null}
      <h3 id={scopeHeadingId} className="mt-4 text-label text-ink">
        Omfang
      </h3>
      <RadioGroup
        aria-labelledby={scopeHeadingId}
        value={String(requested)}
        onValueChange={(value) => setRequested(Number(value) as Requested)}
        className="mt-2 grid-cols-1 min-[640px]:grid-cols-3"
      >
        {SCOPE_TITLES.map((scope) => (
          <ChoiceOption
            key={scope.value}
            value={String(scope.value)}
            title={scope.title}
            description={`Inntil ${scope.value} ${texts.unit}`}
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
