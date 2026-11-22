"use client";

import { useRouter } from "next/navigation";

import { GenerationRow, type GenerationRowProps } from "./generation-row";

// The Flashcards row in «Lag og øv» (stories 3.1 and 3.2, mockup 04): «24 kort»,
// «Lag flashcards», and «Øv nå», which opens the flashcard session at
// /forelesninger/<id>/flashcards (story 3.3). The logic is in GenerationRow.
export function FlashcardsRow(props: GenerationRowProps) {
  const router = useRouter();
  return (
    <GenerationRow
      {...props}
      kind="flashcards"
      title="Flashcards"
      testId="flashcards-row"
      countOf={(counts) => counts.flashcards}
      countText={(count) => `${count} kort`}
      createLabel="Lag flashcards"
      onPractice={() => router.push(`/forelesninger/${props.lectureId}/flashcards`)}
    />
  );
}
