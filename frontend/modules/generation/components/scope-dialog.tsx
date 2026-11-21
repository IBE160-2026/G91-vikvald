"use client";

import { useId, useState } from "react";

import { ChoiceOption } from "@/components/choice-option";
import { Dialog } from "@/components/dialog";
import { RadioGroup } from "@/components/ui/radio-group";
import { useAppConfig } from "@/lib/config";
import { fileCountLabel, pageCountLabel } from "@/modules/subjects/format";

import type { Requested } from "../types";

const SCOPES: { value: Requested; title: string; description: string }[] = [
  { value: 10, title: "Rask", description: "Inntil 10 kort" },
  { value: 20, title: "Vanlig", description: "Inntil 20 kort" },
  { value: 30, title: "Dyp", description: "Inntil 30 kort" },
];
const DEFAULT_SCOPE: Requested = 20;

type Props = {
  open: boolean;
  onClose: () => void;
  // Called with the chosen scope by «Lag flashcards».
  onStart: (requested: Requested) => void;
  lectureName: string;
  fileCount: number;
  pageCount: number;
  // The lecture's cards so far (0: the line about adding is left out).
  cardCount: number;
  // Where focus goes when the dialog closes, if not back to the opener (see Dialog).
  returnFocus?: () => HTMLElement | null;
};

// The dialog «Lag flashcards» (FR-17, UX-DR24, mockup 06): the shared dialog,
// 720 px wide. The lecture with its files and pages, «Nye kort legges til de 24
// du har fra før.» when there are cards, «Omfang» with three choice cards
// (Rask/Vanlig/Dyp, «Vanlig» chosen when it opens), the expected wait (shorter
// in demo mode) and «Du kan bruke resten av appen imens.». The choice cards are
// one radio group: Tab enters on the chosen card and the arrow keys move the
// choice. Side by side from 640 px, under each other on narrower screens.
// «Avbryt», the cross and Esc close without starting anything; focus goes
// back to the button that opened the dialog.
export function ScopeDialog({
  open,
  onClose,
  onStart,
  lectureName,
  fileCount,
  pageCount,
  cardCount,
  returnFocus,
}: Props) {
  const config = useAppConfig();
  const headingId = useId();
  const [requested, setRequested] = useState<Requested>(DEFAULT_SCOPE);

  // «Vanlig» again each time the dialog opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRequested(DEFAULT_SCOPE);
  }

  return (
    <Dialog
      open={open}
      title="Lag flashcards"
      width={720}
      onClose={onClose}
      returnFocus={returnFocus}
      primaryAction={{ label: "Lag flashcards", onClick: () => onStart(requested) }}
    >
      <p className="text-body-sm text-ink-muted">
        {lectureName} · {fileCountLabel(fileCount)}, {pageCountLabel(pageCount)}
      </p>
      {cardCount > 0 ? (
        <p className="mt-1 text-body-sm text-ink-muted">Nye kort legges til de {cardCount} du har fra før.</p>
      ) : null}
      <h3 id={headingId} className="mt-4 text-label text-ink">
        Omfang
      </h3>
      <RadioGroup
        aria-labelledby={headingId}
        value={String(requested)}
        onValueChange={(value) => setRequested(Number(value) as Requested)}
        className="mt-2 grid-cols-1 min-[640px]:grid-cols-3"
      >
        {SCOPES.map((scope) => (
          <ChoiceOption key={scope.value} value={String(scope.value)} title={scope.title} description={scope.description} />
        ))}
      </RadioGroup>
      <p className="mt-4 text-meta text-ink-muted">
        {config.data?.demo_mode ? "Tar noen sekunder." : "Tar vanligvis under to minutter."}
      </p>
      <p className="text-meta text-ink-muted">Du kan bruke resten av appen imens.</p>
    </Dialog>
  );
}
