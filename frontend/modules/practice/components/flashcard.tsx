"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { iconProps } from "@/components/icon";
import { FormulaFlag } from "@/components/formula-flag";
import { SourceLink } from "@/components/source-link";
import { Button } from "@/components/ui/button";

import type { Flashcard as FlashcardData, Mark } from "../types";
import { ModelCardBack } from "./model-card-back";
import { FLASHCARD_HINTS, ShortcutHints } from "./shortcut-hints";

type Props = {
  card: FlashcardData;
  flipped: boolean;
  onFlip: () => void;
  onMark: (mark: Mark) => void;
  // Put focus on «Snu kortet» when the card appears (after the previous card
  // was marked), so Tab and Enter keep working. Not on the first card.
  focusOnMount?: boolean;
  // Show the shortcut hint line under the buttons (the switch «Bruk
  // hurtigtaster» is on).
  showHints?: boolean;
  // «Rediger» and «Slett» in the footer of a flipped card (story 3.7). Left
  // out, the buttons are not shown.
  onEdit?: () => void;
  onDelete?: () => void;
  // «Endre huskeregel» / «Legg til huskeregel» on a flipped model card (story
  // 7.2). Left out (FEATURE_MNEMONICS off), the button is not shown.
  onEditMnemonic?: () => void;
};

// flashcard (DESIGN.md "Øving", mockup 07): white, at most 768 px, rounded.xl,
// border-card and the float shadow. The overline SPØRSMÅL and the front.
// Not flipped: the back is not in the DOM, and the outline button «Snu kortet»
// stands in the card; a click anywhere on the card flips it too. Flipped: a
// hairline, the overline SVAR and the back, a hairline and the source at the
// bottom. No animation. Text is shown as plain text, never as HTML. Question
// cards and concept cards look the same.
//
// Story 3.7: the footer of a flipped card has the source on the left and the
// text buttons «Rediger» (pencil) and «Slett» (red, bin) on the right; on a
// narrow screen they wrap under the source. A click on them never flips the
// card.
//
// Under the card: «Kunne ikke» (outline, ✗) and «Kunne» (primary, ✓), both
// 208 × 48 px and disabled until the card is flipped. After the flip, focus
// goes to «Kunne». Under them the shortcut hint line (story 3.4).
//
// Story 7.2: a model card (kind "model") has the same frame, buttons and keys,
// but its back is model-card-back (the points and the mnemonic), and the
// footer has «Endre huskeregel» (or «Legg til huskeregel» when it has none)
// before «Rediger».
export function Flashcard({
  card,
  flipped,
  onFlip,
  onMark,
  focusOnMount = false,
  showHints = false,
  onEdit,
  onDelete,
  onEditMnemonic,
}: Props) {
  const flipRef = useRef<HTMLButtonElement>(null);
  // Only a model card has a mnemonic to change.
  const mnemonicAction = card.kind === "model" ? onEditMnemonic : undefined;
  const knownRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Only when this card appears (the page gives each card its own key).
    if (focusOnMount) flipRef.current?.focus();
  }, [focusOnMount]);

  useEffect(() => {
    if (flipped) knownRef.current?.focus();
  }, [flipped]);

  return (
    <div className="flex w-full max-w-flashcard-width flex-col items-center gap-6">
      <div
        data-slot="flashcard"
        data-flipped={flipped}
        onClick={flipped ? undefined : onFlip}
        className={
          "w-full rounded-xl border border-border-card bg-surface shadow-float " +
          (flipped ? "" : "cursor-pointer")
        }
      >
        <div className="px-7 pt-6 pb-5">
          <p className="text-overline text-ink-muted">SPØRSMÅL</p>
          <p className="mt-2 text-card-question break-words whitespace-pre-line text-ink">{card.front}</p>
          {flipped ? null : (
            <Button
              ref={flipRef}
              data-flip-button=""
              variant="outline"
              className="mt-5"
              onClick={(event) => {
                // The card itself also flips on click: flip once, not twice.
                event.stopPropagation();
                onFlip();
              }}
            >
              Snu kortet
            </Button>
          )}
        </div>
        {flipped ? (
          <>
            <div className="border-t border-divider px-7 pt-5 pb-5">
              <p className="text-overline text-ink-muted">SVAR</p>
              {card.kind === "model" ? (
                <div className="mt-3">
                  <ModelCardBack card={card} />
                </div>
              ) : (
                <p className="mt-2 text-card-answer break-words whitespace-pre-line text-ink">{card.back}</p>
              )}
            </div>
            <div
              data-slot="flashcard-footer"
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-divider px-7 py-4"
            >
              <FormulaFlag flagged={card.formula_flag} className="basis-full" />
              <SourceLink source={card.source} />
              {onEdit || onDelete || mnemonicAction ? (
                <div className="flex flex-wrap gap-1">
                  {mnemonicAction ? (
                    <Button
                      variant="text"
                      onClick={(event) => {
                        event.stopPropagation();
                        mnemonicAction();
                      }}
                    >
                      <Pencil {...iconProps} />
                      {card.kind === "model" && card.mnemonic ? "Endre huskeregel" : "Legg til huskeregel"}
                    </Button>
                  ) : null}
                  {onEdit ? (
                    <Button
                      variant="text"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit();
                      }}
                    >
                      <Pencil {...iconProps} />
                      Rediger
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      variant="text"
                      className="text-danger hover:bg-danger-tint"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete();
                      }}
                    >
                      <Trash2 {...iconProps} />
                      Slett
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button
          variant="outline"
          size="lg"
          className="w-[208px]"
          disabled={!flipped}
          onClick={() => onMark("missed")}
        >
          <X {...iconProps} />
          Kunne ikke
        </Button>
        <Button
          ref={knownRef}
          size="lg"
          className="w-[208px]"
          disabled={!flipped}
          onClick={() => onMark("known")}
        >
          <Check {...iconProps} />
          Kunne
        </Button>
      </div>
      {showHints ? <ShortcutHints hints={FLASHCARD_HINTS} /> : null}
    </div>
  );
}
