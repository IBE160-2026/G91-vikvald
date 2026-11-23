"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { OVERVIEW_QUERY_KEY } from "@/modules/practice/api";

import { SUBJECTS_QUERY_KEY, createSubject, subjectQueryKey, updateSubject } from "../api";
import { formatDate } from "../format";
import type { Subject } from "../types";
import { NameDateDialog, type NameDateValues } from "./name-date-dialog";

// The three subject forms, on the shared name/date dialog:
// - "create": «Nytt emne» with Navn and Eksamensdato, «Opprett emne», then /emner/{id}.
// - "rename": «Nytt navn» with today's name, «Lagre».
// - "examDate": «Endre eksamensdato» with today's date, «Lagre».
export type SubjectFormMode = "create" | "rename" | "examDate";

const TITLES: Record<SubjectFormMode, string> = {
  create: "Nytt emne",
  rename: "Nytt navn",
  examDate: "Endre eksamensdato",
};

const PRIMARY_LABELS: Record<SubjectFormMode, string> = {
  create: "Opprett emne",
  rename: "Lagre",
  examDate: "Lagre",
};

type Props = {
  mode: SubjectFormMode;
  open: boolean;
  onClose: () => void;
  // The subject to change (rename and examDate).
  subject?: Subject;
};

export function SubjectFormDialog({ mode, open, onClose, subject }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function save(values: NameDateValues) {
    if (mode === "create") {
      const created = await createSubject({ name: values.name!, exam_date: values.date! });
      queryClient.setQueryData(subjectQueryKey(created.id), created);
      void queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY, exact: true });
      // The overview too: the exam line counts its lectures (story 5.3).
      void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
      // The form stays blocked while the page navigates away.
      router.push(`/emner/${created.id}`);
      return;
    }
    const updated = await updateSubject(
      subject!.id,
      mode === "rename" ? { name: values.name } : { exam_date: values.date },
    );
    queryClient.setQueryData(subjectQueryKey(updated.id), updated);
    queryClient.setQueryData<Subject[]>(SUBJECTS_QUERY_KEY, (list) =>
      list?.map((item) => (item.id === updated.id ? updated : item)),
    );
    // The semester line (story 5.5) takes the name and exam date from the overview.
    void queryClient.invalidateQueries({ queryKey: OVERVIEW_QUERY_KEY });
    onClose();
  }

  return (
    <NameDateDialog
      open={open}
      onClose={onClose}
      title={TITLES[mode]}
      primaryLabel={PRIMARY_LABELS[mode]}
      showName={mode !== "examDate"}
      dateLabel={mode === "rename" ? undefined : "Eksamensdato"}
      invalidDateCode="INVALID_EXAM_DATE"
      initialName={mode === "rename" && subject ? subject.name : ""}
      initialDate={mode === "examDate" && subject ? formatDate(subject.exam_date) : ""}
      onSubmit={save}
    />
  );
}
