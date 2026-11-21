"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { iconProps } from "@/components/icon";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FALLBACK_MESSAGE } from "@/lib/messages";
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
      <ul className="flex flex-col">
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
        <div className="relative">
          <CollapsibleTrigger
            aria-label={subject.name}
            // Lies over the left padding of the subject link, so the row (and its
            // selected style) spans the whole width, as in mockup 03.
            className="absolute top-[4px] left-[4px] z-10 flex size-[24px] cursor-pointer items-center justify-center rounded-sm text-ink-muted hover:bg-row-hover hover:text-ink"
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
              "relative flex h-menu-row min-w-0 items-center gap-[10px] rounded-sm pr-3 pl-[30px] text-ink hover:bg-row-hover",
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
          {lectures.isError ? (
            <p role="alert" className="py-1 pr-3 pl-[48px] text-meta text-danger">
              {FALLBACK_MESSAGE}
            </p>
          ) : null}
          {lectures.data && lectures.data.length > 0 ? (
            <ul className="flex flex-col pb-2">
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
                        "relative flex h-menu-row items-center rounded-sm pr-3 pl-[48px] text-body-sm text-ink hover:bg-row-hover",
                        current && SELECTED,
                      )}
                    >
                      <span aria-hidden="true" className="w-[24px] shrink-0 text-caption text-ink-muted">
                        {week}
                      </span>
                      <span className="min-w-0 flex-1 truncate pr-2">{lecture.name}</span>
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
