"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { ApiError } from "@/lib/api";
import { messageFor } from "@/lib/messages";

import { SUBJECTS_QUERY_KEY, createSubject, subjectQueryKey, updateSubject } from "../api";
import { formatDate } from "../format";
import type { Subject, SubjectUpdateInput } from "../types";
import {
  examDateErrorCode,
  fieldForApiError,
  NAME_MAX_LENGTH,
  nameErrorCode,
  parseNorwegianDate,
  type SubjectField,
  type SubjectFieldErrors,
} from "../validation";

// One dialog for the three subject forms, built on the shared Dialog:
// - "create": «Nytt emne» with Navn and Eksamensdato, «Opprett emne», then /emner/{id}.
// - "rename": «Nytt navn» with today's name, «Lagre».
// - "examDate": «Endre eksamensdato» with today's date, «Lagre».
// The exam date is a text field for dd.mm.åååå (same in every browser). Enter in
// a field sends the form. Errors are shown under the field and focus moves to
// the first field with an error.
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
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const showName = mode !== "examDate";
  const showDate = mode !== "rename";

  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<SubjectFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [focusRequest, setFocusRequest] = useState<{ field: SubjectField } | null>(null);

  // Each time the dialog opens it starts from today's values and no errors
  // (state adjusted during render, React's pattern for a changed prop).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(mode === "rename" && subject ? subject.name : "");
      setExamDate(mode === "examDate" && subject ? formatDate(subject.exam_date) : "");
      setFieldErrors({});
      setFormError(null);
      submittingRef.current = false;
    }
  }

  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.field === "name" ? nameRef : dateRef).current?.focus();
  }, [focusRequest]);

  function showApiError(error: unknown) {
    submittingRef.current = false;
    const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
    const details = error instanceof ApiError ? error.details : {};
    const field = fieldForApiError(code, details);
    if (field) {
      setFieldErrors({ [field]: field === "examDate" ? "INVALID_EXAM_DATE" : code });
      setFocusRequest({ field });
    } else {
      setFormError(messageFor(code));
    }
  }

  const create = useMutation({
    mutationFn: createSubject,
    onSuccess: (created) => {
      queryClient.setQueryData(subjectQueryKey(created.id), created);
      void queryClient.invalidateQueries({ queryKey: SUBJECTS_QUERY_KEY, exact: true });
      // Stays blocked while the page navigates away.
      router.push(`/emner/${created.id}`);
    },
    onError: showApiError,
  });

  const update = useMutation({
    mutationFn: (input: SubjectUpdateInput) => updateSubject(subject!.id, input),
    onSuccess: (updated) => {
      submittingRef.current = false;
      queryClient.setQueryData(subjectQueryKey(updated.id), updated);
      queryClient.setQueryData<Subject[]>(SUBJECTS_QUERY_KEY, (list) =>
        list?.map((item) => (item.id === updated.id ? updated : item)),
      );
      onClose();
    },
    onError: showApiError,
  });

  function submit() {
    if (submittingRef.current) return;
    setFormError(null);
    const errors: SubjectFieldErrors = {};
    const nameCode = showName ? nameErrorCode(name) : null;
    const dateCode = showDate ? examDateErrorCode(examDate) : null;
    if (nameCode) errors.name = nameCode;
    if (dateCode) errors.examDate = dateCode;
    setFieldErrors(errors);
    if (nameCode || dateCode) {
      setFocusRequest({ field: nameCode ? "name" : "examDate" });
      return;
    }

    submittingRef.current = true;
    const isoDate = showDate ? parseNorwegianDate(examDate)! : undefined;
    if (mode === "create") {
      create.mutate({ name: name.trim(), exam_date: isoDate! });
    } else if (mode === "rename") {
      update.mutate({ name: name.trim() });
    } else {
      update.mutate({ exam_date: isoDate });
    }
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function errorText(field: SubjectField): string | undefined {
    const code = fieldErrors[field];
    return code ? messageFor(code) : undefined;
  }

  return (
    <Dialog
      open={open}
      title={TITLES[mode]}
      onClose={onClose}
      primaryAction={{ label: PRIMARY_LABELS[mode], onClick: submit }}
    >
      <div className="flex flex-col gap-4">
        {showName ? (
          <TextField
            ref={nameRef}
            label="Navn"
            name="name"
            autoComplete="off"
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setFieldErrors((current) => ({ ...current, name: undefined }));
              setFormError(null);
            }}
            onKeyDown={submitOnEnter}
            error={errorText("name")}
          />
        ) : null}
        {showDate ? (
          <TextField
            ref={dateRef}
            label="Eksamensdato"
            name="exam_date"
            autoComplete="off"
            placeholder="dd.mm.åååå"
            value={examDate}
            onChange={(event) => {
              setExamDate(event.target.value);
              setFieldErrors((current) => ({ ...current, examDate: undefined }));
              setFormError(null);
            }}
            onKeyDown={submitOnEnter}
            error={errorText("examDate")}
          />
        ) : null}
        {formError ? (
          <p role="alert" className="flex items-start gap-2 rounded-md bg-danger-tint p-3 text-meta text-danger">
            <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
            <span>{formError}</span>
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
