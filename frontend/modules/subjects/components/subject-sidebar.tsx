"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { cn } from "@/lib/utils";

import { SUBJECTS_QUERY_KEY, fetchSubjects } from "../api";
import { lectureCountLabel } from "../format";
import { SubjectDot } from "./subject-dot";

// sidebar-tree (DESIGN.md "Ramme", mockup 03): 288 px, paper, a divider line on
// the right. The overline EMNER and one link per subject: dot, name (cut off
// with «…» when long) and the number of lectures on the right. The open subject
// has aria-current="page" and the selected style (brand-tint and a 2 px brand
// line on the left). The link's accessible name is the whole subject name (it is
// only cut off visually, by CSS); the number is hidden from screen readers and
// given as the link's description instead («0 forelesninger»).
//
// Plain nav/ul markup, not the shadcn Sidebar: there is nothing to open or close
// yet, only links.
export function SubjectSidebar({ currentSubjectId }: { currentSubjectId?: string }) {
  const subjects = useQuery({ queryKey: SUBJECTS_QUERY_KEY, queryFn: fetchSubjects });

  return (
    <nav aria-label="Emner" className="w-sidebar-width shrink-0 border-r border-divider bg-paper px-2 pt-6 pb-6">
      <p aria-hidden="true" className="px-3 pb-2 text-overline text-ink-muted">
        EMNER
      </p>
      <ul className="flex flex-col gap-1">
        {(subjects.data ?? []).map((subject) => {
          const current = subject.id === currentSubjectId;
          const countId = `sidebar-count-${subject.id}`;
          return (
            <li key={subject.id}>
              <Link
                href={`/emner/${subject.id}`}
                aria-current={current ? "page" : undefined}
                aria-describedby={countId}
                className={cn(
                  "relative flex h-menu-row items-center gap-3 rounded-sm px-3 text-ink hover:bg-row-hover",
                  current &&
                    "bg-brand-tint hover:bg-brand-tint before:absolute before:inset-y-[6px] before:left-0 before:w-[2px] before:rounded-full before:bg-brand",
                )}
              >
                <SubjectDot colorIndex={subject.color_index} />
                <span className="min-w-0 flex-1 truncate text-label">{subject.name}</span>
                <span aria-hidden="true" className="text-caption text-ink-muted">
                  {subject.lecture_count}
                </span>
                <span id={countId} hidden>
                  {lectureCountLabel(subject.lecture_count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
