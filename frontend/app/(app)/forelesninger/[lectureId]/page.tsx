import { LecturePage } from "@/modules/subjects/pages/lecture-page";

// The title («<name> – Studiekamerat») is set by the page once the lecture is loaded.
export default async function Page({ params }: { params: Promise<{ lectureId: string }> }) {
  const { lectureId } = await params;
  return <LecturePage lectureId={lectureId} />;
}
