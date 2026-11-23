"use client";

import { useRouter } from "next/navigation";

import { useAppConfig } from "@/lib/config";

import { GenerationRow, type ExtraJob, type GenerationRowProps } from "./generation-row";

// «Lag modellkort» has no dialog, so it asks for the largest scope (story 7.1).
const MODEL_CARDS: ExtraJob = { kind: "models", label: "Lag modellkort", requested: 30 };

// The Flashcards row in «Lag og øv» (stories 3.1 and 3.2, mockup 04): «24 kort»,
// «Lag flashcards», and «Øv nå», which opens the flashcard session at
// /forelesninger/<id>/flashcards (story 3.3). The logic is in GenerationRow.
//
// With FEATURE_MNEMONICS on, the row also has the text button «Lag modellkort»
// (story 7.1, UX-DR18), which starts a model-card job directly, and its count
// includes the model cards. With the switch off (or before the config has
// loaded) the button is not shown.
export function FlashcardsRow(props: GenerationRowProps) {
  const router = useRouter();
  const config = useAppConfig();
  return (
    <GenerationRow
      {...props}
      kind="flashcards"
      extra={config.data?.feature_mnemonics ? MODEL_CARDS : undefined}
      title="Flashcards"
      testId="flashcards-row"
      countOf={(counts) => counts.flashcards + (counts.model_cards ?? 0)}
      countText={(count) => `${count} kort`}
      createLabel="Lag flashcards"
      onPractice={() => router.push(`/forelesninger/${props.lectureId}/flashcards`)}
    />
  );
}
