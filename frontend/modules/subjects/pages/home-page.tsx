"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { CircleAlert, Plus } from "lucide-react";
import { useRef, useState } from "react";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { examLine } from "@/lib/exam";
import { useFocusHeadingOnArrival } from "@/lib/focus-heading";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { fetchFileCounts, fileCountsQueryKey } from "@/modules/files/api";
import type { SubjectFileCounts } from "@/modules/files/types";
import { OVERVIEW_QUERY_KEY, fetchOverview } from "@/modules/practice/api";
import type { Overview } from "@/modules/practice/types";

import { SUBJECTS_QUERY_KEY, fetchSubjects } from "../api";
import { SubjectCard } from "../components/subject-card";
import { SubjectFormDialog } from "../components/subject-form-dialog";
import { semesterLabel } from "../format";
import type { Subject } from "../types";

// The front page (mockup 02): no sidebar, 80 px margin on both sides. The h1
// «Dine emner», the semester and today's date under it, and the outline button
// «Nytt emne» on the right. Under the subtitle stands one exam line per subject
// (story 5.3): the name and «Eksamen 04.12, om 3 uker · 4 av 8 forelesninger
// øvd». Under the lines, one subject card per subject in a grid (story 5.4,
// FR-58, UX-DR12). With no subjects there is one sentence about the app and the
// primary button «Lag ditt første emne».
// After a subject is deleted she lands here, and the h1 gets focus (#75).
export function HomePage() {
  const subjects = useQuery({ queryKey: SUBJECTS_QUERY_KEY, queryFn: fetchSubjects });
  // The counts N and M (story 5.3) and «øvd» per lecture for the cards (5.4).
  // Invalidated when a session is saved, so the page shows the new status
  // without a reload.
  const overview = useQuery({ queryKey: OVERVIEW_QUERY_KEY, queryFn: fetchOverview });
  // The cards' counts: each subject's file counts, under the same query key as
  // the lecture table on 03 (refetched each time the page is shown).
  const fileCounts = useQueries({
    queries: (subjects.data ?? []).map((subject) => ({
      queryKey: fileCountsQueryKey(subject.id),
      queryFn: () => fetchFileCounts(subject.id),
    })),
  });
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

      {subjects.data && hasSubjects ? (
        <SubjectCards
          subjects={subjects.data}
          overview={overview.data}
          overviewError={overview.isError}
          fileCounts={fileCounts.map((query) => ({ data: query.data, isError: query.isError }))}
        />
      ) : null}

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
// not one more `li` in the page: `main li` is the subject cards.
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

// The subject cards in a grid (DESIGN.md "Layout", mockup 02): a `ul` with one
// `li` per card in the subject list's order, card-gap between them. Three
// columns when the content is at least 768 px wide, two from 576 px, otherwise
// one (a container query on the list's own width).
function SubjectCards({
  subjects,
  overview,
  overviewError,
  fileCounts,
}: {
  subjects: Subject[];
  overview: Overview | undefined;
  overviewError: boolean;
  fileCounts: { data: SubjectFileCounts | undefined; isError: boolean }[];
}) {
  return (
    <div className="@container mt-6">
      <ul className="grid grid-cols-1 gap-card-gap @min-[576px]:grid-cols-2 @min-[768px]:grid-cols-3">
        {subjects.map((subject, index) => {
          const counts = fileCounts[index];
          return (
            <li key={subject.id}>
              <SubjectCard
                subject={subject}
                lectures={overview?.subjects.find((item) => item.id === subject.id)?.lectures}
                fileCounts={counts?.data}
                error={overviewError || (counts?.isError ?? false)}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
