import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { iconProps } from "@/components/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatDayMonth } from "../format";
import type { Lecture } from "../types";

// lecture-table (DESIGN.md "Oversikt", mockup 03) in a white card: the columns
// Dato (dd.mm) and Forelesning, and the arrow (›) in icon-faint at the far
// right (it turns dark on hover). Files, cards, quiz and status come in later
// stories. The lectures stand in the order the backend gives (by date).
//
// The whole row is clickable: the one link per row sits on the name and its
// ::after covers the row (the row is `relative`), so the table keeps its table
// semantics. The arrow is decoration and lies in the name cell, so the table
// has no column without a header.
export function LectureTable({ lectures }: { lectures: Lecture[] }) {
  return (
    <div className="rounded-lg border border-border-card bg-surface shadow-lift">
      {/* Fixed layout, so a long name is cut off with «…» instead of pushing the arrow out. */}
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[96px] pl-4">Dato</TableHead>
            <TableHead>Forelesning</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lectures.map((lecture) => (
            <TableRow key={lecture.id} className="group relative hover:bg-row-hover">
              <TableCell className="pl-4 text-ink-muted">{formatDayMonth(lecture.date)}</TableCell>
              <TableCell className="pr-4">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/forelesninger/${lecture.id}`}
                    className="min-w-0 flex-1 truncate rounded-sm text-ink after:absolute after:inset-0"
                  >
                    {lecture.name}
                  </Link>
                  <ChevronRight
                    {...iconProps}
                    className="shrink-0 text-icon-faint group-hover:text-ink"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
