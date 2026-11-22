import { Kbd } from "@/components/ui/kbd";

// The hint line under the card's buttons (DESIGN.md "Hurtigtasthint",
// mockup 07): white keys (kbd) and muted text after them, centred, in the
// mockup's order. Only text, never buttons. Wraps onto more lines when narrow.
// The page shows it only with the switch «Bruk hurtigtaster» on.

export type ShortcutHint = { key: string; text: string };

export const FLASHCARD_HINTS: readonly ShortcutHint[] = [
  { key: "1", text: "Kunne ikke" },
  { key: "2", text: "Kunne" },
  { key: "Mellomrom", text: "snu kortet" },
  { key: "Esc", text: "avslutt" },
];

// The quiz (story 4.2, mockup 09): what Enter does depends on where she is:
// before confirming it confirms, after it goes to the next question, and on
// the last question it shows the result.
export function quizHints(step: "confirm" | "next" | "result"): readonly ShortcutHint[] {
  const enter = step === "confirm" ? "bekreft svar" : step === "next" ? "neste spørsmål" : "se resultatet";
  return [
    { key: "A–D", text: "velg svar" },
    { key: "Enter", text: enter },
    { key: "Esc", text: "avslutt" },
  ];
}

// The quiz result (mockup 10, story 4.3): Enter takes the quiz again, Esc goes
// back to where it started («tilbake til forelesningen»).
export function quizResultHints(backHint: string): readonly ShortcutHint[] {
  return [
    { key: "Enter", text: "ta quizen igjen" },
    { key: "Esc", text: backHint },
  ];
}

// The result page (mockup 08). backHint is where Esc goes: «tilbake til
// forelesningen» or «tilbake til emnet».
export function resultHints(backHint: string): readonly ShortcutHint[] {
  return [
    { key: "Enter", text: "øv igjen" },
    { key: "Esc", text: backHint },
  ];
}

export function ShortcutHints({
  hints,
  align = "center",
}: {
  hints: readonly ShortcutHint[];
  // Centred under buttons, or at the start of the line (the quiz's footer).
  align?: "center" | "start";
}) {
  return (
    <ul
      data-slot="shortcut-hints"
      aria-label="Hurtigtaster"
      className={
        "flex flex-wrap items-center gap-x-5 gap-y-2 " + (align === "center" ? "justify-center" : "justify-start")
      }
    >
      {hints.map((hint) => (
        <li key={hint.key} className="flex items-center gap-2 text-body-sm text-ink-muted">
          <Kbd>{hint.key}</Kbd> {hint.text}
        </li>
      ))}
    </ul>
  );
}
