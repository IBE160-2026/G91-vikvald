import { FlashcardSessionPage } from "@/modules/practice/pages/flashcard-session-page";

// The session over the whole subject (story 3.6). The title («Flashcards –
// <subject> – Studiekamerat») is set by the page once the subject is loaded.
export default async function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <FlashcardSessionPage subjectId={subjectId} />;
}
