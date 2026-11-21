import { Spinner } from "@/components/ui/spinner";

// job-status (DESIGN.md "Forelesning", mockup 04): takes the place of a
// create-row's buttons while content is being made. A box on paper with a
// border-card edge, the spinner, «Lager flashcards …» and «Du kan bruke resten
// av appen imens.». The start and the end are read out by the row's own live
// region, not here (so nothing is announced twice).
export function JobStatus({ text }: { text: string }) {
  return (
    <div
      data-slot="job-status"
      className="flex items-center gap-3 rounded-md border border-border-card bg-paper px-3 py-2"
    >
      <Spinner />
      <div className="min-w-0">
        <p className="text-label text-ink">{text}</p>
        <p className="text-meta text-ink-muted">Du kan bruke resten av appen imens.</p>
      </div>
    </div>
  );
}
