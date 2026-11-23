"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { iconProps } from "@/components/icon";
import { Card } from "@/components/ui/card";
import { formatDayMonth } from "@/lib/dates";
import { examCountdownText, practicedText } from "@/lib/exam";
import { FALLBACK_MESSAGE } from "@/lib/messages";
import { subjectColorVar } from "@/lib/subject-colors";
import { OVERVIEW_QUERY_KEY, fetchOverview } from "@/modules/practice/api";
import type { OverviewSubject } from "@/modules/practice/types";

import { lectureCountLabel } from "../format";
import { monthLabels, thinLabels, timelineLayout, type TimelineRow, type TimelineStation } from "../timeline";

// The semester line (`semester-timeline`, story 5.5, FR-57, SK-22, UX-DR11, E4,
// E6, mockups 02-04): a white card with the h2 «Semesterlinje», the legend, and
// one row per subject with its name, lecture count and «Eksamen 04.12 · om 3
// uker» on the left and the line on the right. The line is solid from the first
// lecture to today and dashed («Tid igjen») to the exam; the stations are the
// lectures, filled when the overview says «øvd». «I dag» is a pill with a pin.
//
// Variants: `all` (02, every subject in the list's order), `subject` (03, one
// subject with week number and date under each station) and `lecture` (04, the
// lecture's subject with a ring and «Du er her» at its station).
//
// Built from GET /api/overview (the same query key that is invalidated after
// sessions and changes), so new status shows without a reload. The graphic is
// hidden from screen readers; a list with one sentence per subject stands in
// its place. Nothing on the line takes keyboard focus.

type Props =
  | { variant: "all"; subjectIds: string[] }
  | { variant: "subject"; subjectId: string }
  | { variant: "lecture"; subjectId: string; currentLectureId: string };

// The track has 40 px on each side so pills and labels at the edges fit.
const TRACK_INSET = "mx-[40px]";
// The line's height inside a row, in px.
const LINE_Y = 20;
// Labels under the stations on 03 (week number, date).
const WEEK_Y = 44;
const DATE_Y = 60;
// The smallest gap between two labels under the stations, in px.
const LABEL_GAP_PX = 40;

