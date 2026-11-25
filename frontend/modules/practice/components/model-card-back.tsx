import { Info } from "lucide-react";

import { NoteSurface } from "@/components/note-surface";

import type { ModelCard } from "../types";

// The parts of a point: the term (weight 600), a muted part (the translation
// in parentheses) and the rest in normal text. A point that is neither
// «term (oversettelse)» nor «term: forklaring» is all rest.
export type PointParts = { term: string; muted: string; rest: string };

// The first «:» that ends a term: followed by a space (or the end of the
// point), and not inside an unclosed «(». -1 when there is none, so «Kl.
// 10:30» and «https://x» are not split.
function termColon(point: string): number {
  for (let index = point.indexOf(":"); index !== -1; index = point.indexOf(":", index + 1)) {
    if (index === 0) continue;
    const next = point[index + 1];
    if (next !== undefined && next !== " ") continue;
    const before = point.slice(0, index);
    const open = before.split("(").length - before.split(")").length;
    if (open <= 0) return index;
  }
  return -1;
}

// «Attention (oppmerksomhet)» -> term «Attention», muted «(oppmerksomhet)».
// «Produkt: varen …» -> term «Produkt», rest «: varen …». Whichever of a
// closed «(…)» and a term colon (see termColon) comes first decides; one at
// the very start does not count. Anything else is plain text.
export function pointParts(point: string): PointParts {
  const paren = point.indexOf("(");
  const colon = termColon(point);
  const close = paren > 0 ? point.indexOf(")", paren) : -1;
  if (paren > 0 && close > paren && (colon === -1 || paren < colon)) {
    return {
      term: point.slice(0, paren).trimEnd(),
      muted: point.slice(paren, close + 1),
      rest: point.slice(close + 1),
    };
  }
  if (colon > 0) {
    return { term: point.slice(0, colon), muted: "", rest: point.slice(colon) };
  }
  return { term: "", muted: "", rest: point };
}

// The letter in the box: the point's first letter (any alphabet, æ/ø/å too),
// upper case. Empty when the point has no letter.
export function pointLetter(point: string): string {
  return point.match(/\p{L}/u)?.[0].toLocaleUpperCase("nb-NO") ?? "";
}

// The back of a model card (model-card, UX-DR28, sketch 11): the points as an
// ordered list, each with a letter box in front, the boxes joined by a thin
// vertical line. The boxes are hidden from screen readers, so each point is
// read once (UX-DR45). Under them the mnemonic on the note surface with the
// info icon, «Huskeregel: …»; without a mnemonic only the points are shown.
// Text is plain text, never HTML.
export function ModelCardBack({ card }: { card: ModelCard }) {
  return (
    <div data-slot="model-card-back" className="flex flex-col gap-4">
      <ol className="relative flex flex-col gap-[13px]">
        {card.points.length > 1 ? (
          <span
            aria-hidden="true"
            data-slot="model-card-line"
            className="absolute top-[17px] bottom-[17px] left-[17.5px] w-[1.5px] -translate-x-1/2 bg-border-card"
          />
        ) : null}
        {card.points.map((point, index) => {
          const parts = pointParts(point);
          return (
            <li key={index} className="relative flex items-start gap-[20px]">
              <span
                aria-hidden="true"
                data-slot="letter-box"
                className="flex size-[35px] shrink-0 items-center justify-center rounded-md border border-border-card bg-surface-note text-[18px] font-semibold text-ink"
              >
                {pointLetter(point)}
              </span>
              <span
                data-slot="point-text"
                className="block min-w-0 pt-[3px] text-[20px] leading-[28px] break-words whitespace-pre-line text-ink"
              >
                {parts.term ? <span className="font-semibold">{parts.term}</span> : null}
                {parts.term && parts.muted ? " " : null}
                {parts.muted ? <span className="text-ink-muted">{parts.muted}</span> : null}
                {parts.rest}
              </span>
            </li>
          );
        })}
      </ol>
      {card.mnemonic ? (
        <NoteSurface icon={Info}>
          <p className="break-words whitespace-pre-line">
            <span className="font-semibold">Huskeregel:</span> {card.mnemonic}
          </p>
        </NoteSurface>
      ) : null}
    </div>
  );
}
