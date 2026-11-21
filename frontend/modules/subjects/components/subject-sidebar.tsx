"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

import { SUBJECTS_QUERY_KEY, fetchLectures, fetchSubjects, lecturesQueryKey } from "../api";
import { isoWeek, lectureCountLabel } from "../format";
import type { Subject } from "../types";
import { SubjectDot } from "./subject-dot";

// sidebar-tree (DESIGN.md "Ramme", mockup 03): 288 px, paper, a divider line on
// the right. The overline EMNER and one row per subject: a button with an arrow
// that opens and closes the subject (shadcn Collapsible, aria-expanded), and
// next to it the link to the subject page: dot, name (cut off with «…» when
// long) and the number of lectures on the right. The link's accessible name is
// the whole subject name; the number is hidden from screen readers and given
// as the link's description instead («0 forelesninger»).
//
// An open subject shows its lectures as menu-rows: the ISO week number in muted
// grey, the name (cut off with «…»), and a hollow status dot on the right (filled
// comes with practice in epic 5). The link's accessible name is the whole
// lecture name and the week is its description («Uke 37»).
//
// The subject of the page being shown is open from the start. The current page
// has aria-current="page" and the selected style (brand-tint and a 2 px brand
// line on the left): the subject on its own page, the lecture on a lecture page.
const SELECTED =
  "bg-brand-tint hover:bg-brand-tint before:absolute before:inset-y-[6px] before:left-0 before:w-[2px] before:rounded-full before:bg-brand";

type Props = {
  // The subject of the page being shown (open from the start).
  currentSubjectId?: string;
  // The lecture being shown, on a lecture page.
  currentLectureId?: string;
};

export function SubjectSidebar({ currentSubjectId, currentLectureId }: Props) {
  const subjects = useQuery({ queryKey: SUBJECTS_QUERY_KEY, queryFn: fetchSubjects });

  return (
    <nav aria-label="Emner" className="w-sidebar-width shrink-0 border-r border-divider bg-paper px-2 pt-6 pb-6">
      <p aria-hidden="true" className="px-3 pb-2 text-overline text-ink-muted">
        EMNER
      </p>
      <ul className="flex flex-col gap-1">
        {(subjects.data ?? []).map((subject) => (
          <SubjectItem
            key={subject.id}
            subject={subject}
            isCurrentSubject={subject.id === currentSubjectId}
            currentLectureId={currentLectureId}
          />
        ))}
      </ul>
    </nav>
  );
}

function SubjectItem({
  subject,
  isCurrentSubject,
  currentLectureId,
}: {
  subject: Subject;
  isCurrentSubject: boolean;
  currentLectureId?: string;
}) {
  const [open, setOpen] = useState(isCurrentSubject);
  // When this becomes the subject of the page (e.g. once a lecture page has
  // loaded its lecture), it opens. Closing it again is up to her.
  const [wasCurrent, setWasCurrent] = useState(isCurrentSubject);
  if (isCurrentSubject !== wasCurrent) {
    setWasCurrent(isCurrentSubject);
    if (isCurrentSubject) setOpen(true);
  }

  const lectures = useQuery({
    queryKey: lecturesQueryKey(subject.id),
    queryFn: () => fetchLectures(subject.id),
    enabled: open,
  });
  // On a lecture page the subject link is not the current page.
  const subjectIsPage = isCurrentSubject && !currentLectureId;
  const countId = `sidebar-count-${subject.id}`;

  return (
    <li>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center gap-1">
          <CollapsibleTrigger
            aria-label={subject.name}
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-ink-muted hover:bg-row-hover hover:text-ink"
          >
            <ChevronRight
              {...iconProps}
              className={cn("transition-transform motion-reduce:transition-none", open && "rotate-90")}
            />
          </CollapsibleTrigger>
          <Link
            href={`/emner/${subject.id}`}
            aria-current={subjectIsPage ? "page" : undefined}
            aria-describedby={countId}
            className={cn(
              "relative flex h-menu-row min-w-0 flex-1 items-center gap-3 rounded-sm px-3 text-ink hover:bg-row-hover",
              subjectIsPage && SELECTED,
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
        </div>
        <CollapsibleContent>
          {lectures.data && lectures.data.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1 pl-7">
              {lectures.data.map((lecture) => {
                const current = lecture.id === currentLectureId;
                const week = isoWeek(lecture.date);
                const weekId = `sidebar-week-${lecture.id}`;
                return (
                  <li key={lecture.id}>
                    <Link
                      href={`/forelesninger/${lecture.id}`}
                      aria-current={current ? "page" : undefined}
                      aria-describedby={weekId}
                      className={cn(
                        "relative flex h-menu-row items-center gap-3 rounded-sm px-3 text-body-sm text-ink hover:bg-row-hover",
                        current && SELECTED,
                      )}
                    >
                      <span aria-hidden="true" className="w-5 shrink-0 text-caption text-ink-muted">
                        {week}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{lecture.name}</span>
                      <span
                        aria-hidden="true"
                        data-status="not-practised"
                        className="size-[8px] shrink-0 rounded-full border-[1.5px] border-ink-muted"
                      />
                      <span id={weekId} hidden>
                        Uke {week}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