export function SemesterTimeline(props: Props) {
  const overview = useQuery({ queryKey: OVERVIEW_QUERY_KEY, queryFn: fetchOverview });
  const headingId = useId();

  const subjects = overview.data ? pickSubjects(overview.data.subjects, props) : undefined;
  // A loaded overview without the subject (03/04): no card at all.
  if (subjects && subjects.length === 0) return null;

  return (
    <Card aria-labelledby={headingId} role="region" className="p-4">
      <div>
        {/* The heading stands outside the hidden graphic, the legend floats next to it. */}
        <h2 id={headingId} className="float-left mr-4 text-label">
          Semesterlinje
        </h2>
        {subjects ? (
          <TimelineBody subjects={subjects} props={props} />
        ) : overview.isError ? (
          <p role="alert" className="clear-both flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{FALLBACK_MESSAGE}</span>
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function pickSubjects(all: OverviewSubject[], props: Props): OverviewSubject[] {
  if (props.variant === "all") {
    return props.subjectIds
      .map((id) => all.find((subject) => subject.id === id))
      .filter((subject): subject is OverviewSubject => subject !== undefined);
  }
  return all.filter((subject) => subject.id === props.subjectId);
}

// The track's width in px, measured with ResizeObserver; undefined until it
// has been measured (and always in jsdom), so every label is shown.
function useTrackWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | undefined>(undefined);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWidth(element.getBoundingClientRect().width || undefined));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function percent(x: number): string {
  return `${(x * 100).toFixed(3)}%`;
}

function TimelineBody({ subjects, props }: { subjects: OverviewSubject[]; props: Props }) {
  const today = new Date();
  const layout = timelineLayout(subjects, today);
  const [trackRef, trackWidth] = useTrackWidth();
  const months = monthLabels(layout.months, trackWidth);
  const todayLabel = `I dag ${formatDayMonth(localIso(today))}`;
  const currentLectureId = props.variant === "lecture" ? props.currentLectureId : null;

  return (
    <>
      <div aria-hidden="true">
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1 pt-[2px] text-caption text-ink-muted">
          <LegendItem symbol={<circle cx="7" cy="7" r="5" fill="var(--color-ink)" />}>Øvd</LegendItem>
          <LegendItem
            symbol={<circle cx="7" cy="7" r="4.5" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="2" />}
          >
            Ikke øvd ennå
          </LegendItem>
          <LegendItem symbol={<rect x="1" y="1" width="12" height="12" rx="2.5" fill="var(--color-ink)" />}>
            Eksamen
          </LegendItem>
          <LegendItem
            width={24}
            symbol={
              <line
                x1="3"
                x2="21"
                y1="7"
                y2="7"
                stroke="var(--color-ink)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="0.5 6"
              />
            }
          >
            Tid igjen
          </LegendItem>
        </div>

        {/* A container query on the rows' own width (not on the floated heading's
            neighbour, which must stay a plain block so the legend flows beside it). */}
        <div className="@container clear-both mt-3">
          {/* The month overlines. */}
          <TrackRow>
            <div ref={trackRef} className="relative h-[24px]">
              {layout.months.map((month, index) => (
                <span
                  key={`${month.long}-${index}`}
                  className="absolute top-0 pl-1 text-overline whitespace-nowrap text-ink-muted"
                  style={{ left: percent(month.start) }}
                >
                  {months[index]}
                </span>
              ))}
              <Gridlines starts={layout.months.map((month) => month.start)} />
            </div>
          </TrackRow>

          {/* «I dag 10.11» with the pin down through every row. */}
          <TrackRow>
            <div className="relative h-[28px]">
              <Gridlines starts={layout.months.map((month) => month.start)} />
              <span
                className="absolute top-0 -translate-x-1/2 rounded-full bg-brand px-2 text-overline whitespace-nowrap text-on-brand"
                style={{ left: percent(layout.todayX) }}
              >
                {todayLabel}
              </span>
              <span
                className="absolute top-[18px] bottom-0 w-[1.5px] -translate-x-1/2 bg-brand"
                style={{ left: percent(layout.todayX) }}
              />
            </div>
          </TrackRow>

          {subjects.map((subject, index) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              row={layout.rows[index]}
              monthStarts={layout.months.map((month) => month.start)}
              todayX={layout.todayX}
              today={today}
              showLabels={props.variant === "subject"}
              currentLectureId={currentLectureId}
              trackWidth={trackWidth}
            />
          ))}
        </div>
      </div>

      {/* The text version for screen readers: one sentence per subject. */}
      <ul className="sr-only">
        {subjects.map((subject) => (
          <li key={subject.id}>
            {`${subject.name}: ${practicedText(subject.lectures)}. ${examCountdownText(subject.exam_date, today, {
              weekday: true,
            })}.`}
          </li>
        ))}
      </ul>
    </>
  );
}

// "yyyy-mm-dd" of the student's local date.
function localIso(today: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function LegendItem({ symbol, children, width = 14 }: { symbol: ReactNode; children: ReactNode; width?: number }) {
  return (
    <span className="flex items-center gap-1 whitespace-nowrap">
      <svg width={width} height="14" className="shrink-0" focusable="false">
        {symbol}
      </svg>
      {children}
    </span>
  );
}

// A row with the track on the right; when the content is at least 720 px wide
// the left column (200 px) stands next to it, otherwise the row is only the track.
function TrackRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <div className="hidden w-[200px] shrink-0 @min-[720px]:block" />
      <div className={`min-w-0 flex-1 ${TRACK_INSET}`}>{children}</div>
    </div>
  );
}

// The vertical month lines (gridline), drawn by every row in its full height.
function Gridlines({ starts }: { starts: number[] }) {
  return (
    <>
      {[...starts, 1].map((start, index) => (
        <span key={index} className="absolute top-0 bottom-0 w-px bg-gridline" style={{ left: percent(start) }} />
      ))}
    </>
  );
}

function SubjectRow({
  subject,
  row,
  monthStarts,
  todayX,
  today,
  showLabels,
  currentLectureId,
  trackWidth,
}: {
  subject: OverviewSubject;
  row: TimelineRow;
  monthStarts: number[];
  todayX: number;
  today: Date;
  showLabels: boolean;
  currentLectureId: string | null;
  trackWidth: number | undefined;
}) {
  const color = subjectColorVar(subject.color_index);
  const current = currentLectureId
    ? row.stations.find((station) => station.lectureId === currentLectureId)
    : undefined;
  const height = showLabels ? 72 : 40;
  const shown = showLabels ? thinLabels(row.stations.map((station) => station.x), trackWidth, LABEL_GAP_PX, [row.examX]) : [];
  const lectureCount =
    subject.lectures.length === 0 ? "Ingen forelesninger ennå" : lectureCountLabel(subject.lectures.length);

  return (
    <div className="flex flex-col @min-[720px]:flex-row">
      <div className="pt-2 pb-1 @min-[720px]:w-[200px] @min-[720px]:shrink-0 @min-[720px]:pr-3">
        <p className="text-item-title break-words text-ink">{subject.name}</p>
        <p className="text-meta text-ink-muted">{lectureCount}</p>
        <p className="text-meta text-ink-muted">{examCountdownText(subject.exam_date, today, { separator: " · " })}</p>
      </div>
      {/* The track stretches to the row's height (next to the left text), and the
          month lines and the pin go through all of it, so they look unbroken
          from row to row. */}
      <div className={`relative min-w-0 flex-1 ${TRACK_INSET}`}>
        <Gridlines starts={monthStarts} />
        <span
          className="absolute top-0 bottom-0 w-[1.5px] -translate-x-1/2 bg-brand"
          style={{ left: percent(todayX) }}
        />
        {/* 04: «Du er her» in its own band right above this subject's line, so it
            never covers «I dag» and its pin reaches the ring also when the
            left text stands above the line. */}
        {current ? (
          <div className="relative h-[28px]">
            <span
              className="absolute top-0 -translate-x-1/2 rounded-full bg-brand px-2 text-overline whitespace-nowrap text-on-brand"
              style={{ left: percent(current.x) }}
            >
              Du er her
            </span>
            <span
              className="absolute top-[18px] bottom-0 w-[1.5px] -translate-x-1/2 bg-brand"
              style={{ left: percent(current.x) }}
            />
          </div>
        ) : null}
        <svg
          width="100%"
          height={height}
          className="relative block overflow-visible"
          focusable="false"
          data-subject-line={subject.id}
        >
          {row.solid ? (
            <line
              data-part="solid"
              x1={percent(row.solid[0])}
              x2={percent(row.solid[1])}
              y1={LINE_Y}
              y2={LINE_Y}
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
          ) : null}
          {row.dashed ? (
            <line
              data-part="dashed"
              x1={percent(row.dashed[0])}
              x2={percent(row.dashed[1])}
              y1={LINE_Y}
              y2={LINE_Y}
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="0.5 7"
            />
          ) : null}
          {row.stations.map((station, index) => (
            <Station
              key={station.lectureId}
              station={station}
              color={color}
              current={station.lectureId === currentLectureId}
              label={showLabels && shown[index]}
            />
          ))}
          <g data-part="exam">
            <rect
              x={percent(row.examX)}
              y={LINE_Y}
              width="14"
              height="14"
              rx="2.5"
              transform="translate(-7 -7)"
              fill="var(--color-ink)"
            />
            <rect
              x={percent(row.examX)}
              y={LINE_Y}
              width="5"
              height="5"
              rx="1"
              transform="translate(-2.5 -2.5)"
              fill="var(--color-surface)"
            />
          </g>
          {showLabels ? (
            <g>
              <text
                x={percent(row.examX)}
                y={WEEK_Y}
                textAnchor="middle"
                className="fill-ink text-caption font-semibold"
              >
                Eksamen
              </text>
              <text x={percent(row.examX)} y={DATE_Y} textAnchor="middle" className="fill-ink-muted text-caption">
                {formatDayMonth(subject.exam_date)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

function Station({
  station,
  color,
  current,
  label,
}: {
  station: TimelineStation;
  color: string;
  current: boolean;
  label: boolean;
}) {
  const x = percent(station.x);
  return (
    <g data-station={station.lectureId} data-practiced={station.practiced ? "true" : "false"}>
      {current ? (
        <>
          <line x1={x} x2={x} y1="0" y2={LINE_Y - 10} stroke="var(--color-brand)" strokeWidth="1.5" />
          <circle data-part="current" cx={x} cy={LINE_Y} r="10" fill="none" stroke="var(--color-brand)" strokeWidth="2" />
        </>
      ) : null}
      <circle
        cx={x}
        cy={LINE_Y}
        r="6"
        fill={station.practiced ? color : "var(--color-surface)"}
        stroke={color}
        strokeWidth="2.5"
      />
      {label ? (
        <>
          <text x={x} y={WEEK_Y} textAnchor="middle" className="fill-ink text-caption font-semibold">
            {station.week}
          </text>
          <text x={x} y={DATE_Y} textAnchor="middle" className="fill-ink-muted text-caption">
            {station.dayMonth}
          </text>
        </>
      ) : null}
    </g>
  );
}
