"use client";

import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { ApiError } from "@/lib/api";
import { messageFor } from "@/lib/messages";

import {
  fieldForApiError,
  NAME_MAX_LENGTH,
  nameErrorCode,
  parseNorwegianDate,
  type FormField,
  type FormFieldErrors,
} from "../validation";

// The shared form for subjects and lectures, built on the shared Dialog: a
// «Navn» field and/or a date field (text as dd.mm.åååå, the same in every
// browser). Subjects and lectures only differ in their texts, the date message
// and the call, which the wrappers (subject-form-dialog, lecture-form-dialog)
// pass in.
//
// Enter in a field sends the form. Errors are shown under the field and focus
// moves to the first field with an error. An error from the backend that is not
// about a field is shown as a general message, and the dialog stays open.
export type NameDateValues = {
  // Trimmed. Only set when the name field is shown.
  name?: string;
  // ISO date, "2026-09-11". Only set when the date field is shown.
  date?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  primaryLabel: string;
  showName: boolean;
  // The label of the date field («Eksamensdato» or «Dato»); no label, no date field.
  dateLabel?: string;
  // The error code for a date that is not a date (INVALID_EXAM_DATE or INVALID_DATE).
  invalidDateCode: string;
  // The values the fields start with each time the dialog opens.
  initialName?: string;
  initialDate?: string;
  // Saves. Throws an ApiError when the backend says no. On success the caller
  // closes the dialog or navigates away; the form stays blocked until then.
  onSubmit: (values: NameDateValues) => Promise<unknown>;
};

export function NameDateDialog({
  open,
  onClose,
  title,
  primaryLabel,
  showName,
  dateLabel,
  invalidDateCode,
  initialName = "",
  initialDate = "",
  onSubmit,
}: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const showDate = dateLabel !== undefined;

  const [name, setName] = useState("");
  const [dateText, setDateText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [focusRequest, setFocusRequest] = useState<{ field: FormField } | null>(null);

  // Each time the dialog opens it starts from the given values and no errors
  // (state adjusted during render, React's pattern for a changed prop).
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(initialName);
      setDateText(initialDate);
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
      setFieldErrors({ [field]: field === "date" ? invalidDateCode : code });
      setFocusRequest({ field });
    } else {
      setFormError(messageFor(code));
    }
  }

  function submit() {
    if (submittingRef.current) return;
    setFormError(null);
    const errors: FormFieldErrors = {};
    const nameCode = showName ? nameErrorCode(name) : null;
    const dateCode = showDate && parseNorwegianDate(dateText) === null ? invalidDateCode : null;
    if (nameCode) errors.name = nameCode;
    if (dateCode) errors.date = dateCode;
    setFieldErrors(errors);
    if (nameCode || dateCode) {
      setFocusRequest({ field: nameCode ? "name" : "date" });
      return;
    }

    submittingRef.current = true;
    const values: NameDateValues = {};
    if (showName) values.name = name.trim();
    if (showDate) values.date = parseNorwegianDate(dateText)!;
    onSubmit(values).catch(showApiError);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  function errorText(field: FormField): string | undefined {
    const code = fieldErrors[field];
    return code ? messageFor(code) : undefined;
  }

  return (
    <Dialog open={open} title={title} onClose={onClose} primaryAction={{ label: primaryLabel, onClick: submit }}>
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
            label={dateLabel}
            name="date"
            autoComplete="off"
            placeholder="dd.mm.åååå"
            value={dateText}
            onChange={(event) => {
              setDateText(event.target.value);
              setFieldErrors((current) => ({ ...current, date: undefined }));
              setFormError(null);
            }}
            onKeyDown={submitOnEnter}
            error={errorText("date")}
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
