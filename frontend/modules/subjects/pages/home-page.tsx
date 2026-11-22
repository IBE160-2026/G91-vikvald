"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { examLine } from "@/lib/exam";
import { useFocusHeadingOnArrival } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { OVERVIEW_QUERY_KEY, fetchOverview } from "@/modules/practice/api";
import type { Overview } from "@/modules/practice/types";

import { SUBJECTS_QUERY_KEY, fetchSubjects } from "../api";
import { SubjectDot } from "../components/subject-dot";
import { SubjectFormDialog } from "../components/subject-form-dialog";
import { formatDate, lectureCountLabel, semesterLabel } from "../format";
import type { Subject } from "../types";

// The front page (mockup 02): no sidebar, 80 px margin on both sides. The h1
// «Dine emner», the semester and today's date under it, and the outline button
// «Nytt emne» on the right. Her subjects stand in a simple list in a white card
// (epic 5 replaces it with the semester line and subject cards). With no subjects
// there is one sentence about the app and the primary button «Lag ditt første emne».
// Between the subtitle and the list stands one exam line per subject (story
// 5.3): the name and «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger øvd».
// After a subject is deleted she lands here, and the h1 gets focus (#75).
export function HomePage() {
  const subjects = useQuery({ queryKey: SUBJECTS_QUERY_KEY, queryFn: fetchSubjects });
  // The counts N and M (story 5.3). Refetched when a session is saved.
  const overview = useQuery({ queryKey: OVERVIEW_QUERY_KEY, queryFn: fetchOverview });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [today] = useState(() => new Date());
  const hasSubjects = (subjects.data?.length ?? 0) > 0;
  const headingRef = useRef<HTMLHeadingElement>(null);
  useFocusHeadingOnArrival(headingRef, subjects.isSuccess);

  return (
    <div className="px-home-margin pt-7 pb-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 ref={headingRef} tabIndex={-1} className="text-page-title">
            Dine emner
          </h1>
          <p className="mt-1 text-body-sm text-ink-muted">{semesterLabel(today)}</p>
        </div>
        {hasSubjects ? (
          <Button variant="outline" className="shrink-0" onClick={() => setDialogOpen(true)}>
            <Plus {...iconProps} />
            Nytt emne
          </Button>
        ) : null}
      </div>

      {subjects.isError ? (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : null}

      {subjects.data && hasSubjects ? <ExamLines subjects={subjects.data} overview={overview.data} /> : null}

      {subjects.data && hasSubjects ? <SubjectList subjects={subjects.data} /> : null}

      {subjects.data && !hasSubjects ? (
        <div className="mt-6 flex flex-col items-start gap-4">
          <p className="max-w-[568px]">
            Studiekamerat lager flashcards og quiz fra forelesningsnotatene dine, så du kan øve fram mot eksamen.
          </p>
          <Button onClick={() => setDialogOpen(true)}>Lag ditt første emne</Button>
        </div>
      ) : null}

      <SubjectFormDialog mode="create" open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}

// One line per subject, in the list's order, where mockup 02 has the semester
// line (5.5 replaces these lines with it). The exam date and name come from the
// subject list, so a changed exam date shows at once; the counts come from the
// overview. Until the overview is loaded, or when it fails, only the exam part
// is shown. Today is read again every time the page is drawn.
// A list for screen readers (role="list"), built from div elements so it is
// not one more `li` in the page: the user journeys in e2e/brukerreiser/ find
// the subject list's rows as `main li`, and they stay unchanged.
function ExamLines({ subjects, overview }: { subjects: Subject[]; overview: Overview | undefined }) {
  const today = new Date();
  return (
    <div role="list" className="mt-6 flex flex-col gap-2">
      {subjects.map((subject) => {
        const lectures = overview?.subjects.find((item) => item.id === subject.id)?.lectures;
        return (
          <div role="listitem" key={subject.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-item-title text-ink">{subject.name}</span>
            <span className="text-meta text-ink-muted">{examLine(subject.exam_date, today, lectures)}</span>
          </div>
        );
      })}
    </div>
  );
}

function SubjectList({ subjects }: { subjects: Subject[] }) {
  return (
    <ul className="mt-6 rounded-lg border border-border-card bg-surface shadow-lift">
      {subjects.map((subject) => (
        <li
          key={subject.id}
          className="flex items-center gap-4 border-b border-divider px-4 py-3 last:border-b-0"
        >
          <SubjectDot colorIndex={subject.color_index} />
          <Link
            href={`/emner/${subject.id}`}
            className="min-w-0 flex-1 truncate rounded-sm text-item-title text-ink hover:text-brand"
          >
            {subject.name}
          </Link>
          <span className="text-meta text-ink-muted">{lectureCountLabel(subject.lecture_count)}</span>
          <span className="w-[160px] text-right text-meta text-ink-muted">
            Eksamen {formatDate(subject.exam_date)}
          </span>
        </li>
      ))}
    </ul>
  );
}
