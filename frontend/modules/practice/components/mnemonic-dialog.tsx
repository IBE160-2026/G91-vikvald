"use client";

import { useMutation } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Dialog } from "@/components/dialog";
import { iconProps } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { ApiError, isUnauthenticated } from "@/lib/api";
import { FALLBACK_MESSAGE } from "@/lib/messages";

import { updateFlashcard } from "../api";
import type { Flashcard, ModelCard } from "../types";

// The dialog's own text for an empty mnemonic. The API answers the same case
// with FLASHCARD_BACK_REQUIRED (whose general text is about the answer).
export const MNEMONIC_REQUIRED = "Skriv inn en huskeregel.";
const EMPTY_CODE = "FLASHCARD_BACK_REQUIRED";

type Props = {
  open: boolean;
  card: ModelCard;
  onClose: () => void;
  // The saved card from the API (text trimmed at both ends). Called before onClose.
  onSaved: (card: Flashcard) => void;
};

// «Endre huskeregel» / «Legg til huskeregel» (story 7.2, FR-46, UX-DR21,
// UX-DR25): the shared Dialog with the text field «Huskeregel», filled in with
// the card's mnemonic (empty when it has none) each time it opens. Focus starts
// in the field, and the practice keys are off while the dialog is open, so «2»
// and Space type text. «Avbryt», the cross and Esc close it without a change,
// and focus goes back to the button that opened it. «Lagre» (or Enter in the
// field) with an empty or blank field saves nothing: red border, «Skriv inn en
// huskeregel.» under the field, and focus in the field; the same for the
// API's FLASHCARD_BACK_REQUIRED. Her text is never checked against the points'
// first letters (AR-4). Any other error shows the fallback text in
// role="alert", and the dialog stays open.
export function MnemonicDialog({ open, card, onClose, onSaved }: Props) {
  const fieldRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(card.mnemonic ?? "");
  const [error, setError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);

  // Each time the dialog opens it starts from the card's mnemonic and no errors.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setValue(card.mnemonic ?? "");
      setError(undefined);
      setFormError(null);
    }
  }

  useEffect(() => {
    if (focusRequest > 0) fieldRef.current?.focus();
  }, [focusRequest]);

  function showEmpty() {
    setError(MNEMONIC_REQUIRED);
    setFocusRequest((old) => old + 1);
  }

  // Through useMutation, so a lost login (401) goes to the app's one handler.
  const saving = useMutation({
    mutationFn: (mnemonic: string) => updateFlashcard(card.id, { mnemonic }),
    onSuccess: (saved) => {
      onSaved(saved);
      onClose();
    },
    onError: (failure) => {
      if (isUnauthenticated(failure)) return;
      if (failure instanceof ApiError && failure.code === EMPTY_CODE) showEmpty();
      else setFormError(FALLBACK_MESSAGE);
    },
  });
  const busy = saving.isPending;

  function save() {
    if (busy) return;
    setFormError(null);
    if (!value.trim()) {
      showEmpty();
      return;
    }
    saving.mutate(value);
  }

  function saveOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      save();
    }
  }

  return (
    <Dialog
      open={open}
      title={card.mnemonic ? "Endre huskeregel" : "Legg til huskeregel"}
      onClose={busy ? () => {} : onClose}
      cancelDisabled={busy}
      primaryAction={{ label: "Lagre", onClick: save, disabled: busy }}
    >
      <div className="flex flex-col gap-4">
        <TextField
          ref={fieldRef}
          label="Huskeregel"
          name="mnemonic"
          autoComplete="off"
          value={value}
          error={error}
          onChange={(event) => {
            setValue(event.target.value);
            setError(undefined);
            setFormError(null);
          }}
          onKeyDown={saveOnEnter}
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
