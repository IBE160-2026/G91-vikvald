"use client";

import { GenerationRow, type GenerationRowProps } from "./generation-row";

// The Quiz row in «Lag og øv» (story 4.1, mockup 04): «15 spørsmål» or
// «Ingen ennå», «Lag quiz» and «Lag flere», which open the dialog «Lag quiz»
// with scope and difficulty. «Øv nå» is shown but not active until the quiz
// session exists (story 4.2). The logic is in GenerationRow.
export function QuizRow(props: GenerationRowProps) {
  return (
    <GenerationRow
      {...props}
      kind="quiz"
      title="Quiz"
      testId="quiz-row"
      countOf={(counts) => counts.quiz_questions}
      countText={(count) => `${count} spørsmål`}
      createLabel="Lag quiz"
    />
  );
}
