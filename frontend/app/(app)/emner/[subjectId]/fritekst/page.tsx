import { FreetextSessionPage } from "@/modules/practice/pages/freetext-session-page";

// Free-text over the whole subject (story 8.3). The title («Fritekst –
// <subject> – Studiekamerat») is set by the page once the subject is loaded.
export default async function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <FreetextSessionPage subjectId={subjectId} />;
}
