// Types for the practice module, mirroring backend/app/modules/content/schemas.py.

import type { Source } from "@/components/source-link";

export type FlashcardSource = Source & {
  file_id: string;
};

export type Flashcard = {
  id: string;
  // "qa" (question/answer) or "concept" (term/explanation); both are shown the same way.
  kind: "qa" | "concept";
  front: string;
  back: string | null;
  source: FlashcardSource;
};

// How a card was marked: «Kunne» or «Kunne ikke».
export type Mark = "known" | "missed";
