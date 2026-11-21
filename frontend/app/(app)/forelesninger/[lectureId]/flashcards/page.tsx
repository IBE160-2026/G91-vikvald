import { FlashcardSessionPage } from "@/modules/practice/pages/flashcard-session-page";

// The title («Flashcards – <lecture> – Studiekamerat») is set by the page once the lecture is loaded.
export default async function Page({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  return <FlashcardSessionPage lectureId={lectureId} />;
}
