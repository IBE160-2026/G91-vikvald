import { FreetextSessionPage } from "@/modules/practice/pages/freetext-session-page";

// The title («Fritekst – <lecture> – Studiekamerat») is set by the page once the lecture is loaded.
export default async function Page({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  return <FreetextSessionPage lectureId={lectureId} />;
}
