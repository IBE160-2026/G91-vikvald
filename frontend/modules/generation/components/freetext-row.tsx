"use client";

import { GenerationRow, type GenerationRowProps } from "./generation-row";

// The Fritekstspørsmål row in «Lag og øv» (story 8.1, FR-48): «12
// spørsmål» or «Ingen ennå», «Lag fritekstspørsmål» and «Lag flere», which
// open the dialog «Lag fritekstspørsmål» with type (Kortsvar/Langsvar) and
// scope (5/10/15). There is no «Øv nå» until the session is built in story
// 8.2. The lecture page shows the row only when FEATURE_FREETEXT is on. The
// logic is in GenerationRow.
export function FreetextRow(props: GenerationRowProps) {
  return (
    <GenerationRow
      {...props}
      kind="freetext"
      title="Fritekstspørsmål"
      testId="freetext-row"
      countOf={(counts) => counts.freetext_questions ?? 0}
      countText={(count) => `${count} spørsmål`}
      createLabel="Lag fritekstspørsmål"
      showPractice={false}
    />
  );
}
