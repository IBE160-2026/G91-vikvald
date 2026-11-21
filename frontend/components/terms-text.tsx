"use client";

import { useAppConfig } from "@/lib/config";

// The terms text (FR-11, NFR-6, UX-DR23, mockup 05), word for word from
// epics.md. One shared component: the terms dialog shows it with a checkbox
// under it, and the account page (story 2.7) shows it without. The text is the
// same in demo and real mode; demo mode only adds «I demomodus sendes ingenting
// ut.» as its own paragraph under the points, since it tells about the mode and
// is not a term. The overlines are h3 headings for screen readers, the points a list.

const RESPONSIBILITY = [
  "Du er ansvarlig for materialet du laster opp.",
  "Last bare opp egne notater eller materiale du har rett til å bruke.",
  "Ikke last opp personopplysninger, for eksempel navn på medstudenter.",
];

const WHERE_SENT = [
  "Notatene sendes til språkmodellen hos Google, med behandling i EU, for å lage øvingsinnholdet.",
  "Google kan logge forespørslene en periode for å oppdage misbruk.",
];

function Section({ title, points }: { title: string; points: string[] }) {
  return (
    <section>
      <h3 className="text-overline text-ink-muted">{title}</h3>
      <ul className="mt-2 flex list-disc flex-col gap-2 pl-[18px] text-body text-ink marker:text-ink">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

export function TermsText() {
  const config = useAppConfig();
  return (
    <div data-slot="terms-text" className="flex flex-col gap-4">
      <Section title="DITT ANSVAR" points={RESPONSIBILITY} />
      <Section title="HVOR NOTATENE SENDES" points={WHERE_SENT} />
      {config.data?.demo_mode ? <p className="text-body text-ink">I demomodus sendes ingenting ut.</p> : null}
    </div>
  );
}
