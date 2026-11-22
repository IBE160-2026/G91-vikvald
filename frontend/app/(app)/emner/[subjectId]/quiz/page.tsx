import { QuizSessionPage } from "@/modules/practice/pages/quiz-session-page";

// The quiz over the whole subject (story 4.4). The title («Quiz – <subject> –
// Studiekamerat») is set by the page once the subject is loaded.
export default async function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <QuizSessionPage subjectId={subjectId} />;
}
