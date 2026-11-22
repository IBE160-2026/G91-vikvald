import { QuizSessionPage } from "@/modules/practice/pages/quiz-session-page";

// The title («Quiz – <lecture> – Studiekamerat») is set by the page once the lecture is loaded.
export default async function Page({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  return <QuizSessionPage lectureId={lectureId} />;
}
