"use client";

import { useId } from "react";

import { setShortcutsEnabled, useShortcutsEnabled } from "@/lib/practice-shortcuts";

import { Dialog } from "./dialog";
import { Kbd } from "./ui/kbd";
import { Switch } from "./ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

// The shortcut dialog (EXPERIENCE.md "Hurtigtaster", story 3.4): the shared
// dialog without a main action (one button «Lukk»), titled «Hurtigtaster». A
// table «Tast» / «Handling» with the keys that are built so far (flashcards,
// the result page and dialogs; quiz and free text add theirs later), and under
// it the switch «Bruk hurtigtaster» (on by default, kept in localStorage, WCAG
// 2.1.4). Focus starts on the switch, Esc closes, and focus goes back to where
// it was (returnFocus).

type Row = { keys: string; action: string };

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: "Øving",
    rows: [
      { keys: "?", action: "Åpner hurtigtastdialogen" },
      { keys: "Mellomrom", action: "Snu kortet" },
      { keys: "1", action: "Kunne ikke" },
      { keys: "2", action: "Kunne" },
      { keys: "Esc", action: "Avslutt økten" },
    ],
  },
  {
    title: "Quiz",
    rows: [
      { keys: "A–D", action: "Velg svar" },
      { keys: "Enter", action: "Bekreft svar, deretter neste spørsmål" },
      { keys: "Esc", action: "Avslutt økten" },
    ],
  },
  {
    title: "Resultat",
    rows: [
      { keys: "Enter", action: "Øv igjen" },
      { keys: "Esc", action: "Tilbake" },
    ],
  },
  {
    title: "Dialoger",
    rows: [{ keys: "Esc", action: "Lukk uten endring" }],
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  // Where focus goes when the dialog closes.
  returnFocus?: () => HTMLElement | null;
};

export function ShortcutsDialog({ open, onClose, returnFocus }: Props) {
  const enabled = useShortcutsEnabled();
  const switchId = useId();

  return (
    <Dialog open={open} title="Hurtigtaster" onClose={onClose} returnFocus={returnFocus} focusContentFirst>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="pl-0">
              Tast
            </TableHead>
            <TableHead scope="col">Handling</TableHead>
          </TableRow>
        </TableHeader>
        {GROUPS.map((group) => (
          <TableBody key={group.title}>
            <TableRow>
              <TableHead scope="rowgroup" colSpan={2} className="pt-3 pl-0 text-overline uppercase">
                {group.title}
              </TableHead>
            </TableRow>
            {group.rows.map((row) => (
              <TableRow key={`${group.title}-${row.keys}`}>
                <TableCell className="pl-0">
                  <Kbd>{row.keys}</Kbd>
                </TableCell>
                <TableCell className="text-ink">{row.action}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>
      <div className="mt-4 flex items-center gap-3">
        <Switch id={switchId} checked={enabled} onCheckedChange={setShortcutsEnabled} />
        <label htmlFor={switchId} className="cursor-pointer text-label text-ink">
          Bruk hurtigtaster
        </label>
      </div>
    </Dialog>
  );
}
