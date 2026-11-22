import { ChevronRight, CircleAlert } from "lucide-react";
import Link from "next/link";

import { iconProps } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { practicedText } from "@/lib/exam";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { cn } from "@/lib/utils";
import type { SubjectFileCounts } from "@/modules/files/types";
import type { OverviewLecture } from "@/modules/practice/types";

import { contentCountText, nextStep, subjectContentCounts } from "../next-step";
import type { Subject } from "../types";
import { SubjectDot } from "./subject-dot";

type Props = {
  subject: Subject;
  // The subject's lectures from GET /api/overview (in date order, with «øvd»
  // worked out by the server). Undefined until loaded.
  lectures: OverviewLecture[] | undefined;
  // GET /api/subjects/{id}/file-counts. Undefined until loaded.
  fileCounts: SubjectFileCounts | undefined;
  // The overview or the file counts failed.
  error: boolean;
};

// subject-card (DESIGN.md "Oversikt", mockup 02, story 5.4, FR-58, UX-DR12): a
// white card with the subject dot and the name as the card's heading (h2), the
// text button «Åpne ›» to 03 (named «Åpne Markedsføring»), the counts line
// («120 kort · 64 quizspørsmål»), a hairline, NESTE Å ØVE PÅ or NESTE STEG
// (an h3 for screen readers, like SISTE ØKT) with the lecture, the reason and
// one button, and at the bottom one bar per lecture (hidden from screen
// readers) with «4 av 8 forelesninger øvd».
//
// Until the overview and the file counts have loaded, only the dot, the name
// and «Åpne ›» are shown (never guessed numbers). If one of them failed, the
// fallback text stands in role="alert" instead of the rest.
export function SubjectCard({ subject, lectures, fileCounts, error }: Props) {
  return (
    <Card data-slot="subject-card" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <h2 className="flex min-w-0 items-center gap-2 pt-2 text-item-title text-ink">
          <SubjectDot colorIndex={subject.color_index} />
          <span className="min-w-0 break-words">{subject.name}</span>
        </h2>
        <Button asChild variant="text" className="-mr-2 shrink-0">
          {/* The visible text «Åpne» starts the accessible name (WCAG 2.5.3). */}
          <Link href={`/emner/${subject.id}`} aria-label={`Åpne ${subject.name}`}>
            Åpne
            <ChevronRight {...iconProps} />
          </Link>
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{FALLBACK_MESSAGE}</span>
        </p>
      ) : lectures && fileCounts ? (
        <CardBody subjectId={subject.id} lectures={lectures} fileCounts={fileCounts} />
      ) : null}
    </Card>
  );
}

function CardBody({
  subjectId,
  lectures,
  fileCounts,
}: {
  subjectId: string;
  lectures: OverviewLecture[];
  fileCounts: SubjectFileCounts;
}) {
  const step = nextStep(subjectId, lectures, fileCounts);
  const overline = step.kind === "practice" ? "NESTE Å ØVE PÅ" : "NESTE STEG";
  return (
    <>
      <p className="mt-1 text-body-sm text-ink-muted">{contentCountText(subjectContentCounts(fileCounts))}</p>
      <hr className="my-4 border-divider" />
      <div data-slot="next-step" className="flex flex-col items-start">
        <h3 className="sr-only">{step.kind === "practice" ? "Neste å øve på" : "Neste steg"}</h3>
        <p aria-hidden="true" className="text-overline text-ink-muted">
          {overline}
        </p>
        {step.lecture ? <p className="mt-2 text-label text-ink">{step.lecture}</p> : null}
        <p className={cn("text-body-sm text-ink-muted", step.lecture ? "mt-1" : "mt-2")}>{step.reason}</p>
        <Button asChild variant={step.kind === "practice" ? "primary" : "outline"} className="mt-3">
          <Link href={step.action.href}>{step.action.label}</Link>
        </Button>
      </div>
      {lectures.length > 0 ? (
        <div data-slot="progress" className="mt-auto pt-4">
          <div aria-hidden="true" className="flex gap-1">
            {lectures.map((lecture) => (
              <span
                key={lecture.id}
                data-practiced={lecture.practiced}
                className={cn("h-1 min-w-0 flex-1 rounded-xs", lecture.practiced ? "bg-brand" : "bg-progress-track")}
              />
            ))}
          </div>
          <p className="mt-2 text-meta text-ink-muted">{practicedText(lectures)}</p>
        </div>
      ) : null}
    </>
  );
}
