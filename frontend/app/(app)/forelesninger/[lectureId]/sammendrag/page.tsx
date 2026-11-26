import { SummaryPage } from "@/modules/content/pages/summary-page";

// The title («Sammendrag – <lecture> – Studiekamerat») is set by the page once the lecture is loaded.
export default async function Page({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  return <SummaryPage lectureId={lectureId} />;
}
