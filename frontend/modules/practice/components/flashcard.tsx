"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { iconProps } from "@/components/icon";
import { SourceLink } from "@/components/source-link";
import { Button } from "@/components/ui/button";

import type { Flashcard as FlashcardData, Mark } from "../types";

type Props = {
  card: FlashcardData;
  flipped: boolean;
  onFlip: () => void;
  onMark: (mark: Mark) => void;
  // Put focus on «Snu kortet» when the card appears (after the previous card
  // was marked), so Tab and Enter keep working. Not on the first card.
  focusOnMount?: boolean;
};

// flashcard (DESIGN.md "Øving", mockup 07): white, at most 768 px, rounded.xl,
// border-card and the float shadow. The overline SPØRSMÅL and the front.
// Not flipped: the back is not in the DOM, and the outline button «Snu kortet»
// stands in the card; a click anywhere on the card flips it too. Flipped: a
// hairline, the overline SVAR and the back, a hairline and the source at the
// bottom. No animation. Text is shown as plain text, never as HTML. Question
// cards and concept cards look the same.
//
// Under the card: «Kunne ikke» (outline, ✗) and «Kunne» (primary, ✓), both
// 208 × 48 px and disabled until the card is flipped. After the flip, focus
// goes to «Kunne».
export function Flashcard({ card, flipped, onFlip, onMark, focusOnMount = false }: Props) {
  const flipRef = useRef<HTMLButtonElement>(null);
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
              <p className="mt-2 text-card-answer break-words whitespace-pre-line text-ink">{card.back}</p>
            </div>
            <div className="border-t border-divider px-7 py-4">
              <SourceLink source={card.source} />
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
    </div>
  );
}
