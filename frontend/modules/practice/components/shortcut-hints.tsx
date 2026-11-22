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

// The result page (mockup 08).
export const RESULT_HINTS: readonly ShortcutHint[] = [
  { key: "Enter", text: "øv igjen" },
  { key: "Esc", text: "tilbake til forelesningen" },
];

export function ShortcutHints({ hints }: { hints: readonly ShortcutHint[] }) {
  return (
    <ul
      data-slot="shortcut-hints"
      aria-label="Hurtigtaster"
      className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
    >
      {hints.map((hint) => (
        <li key={hint.key} className="flex items-center gap-2 text-body-sm text-ink-muted">
          <Kbd>{hint.key}</Kbd> {hint.text}
        </li>
      ))}
    </ul>
  );
}
