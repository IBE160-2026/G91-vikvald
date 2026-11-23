"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { OVERVIEW_QUERY_KEY } from "@/modules/practice/api";

import {
  SUBJECTS_QUERY_KEY,
  createLecture,
  lectureQueryKey,
  lecturesQueryKey,
  updateLecture,
} from "../api";
import { formatDate, todayNorwegian } from "../format";
import type { Lecture } from "../types";
import { NameDateDialog, type NameDateValues } from "./name-date-dialog";

// The three lecture forms, on the shared name/date dialog:
// - "create": «Ny forelesning» with Navn and Dato (today's date filled in),
//   «Opprett forelesning», then /forelesninger/{id}.
// - "rename": «Nytt navn» with today's name, «Lagre».
// - "date": «Endre dato» with the lecture's date, «Lagre».
// Afterwards the lecture table, the sidebar, the count and the front page are
// refreshed without a reload (the queries are invalidated).
export type LectureFormMode = "create" | "rename" | "date";

const TITLES: Record<LectureFormMode, string> = {
  create: "Ny forelesning",
  rename: "Nytt navn",
  date: "Endre dato",
};

const PRIMARY_LABELS: Record<LectureFormMode, string> = {
  create: "Opprett forelesning",
  rename: "Lagre",
  date: "Lagre",
};

type Props = {
  mode: LectureFormMode;
  open: boolean;
  onClose: () => void;
  // The subject the new lecture goes into (create).
  subjectId?: string;
  // The lecture to change (rename and date).
  lecture?: Lecture;
};

export function LectureFormDialog({ mode, open, onClose, subjectId, lecture }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function save(values: NameDateValues) {
    if (mode === "create") {
      const created = await createLecture(subjectId!, { name: values.name!, date: values.date! });
      queryClient.setQueryData(lectureQueryKey(created.id), created);
      // The subject list (counts on the front page and in the sidebar), the
      // subject and its lecture list all start with SUBJECTS_QUERY_KEY.
      void queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY });
      // The overview too: the exam line counts its lectures (story 5.3).
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      // The form stays blocked while the page navigates away.
      router.push(`/forelesninger/${created.id}`);
      return;
    }
    const updated = await updateLecture(lecture!.id, mode === "rename" ? { name: values.name } : { date: values.date });
    queryClient.setQueryData(lectureQueryKey(updated.id), updated);
    // A new date can move the lecture in the list; the backend decides the order.
    void queryClient.invalidateQueries({ queryKey: lecturesQueryKey(updated.subject_id) });
    // The semester line (story 5.5) places the stations by the overview's dates.
    void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
    onClose();
  }

  return (
    <NameDateDialog
      open={open}
      onClose={onClose}
      title={TITLES[mode]}
      primaryLabel={PRIMARY_LABELS[mode]}
      showName={mode !== "date"}
      dateLabel={mode === "rename" ? undefined : "Dato"}
      invalidDateCode="INVALID_DATE"
      initialName={mode === "rename" && lecture ? lecture.name : ""}
      initialDate={mode === "create" ? todayNorwegian() : mode === "date" && lecture ? formatDate(lecture.date) : ""}
      onSubmit={save}
    />
  );
}
