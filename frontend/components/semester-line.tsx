// The grey, simplified semester line on the login and register pages (mockup 01).
// It is only a picture of what the app does, so screen readers skip it.

const MONTHS = [
  { label: "AUG", x: 8 },
  { label: "SEP", x: 116.6, gridline: 108.6 },
  { label: "OKT", x: 270.9, gridline: 262.9 },
  { label: "NOV", x: 430.3, gridline: 422.3 },
  { label: "DES", x: 584.6, gridline: 576.6 },
];
const PRACTISED = [52, 88, 124, 160];
const NOT_PRACTISED = [196, 268, 340, 412];
const LINE_Y = 44;

export function SemesterLine({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 616 64"
      width="616"
      height="64"
      aria-hidden="true"
      focusable="false"
      className={["h-auto max-w-full", className].filter(Boolean).join(" ")}
    >
      {MONTHS.map((month) => (
        <g key={month.label}>
          {month.gridline !== undefined ? (
            <line x1={month.gridline} y1="2" x2={month.gridline} y2="60" strokeWidth="1" className="stroke-gridline" />
          ) : null}
          <text x={month.x} y="16" fontSize="12" fontWeight="600" letterSpacing="0.8" className="fill-ink-muted">
            {month.label}
          </text>
        </g>
      ))}
      {/* Solid up to today, dotted up to the exam. */}
      <line x1="52" y1={LINE_Y} x2="468.6" y2={LINE_Y} strokeWidth="2.5" strokeLinecap="round" className="stroke-border-control" />
      <line
        x1="474.6"
        y1={LINE_Y}
        x2="582"
        y2={LINE_Y}
        strokeWidth="2.5"
        strokeDasharray="0.5 7"
        strokeLinecap="round"
        className="stroke-border-control"
      />
      {PRACTISED.map((cx) => (
        <circle key={cx} cx={cx} cy={LINE_Y} r="4.5" strokeWidth="2.5" className="fill-border-control stroke-border-control" />
      ))}
      {NOT_PRACTISED.map((cx) => (
        <circle key={cx} cx={cx} cy={LINE_Y} r="4.5" strokeWidth="2.5" className="fill-paper stroke-border-control" />
      ))}
      {/* The exam: a square. */}
      <rect x="586.5" y="38.5" width="11" height="11" rx="2" className="fill-border-control" />
      <rect x="590" y="42" width="4" height="4" rx="1" className="fill-paper" />
    </svg>
  );
}
