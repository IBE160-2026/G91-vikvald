import { SubjectPage } from "@/modules/subjects/pages/subject-page";

// The title («<name> – Studiekamerat») is set by the page once the subject is loaded.
export default async function Page({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  return <SubjectPage subjectId={subjectId} />;
}
