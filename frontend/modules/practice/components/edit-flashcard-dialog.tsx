"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { forwardRef, useEffect, useId, useRef, useState, type TextareaHTMLAttributes } from "react";

import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE, messageFor } from "@/lib/messages";

import { updateFlashcard } from "../api";
import type { Flashcard } from "../types";

type Field = "front" | "back";

// The error code for each field when it is empty (the same codes the API gives).
const REQUIRED: Record<Field, string> = {
  front: "FLASHCARD_FRONT_REQUIRED",
  back: "FLASHCARD_BACK_REQUIRED",
};

type Props = {
  open: boolean;
  card: Flashcard;
  onClose: () => void;
  // The saved card from the API (text trimmed at both ends). Called before onClose.
  onSaved: (card: Flashcard) => void;
};

// «Rediger kortet» (story 3.7, FR-27): the shared Dialog with two text areas,
// «Spørsmål» and «Svar», filled in with the card's text each time it opens.
// Focus starts in «Spørsmål». «Avbryt», the cross and Esc close it without
// a change. «Lagre» checks for empty fields first (only blanks count as
// empty): the field gets a red border and «Skriv inn spørsmålet.» or «Skriv
// inn svaret.» under it, linked with aria-describedby and aria-invalid, and
// focus goes to the first field with an error. The same codes from the API
// are shown on the same field. Any other error (also 404) shows the fallback
// text in role="alert", and the dialog stays open. Saved: onSaved with the
// card, then the dialog closes and focus goes back to «Rediger».
export function EditFlashcardDialog({ open, card, onClose, onSaved }: Props) {
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const backRef = useRef<HTMLTextAreaElement>(null);
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ field: Field } | null>(null);

  // Each time the dialog opens it starts from the card's text and no errors.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFront(card.front);
      setBack(card.back);
      setErrors({});
      setFormError(null);
    }
  }

  useEffect(() => {
    if (!focusRequest) return;
    (focusRequest.field === "front" ? frontRef : backRef).current?.focus();
  }, [focusRequest]);

  // Through useMutation, so a lost login (401) goes to the app's one handler.
  const saving = useMutation({
    mutationFn: (input: { front: string; back: string }) => updateFlashcard(card.id, input),
    onSuccess: (saved) => {
      onSaved(saved);
      onClose();
    },
    onError: (error) => {
      if (isUnauthenticated(error)) return;
      const field = (Object.keys(REQUIRED) as Field[]).find(
        (key) => error instanceof ApiError && error.code === REQUIRED[key],
      );
      if (field) {
        setErrors({ [field]: messageFor(REQUIRED[field]) });
        setFocusRequest({ field });
      } else {
        setFormError(FALLBACK_MESSAGE);
      }
    },
  });
  const busy = saving.isPending;

  function save() {
    if (busy) return;
    setFormError(null);
    const found: Partial<Record<Field, string>> = {};
    if (!front.trim()) found.front = messageFor(REQUIRED.front);
    if (!back.trim()) found.back = messageFor(REQUIRED.back);
    setErrors(found);
    if (found.front || found.back) {
      setFocusRequest({ field: found.front ? "front" : "back" });
      return;
    }
    saving.mutate({ front, back });
  }

  return (
    <Dialog
      open={open}
      title="Rediger kortet"
      width={640}
      onClose={busy ? () => {} : onClose}
      cancelDisabled={busy}
      primaryAction={{ label: "Lagre", onClick: save, disabled: busy }}
    >
      <div className="flex flex-col gap-4">
        <TextAreaField
          ref={frontRef}
          label="Spørsmål"
          name="front"
          value={front}
          error={errors.front}
          onChange={(event) => setFront(event.target.value)}
        />
        <TextAreaField
          ref={backRef}
          label="Svar"
          name="back"
          value={back}
          error={errors.back}
          onChange={(event) => setBack(event.target.value)}
        />
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

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & {
  label: string;
  error?: string;
};

// Like components/text-field.tsx, for longer text: visible label above, the
// text area, and with an error a red border and the message under it, linked
// with aria-describedby and aria-invalid.
const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, ...props },
  ref,
) {
  const id = useId();
  const errorId = `${id}-error`;
  const hasError = Boolean(error);
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        {...props}
        ref={ref}
        id={id}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
      />
      {hasError ? (
        <p id={errorId} className="flex items-start gap-2 text-meta text-danger">
          <CircleAlert {...iconProps} className="mt-[3px] shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
});
